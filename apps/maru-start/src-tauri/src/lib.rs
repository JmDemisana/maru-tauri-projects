pub mod apps;
pub mod hook;
pub mod power;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow,
};

static IS_VISIBLE: AtomicBool = AtomicBool::new(false);

fn fit_window_to_work_area(window: &WebviewWindow) {
    #[cfg(target_os = "windows")]
    unsafe {
        use windows_sys::Win32::Foundation::RECT;
        use windows_sys::Win32::UI::WindowsAndMessaging::{SystemParametersInfoW, SPI_GETWORKAREA};

        let mut rect: RECT = std::mem::zeroed();
        if SystemParametersInfoW(SPI_GETWORKAREA, 0, &mut rect as *mut _ as _, 0) != 0 {
            let width = (rect.right - rect.left) as u32;
            let height = (rect.bottom - rect.top) as u32;
            let _ = window.set_position(PhysicalPosition::new(rect.left, rect.top));
            let _ = window.set_size(PhysicalSize::new(width, height));
        }
    }
}

#[cfg(target_os = "windows")]
fn elevate_taskbar() {
    unsafe {
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            FindWindowW, SetWindowPos, ShowWindow, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE,
            SWP_NOSIZE, SWP_SHOWWINDOW, SW_SHOW,
        };

        // 1. Primary taskbar
        let tray_class: Vec<u16> = "Shell_TrayWnd\0".encode_utf16().collect();
        let tray_hwnd = FindWindowW(tray_class.as_ptr(), std::ptr::null());
        if !tray_hwnd.is_null() {
            ShowWindow(tray_hwnd, SW_SHOW);
            SetWindowPos(
                tray_hwnd,
                HWND_TOPMOST,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_NOACTIVATE,
            );
        }

        // 2. Secondary taskbars (multi-monitor)
        let sec_class: Vec<u16> = "Shell_SecondaryTrayWnd\0".encode_utf16().collect();
        let sec_hwnd = FindWindowW(sec_class.as_ptr(), std::ptr::null());
        if !sec_hwnd.is_null() {
            ShowWindow(sec_hwnd, SW_SHOW);
            SetWindowPos(
                sec_hwnd,
                HWND_TOPMOST,
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_NOACTIVATE,
            );
        }
    }
}

#[tauri::command]
async fn toggle_start_menu(window: WebviewWindow) -> Result<bool, String> {
    let is_vis = window.is_visible().unwrap_or_else(|_| IS_VISIBLE.load(Ordering::SeqCst));
    if is_vis {
        hide_menu(&window)?;
        Ok(false)
    } else {
        show_menu(&window)?;
        Ok(true)
    }
}

#[tauri::command]
async fn show_start_menu(window: WebviewWindow) -> Result<(), String> {
    show_menu(&window)
}

#[tauri::command]
async fn hide_start_menu(window: WebviewWindow) -> Result<(), String> {
    hide_menu(&window)
}

fn show_menu(window: &WebviewWindow) -> Result<(), String> {
    hook::dismiss_windows_native_start();
    fit_window_to_work_area(window);
    #[cfg(target_os = "windows")]
    elevate_taskbar();
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    let _ = window.emit("menu-opened", ());
    IS_VISIBLE.store(true, Ordering::SeqCst);
    Ok(())
}

fn hide_menu(window: &WebviewWindow) -> Result<(), String> {
    let _ = window.emit("menu-closed", ());
    window.hide().map_err(|e| e.to_string())?;
    hook::dismiss_windows_native_start();
    IS_VISIBLE.store(false, Ordering::SeqCst);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            toggle_start_menu,
            show_start_menu,
            hide_start_menu,
            apps::get_installed_apps,
            apps::get_app_icon,
            apps::get_desktop_wallpaper,
            apps::get_user_account_info,
            apps::search_start_items,
            apps::launch_app_path,
            apps::launch_app_admin,
            apps::open_file_location,
            apps::launch_terminal_cmd,
            apps::get_recent_emails,
            power::execute_power_action,
        ])
        .setup(|app| {
            let main_window = app.get_webview_window("main").expect("main window missing");

            // Position above the taskbar (using Windows Work Area)
            fit_window_to_work_area(&main_window);

            // Build Tray Menu
            let toggle_item = MenuItem::with_id(app, "toggle", "Toggle Start Menu", true, None::<&str>)?;
            let exit_item = MenuItem::with_id(app, "exit", "Exit MaruStart", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&toggle_item, &exit_item])?;

            let window_clone = main_window.clone();
            let _tray = TrayIconBuilder::new()
                .menu(&tray_menu)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("MaruStart - Windows 10 Start Menu")
                .on_menu_event(move |_app, event| match event.id().as_ref() {
                    "toggle" => {
                        let _ = toggle_start_menu(window_clone.clone());
                    }
                    "exit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = toggle_start_menu(w);
                        }
                    }
                })
                .build(app)?;

            // Auto-hide when user clicks outside the window (unless clicking specifically on the Start button)
            let w_focus = main_window.clone();
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    // Only ignore focus loss if cursor is specifically on the Start button
                    // (so the mouse hook can toggle it cleanly).
                    // NEVER block focus loss for Quick Actions (Win+A, taskbar tray, or AppActions.exe)!
                    if hook::is_cursor_on_start_button() {
                        return;
                    }

                    let _ = hide_menu(&w_focus);
                    hook::dismiss_windows_native_start();
                }
            });

            // Start Lone-Win Keyboard Hook & Combo Dismissal
            let window_for_hook = main_window.clone();
            let window_for_combo = main_window.clone();
            hook::start_keyboard_hook(
                move || {
                    let w = window_for_hook.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = toggle_start_menu(w).await;
                    });
                },
                move || {
                    let w = window_for_combo.clone();
                    let _ = hide_menu(&w);
                },
            );

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MaruStart application");
}
