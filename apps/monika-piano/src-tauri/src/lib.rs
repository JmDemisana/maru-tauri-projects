use tauri::Manager;

/// Native decorations stay on, snap and resize are disabled by the window flags
/// (resizable: false, maximizable: false). This guard only stops the one loophole
/// left on Windows: dragging a maximized caption restores the window. If the OS
/// ever un-zooms the window, we snap it right back to maximized.
#[cfg(target_os = "windows")]
fn keep_maximized(window: &tauri::Window) {
    use windows_sys::Win32::UI::WindowsAndMessaging::IsZoomed;

    if window.is_minimized().unwrap_or(false) {
        return;
    }

    if let Ok(hwnd) = window.hwnd() {
        let zoomed = unsafe { IsZoomed(hwnd.0 as isize as _) } != 0;
        if !zoomed {
            let _ = window.maximize();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Moved(_)) {
                #[cfg(target_os = "windows")]
                keep_maximized(window);
            }
        })
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Monika Piano application");
}
