pub mod media_control;

use media_control::{windows_impl, MediaState};
use tauri::Manager;

#[cfg(target_os = "windows")]
fn fit_window_to_monitor_work_area(window: &tauri::WebviewWindow, x: i32, y: i32) {
    use tauri::{PhysicalPosition, PhysicalSize};
    use windows_sys::Win32::Foundation::{POINT, RECT};
    use windows_sys::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };

    unsafe {
        let pt = POINT { x, y };
        let hmon = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
        if !hmon.is_null() {
            let mut mi = MONITORINFO {
                cbSize: std::mem::size_of::<MONITORINFO>() as u32,
                rcMonitor: RECT { left: 0, top: 0, right: 0, bottom: 0 },
                rcWork: RECT { left: 0, top: 0, right: 0, bottom: 0 },
                dwFlags: 0,
            };
            if GetMonitorInfoW(hmon, &mut mi as *mut _ as *mut _) != 0 {
                let w = (mi.rcWork.right - mi.rcWork.left) as u32;
                let h = (mi.rcWork.bottom - mi.rcWork.top) as u32;
                let wx = mi.rcWork.left;
                let wy = mi.rcWork.top;
                let _ = window.set_position(PhysicalPosition::new(wx, wy));
                let _ = window.set_size(PhysicalSize::new(w, h));
            }
        }
    }
}

#[tauri::command]
async fn get_media_state() -> Result<MediaState, String> {
    windows_impl::get_current_media_state().await
}

#[tauri::command]
async fn send_media_control(command: String) -> Result<bool, String> {
    windows_impl::control_playback(&command).await
}

#[tauri::command]
async fn move_to_next_monitor(window: tauri::WebviewWindow) -> Result<(), String> {
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    if monitors.len() <= 1 {
        return Ok(());
    }

    let current = window.current_monitor().map_err(|e| e.to_string())?;
    let mut next_idx = 0;
    if let Some(curr_mon) = current {
        for (i, m) in monitors.iter().enumerate() {
            if m.name() == curr_mon.name() {
                next_idx = (i + 1) % monitors.len();
                break;
            }
        }
    }

    let target_mon = &monitors[next_idx];
    let mon_pos = target_mon.position();

    #[cfg(target_os = "windows")]
    fit_window_to_monitor_work_area(&window, mon_pos.x + 10, mon_pos.y + 10);

    #[cfg(not(target_os = "windows"))]
    {
        let _ = window.set_position(tauri::PhysicalPosition::new(mon_pos.x + 40, mon_pos.y + 40));
    }

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_media_state,
            send_media_control,
            move_to_next_monitor
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_resizable(false);
                let _ = window.set_maximizable(false);

                // Fit to primary work area (respects taskbar, prevents Windows Snap resizing)
                #[cfg(target_os = "windows")]
                fit_window_to_monitor_work_area(&window, 0, 0);

                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running maudio application");
}
