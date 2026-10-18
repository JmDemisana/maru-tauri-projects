use tauri::Manager;

#[cfg(target_os = "windows")]
mod window_lock {
    use windows_sys::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
    use windows_sys::Win32::UI::Shell::{DefSubclassProc, SetWindowSubclass};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        IsIconic, ShowWindow, HTCAPTION, SC_MOVE, SC_RESTORE, SC_SIZE, SIZE_RESTORED, SW_MAXIMIZE,
        WM_NCLBUTTONDBLCLK, WM_NCLBUTTONDOWN, WM_SIZE, WM_SYSCOMMAND,
    };

    const SUBCLASS_ID: usize = 0x4D41_5255; // "MARU"

    unsafe extern "system" fn lock_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _uid: usize,
        _data: usize,
    ) -> LRESULT {
        match msg {
            // The window lives permanently maximized. Block every system
            // command that would drop it back into a windowed frame:
            // restore-down, Alt+Space move, and the resize border.
            WM_SYSCOMMAND => {
                let cmd = (wparam as u32) & 0xFFF0;
                if cmd == SC_RESTORE || cmd == SC_MOVE || cmd == SC_SIZE {
                    return 0;
                }
            }
            // Block caption drags (Aero Snap / drag-to-restore) and
            // double-clicking the caption (maximize toggle).
            WM_NCLBUTTONDOWN | WM_NCLBUTTONDBLCLK => {
                if wparam as u32 == HTCAPTION {
                    return 0;
                }
            }
            _ => {}
        }

        let result = DefSubclassProc(hwnd, msg, wparam, lparam);

        // Safety net for shell-driven snap shortcuts (Win+arrow, Snap Assist):
        // if the OS ever restores the window, snap straight back to maximized.
        if msg == WM_SIZE && wparam as u32 == SIZE_RESTORED && IsIconic(hwnd) == 0 {
            ShowWindow(hwnd, SW_MAXIMIZE);
        }

        result
    }

    /// Locks the window into its maximized frame: no restore-down, no move,
    /// no resize and no Windows snap.
    pub fn install(window: &tauri::WebviewWindow) {
        if let Ok(hwnd) = window.hwnd() {
            unsafe {
                SetWindowSubclass(hwnd.0 as HWND, Some(lock_proc), SUBCLASS_ID, 0);
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                window_lock::install(&window);

                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Monika Piano application");
}
