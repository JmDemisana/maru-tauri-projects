use std::sync::atomic::{AtomicBool, AtomicU16, AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use windows_sys::Win32::Foundation::{POINT, RECT};
use windows_sys::Win32::UI::Input::KeyboardAndMouse::*;
use windows_sys::Win32::UI::WindowsAndMessaging::*;

static WIN_KEY_PRESSED: AtomicBool = AtomicBool::new(false);
static COMBO_INTERRUPTED: AtomicBool = AtomicBool::new(false);
static ACTIVE_WIN_VK: AtomicU16 = AtomicU16::new(0);
static LAST_TOGGLE_MS: AtomicU64 = AtomicU64::new(0);
static START_BUTTON_DOWN: AtomicBool = AtomicBool::new(false);

static mut HOOK_CALLBACK: Option<Box<dyn Fn() + Send + Sync + 'static>> = None;
static mut COMBO_CALLBACK: Option<Box<dyn Fn() + Send + Sync + 'static>> = None;

pub fn is_win_key_down() -> bool {
    WIN_KEY_PRESSED.load(Ordering::SeqCst)
}

fn current_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Force dismiss any native Windows Start menu surfaces without killing shell processes
pub fn dismiss_windows_native_start() {
    unsafe {
        // 1. Find native Windows Start Menu CoreWindow
        let core_class: Vec<u16> = "Windows.UI.Core.CoreWindow\0".encode_utf16().collect();
        let start_title: Vec<u16> = "Start\0".encode_utf16().collect();
        let hwnd = FindWindowW(core_class.as_ptr(), start_title.as_ptr());
        if !hwnd.is_null() {
            ShowWindow(hwnd, SW_HIDE);
        }

        // 2. If foreground window is specifically a native Start surface, hide it (NEVER send WM_CLOSE to avoid killing Quick Panel / AppActions!)
        let fg = GetForegroundWindow();
        if !fg.is_null() {
            let mut buf = [0u16; 64];
            let len = GetClassNameW(fg, buf.as_mut_ptr(), 64);
            if len > 0 {
                let cls = String::from_utf16_lossy(&buf[..len as usize]);
                if cls == "Windows.UI.Core.CoreWindow" {
                    let mut title_buf = [0u16; 64];
                    let title_len = GetWindowTextW(fg, title_buf.as_mut_ptr(), 64);
                    let title = String::from_utf16_lossy(&title_buf[..title_len as usize]);
                    if title == "Start" {
                        ShowWindow(fg, SW_HIDE);
                    }
                }
            }
        }
    }
}

/// Detects if cursor or foreground window is on the Windows Taskbar (Shell_TrayWnd / Shell_SecondaryTrayWnd)
pub fn is_taskbar_active_or_clicked() -> bool {
    unsafe {
        let mut pt: POINT = std::mem::zeroed();
        GetCursorPos(&mut pt);

        // 1. Check primary taskbar rect
        let tray_class: Vec<u16> = "Shell_TrayWnd\0".encode_utf16().collect();
        let tray_hwnd = FindWindowW(tray_class.as_ptr(), std::ptr::null());
        if !tray_hwnd.is_null() {
            let mut rect: RECT = std::mem::zeroed();
            GetWindowRect(tray_hwnd, &mut rect);
            if pt.x >= rect.left && pt.x <= rect.right && pt.y >= rect.top && pt.y <= rect.bottom {
                return true;
            }
        }

        // 2. Check secondary taskbars (multi-monitor)
        let sec_tray_class: Vec<u16> = "Shell_SecondaryTrayWnd\0".encode_utf16().collect();
        let sec_hwnd = FindWindowW(sec_tray_class.as_ptr(), std::ptr::null());
        if !sec_hwnd.is_null() {
            let mut rect: RECT = std::mem::zeroed();
            GetWindowRect(sec_hwnd, &mut rect);
            if pt.x >= rect.left && pt.x <= rect.right && pt.y >= rect.top && pt.y <= rect.bottom {
                return true;
            }
        }

        // 3. Check foreground window class name
        let fg = GetForegroundWindow();
        if !fg.is_null() {
            let mut buf = [0u16; 64];
            let len = GetClassNameW(fg, buf.as_mut_ptr(), 64);
            if len > 0 {
                let cls = String::from_utf16_lossy(&buf[..len as usize]);
                if cls == "Shell_TrayWnd" || cls == "Shell_SecondaryTrayWnd" {
                    return true;
                }
            }
        }

        false
    }
}

/// Detects if cursor coordinates are over the Windows Taskbar Start Button
fn is_point_on_start_button(pt: POINT) -> bool {
    unsafe {
        let tray_class: Vec<u16> = "Shell_TrayWnd\0".encode_utf16().collect();
        let tray_hwnd = FindWindowW(tray_class.as_ptr(), std::ptr::null());
        if tray_hwnd.is_null() {
            return false;
        }

        let mut rect: RECT = std::mem::zeroed();
        GetWindowRect(tray_hwnd, &mut rect);

        // Check if inside taskbar bounds
        if pt.x < rect.left || pt.x > rect.right || pt.y < rect.top || pt.y > rect.bottom {
            return false;
        }

        // On horizontal taskbar (bottom of screen), Start button is on left 0..58px
        (pt.x - rect.left) >= 0 && (pt.x - rect.left) <= 58
    }
}

/// Detects if current cursor position is specifically over the Windows Taskbar Start button
pub fn is_cursor_on_start_button() -> bool {
    unsafe {
        let mut pt: POINT = std::mem::zeroed();
        GetCursorPos(&mut pt);
        is_point_on_start_button(pt)
    }
}

unsafe extern "system" fn low_level_keyboard_proc(
    n_code: i32,
    w_param: usize,
    l_param: isize,
) -> isize {
    if n_code >= 0 {
        let kbd_struct = &*(l_param as *const KBDLLHOOKSTRUCT);

        // Ignore injected events (0x10 is LLKHF_INJECTED) to avoid recursive loops
        if (kbd_struct.flags & 0x10) != 0 {
            return CallNextHookEx(std::ptr::null_mut(), n_code, w_param, l_param);
        }

        let vk = kbd_struct.vkCode as u16;
        let is_win = vk == VK_LWIN || vk == VK_RWIN;
        let is_down = (w_param as u32) == WM_KEYDOWN || (w_param as u32) == WM_SYSKEYDOWN;
        let is_up = (w_param as u32) == WM_KEYUP || (w_param as u32) == WM_SYSKEYUP;

        if is_win {
            if is_down {
                // Track physical Win key press without breaking Windows system hotkeys (Win+A, Win+R, etc.)
                if !WIN_KEY_PRESSED.load(Ordering::SeqCst) {
                    WIN_KEY_PRESSED.store(true, Ordering::SeqCst);
                    COMBO_INTERRUPTED.store(false, Ordering::SeqCst);
                    ACTIVE_WIN_VK.store(vk, Ordering::SeqCst);
                }
                // Let Win keydown pass to OS so Windows registers MOD_WIN for Quick Panel (Win+A) and hotkeys
                return CallNextHookEx(std::ptr::null_mut(), n_code, w_param, l_param);
            } else if is_up {
                if WIN_KEY_PRESSED.swap(false, Ordering::SeqCst) {
                    let was_combo = COMBO_INTERRUPTED.swap(false, Ordering::SeqCst);
                    ACTIVE_WIN_VK.store(0, Ordering::SeqCst);

                    if was_combo {
                        // A combo was executed (e.g. Win+A for Quick Actions, Win+E, Win+R). Let it release normally.
                        return CallNextHookEx(std::ptr::null_mut(), n_code, w_param, l_param);
                    } else {
                        // Lone Win key released!
                        // Neutralize native Windows Start by sending a harmless dummy key before release
                        keybd_event(0xFF, 0, 0, 0);
                        keybd_event(0xFF, 0, KEYEVENTF_KEYUP, 0);

                        let now = current_millis();
                        let last = LAST_TOGGLE_MS.load(Ordering::SeqCst);
                        if now.saturating_sub(last) > 100 {
                            LAST_TOGGLE_MS.store(now, Ordering::SeqCst);

                            if let Some(ref cb) = HOOK_CALLBACK {
                                cb();
                            }
                        }

                        // Swallow lone Win keyup so native Start menu does not appear
                        return 1;
                    }
                }
            }
        } else {
            // Another key pressed while Win is down (e.g. Win + A for Quick Panel / AppActions.exe, Win + R)
            if is_down && WIN_KEY_PRESSED.load(Ordering::SeqCst) {
                COMBO_INTERRUPTED.store(true, Ordering::SeqCst);

                // If MaruStart is currently open when a Win combo is pressed, immediately dismiss it so Quick Panel can focus
                if let Some(ref cb) = COMBO_CALLBACK {
                    cb();
                }
            }
        }
    }

    CallNextHookEx(std::ptr::null_mut(), n_code, w_param, l_param)
}

unsafe extern "system" fn low_level_mouse_proc(
    n_code: i32,
    w_param: usize,
    l_param: isize,
) -> isize {
    if n_code >= 0 {
        let mouse_struct = &*(l_param as *const MSLLHOOKSTRUCT);
        let pt = mouse_struct.pt;
        let msg = w_param as u32;

        if msg == WM_LBUTTONDOWN {
            if is_point_on_start_button(pt) {
                START_BUTTON_DOWN.store(true, Ordering::SeqCst);
                // Swallow click so Windows 11 Explorer doesn't launch native Start
                return 1;
            }
        } else if msg == WM_LBUTTONUP {
            if START_BUTTON_DOWN.swap(false, Ordering::SeqCst) {
                if is_point_on_start_button(pt) {
                    // Clicked on taskbar Start icon!
                    dismiss_windows_native_start();
                    let now = current_millis();
                    let last = LAST_TOGGLE_MS.load(Ordering::SeqCst);
                    if now.saturating_sub(last) > 100 {
                        LAST_TOGGLE_MS.store(now, Ordering::SeqCst);
                        if let Some(ref cb) = HOOK_CALLBACK {
                            cb();
                        }
                    }
                }
                return 1;
            }
        }
    }

    CallNextHookEx(std::ptr::null_mut(), n_code, w_param, l_param)
}

pub fn start_keyboard_hook<F, C>(on_lone_win_or_start_click: F, on_win_combo: C)
where
    F: Fn() + Send + Sync + 'static,
    C: Fn() + Send + Sync + 'static,
{
    unsafe {
        HOOK_CALLBACK = Some(Box::new(on_lone_win_or_start_click));
        COMBO_CALLBACK = Some(Box::new(on_win_combo));
    }

    std::thread::spawn(|| unsafe {
        let kbd_hook = SetWindowsHookExW(
            WH_KEYBOARD_LL,
            Some(low_level_keyboard_proc),
            std::ptr::null_mut(),
            0,
        );

        let mouse_hook = SetWindowsHookExW(
            WH_MOUSE_LL,
            Some(low_level_mouse_proc),
            std::ptr::null_mut(),
            0,
        );

        if kbd_hook.is_null() && mouse_hook.is_null() {
            eprintln!("Failed to register hooks");
            return;
        }

        let mut msg: MSG = std::mem::zeroed();
        while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        if !kbd_hook.is_null() {
            UnhookWindowsHookEx(kbd_hook);
        }
        if !mouse_hook.is_null() {
            UnhookWindowsHookEx(mouse_hook);
        }
    });
}
