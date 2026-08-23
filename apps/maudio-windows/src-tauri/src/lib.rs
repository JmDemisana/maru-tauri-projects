pub mod media_control;

use media_control::{windows_impl, MediaState};
use tauri::Manager;

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
    let _ = window.set_position(tauri::PhysicalPosition::new(mon_pos.x + 40, mon_pos.y + 40));

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
                let _ = window.show();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running maudio application");
}
