
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
    let mon_size = target_mon.size();
    let win_size = window.outer_size().unwrap_or(tauri::PhysicalSize::new(420, 660));

    let new_x = mon_pos.x + ((mon_size.width as i32 - win_size.width as i32) / 2).max(50);
    let new_y = mon_pos.y + ((mon_size.height as i32 - win_size.height as i32) / 2).max(50);

    let _ = window.set_position(tauri::PhysicalPosition::new(new_x, new_y));
    Ok(())
}

#[tauri::command]
async fn set_always_on_top(window: tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            move_to_next_monitor,
            set_always_on_top
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
