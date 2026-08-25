pub mod adb;
pub mod session;

use adb::{AdbDevice, AndroidApp, RecentTask};
use session::{AppSession, SessionManager};
use std::sync::Mutex;
use tauri::State;

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
                rcMonitor: RECT {
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                },
                rcWork: RECT {
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                },
                dwFlags: 0,
            };
            if GetMonitorInfoW(hmon, &mut mi as *mut _ as *mut _) != 0 {
                let width = (mi.rcWork.right - mi.rcWork.left) as u32;
                let height = (mi.rcWork.bottom - mi.rcWork.top) as u32;
                let _ = window.set_position(PhysicalPosition::new(mi.rcWork.left, mi.rcWork.top));
                let _ = window.set_size(PhysicalSize::new(width, height));
            }
        }
    }
}

pub struct AppState {
    pub session_manager: SessionManager,
}

#[tauri::command]
fn get_devices() -> Result<Vec<AdbDevice>, String> {
    adb::get_connected_devices()
}

#[tauri::command]
fn connect_device(ip_port: String) -> Result<String, String> {
    adb::connect_wireless(&ip_port)
}

#[tauri::command]
fn pair_device(ip_port: String, code: String) -> Result<String, String> {
    adb::pair_wireless(&ip_port, &code)
}

#[tauri::command]
fn get_apps(device: Option<String>) -> Result<Vec<AndroidApp>, String> {
    let dev = device.unwrap_or_default();
    adb::get_installed_apps(&dev)
}

#[tauri::command]
fn get_recents(device: Option<String>) -> Result<Vec<RecentTask>, String> {
    let dev = device.unwrap_or_default();
    adb::get_recent_tasks(&dev)
}

#[tauri::command]
fn close_task(device: String, package_name: String) -> Result<(), String> {
    adb::force_stop_app(&device, &package_name)
}

#[tauri::command]
fn uninstall_app(device: String, package_name: String) -> Result<String, String> {
    adb::uninstall_app(&device, &package_name)
}

#[tauri::command]
fn launch_app(
    device: String,
    package_name: String,
    app_name: String,
    audio_mode: String,
    dpi: Option<i32>,
    state: State<Mutex<AppState>>,
) -> Result<AppSession, String> {
    let lock = state.lock().map_err(|e| e.to_string())?;
    lock.session_manager
        .launch_session(&device, &package_name, &app_name, &audio_mode, dpi)
}

#[tauri::command]
fn stop_app(session_id: String, state: State<Mutex<AppState>>) -> Result<bool, String> {
    let lock = state.lock().map_err(|e| e.to_string())?;
    lock.session_manager.stop_session(&session_id)
}

#[tauri::command]
fn send_back(device: String) -> Result<(), String> {
    SessionManager::send_back_key(&device)
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
        for (index, monitor) in monitors.iter().enumerate() {
            if monitor.name() == curr_mon.name() {
                next_idx = (index + 1) % monitors.len();
                break;
            }
        }
    }

    let target_monitor = &monitors[next_idx];
    let monitor_position = target_monitor.position();

    #[cfg(target_os = "windows")]
    fit_window_to_monitor_work_area(&window, monitor_position.x + 10, monitor_position.y + 10);

    #[cfg(not(target_os = "windows"))]
    {
        let _ = window.set_position(tauri::PhysicalPosition::new(
            monitor_position.x,
            monitor_position.y,
        ));
    }

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Mutex::new(AppState {
            session_manager: SessionManager::new(),
        }))
        .invoke_handler(tauri::generate_handler![
            get_devices,
            connect_device,
            pair_device,
            get_apps,
            get_recents,
            close_task,
            uninstall_app,
            launch_app,
            stop_app,
            send_back,
            move_to_next_monitor
        ])
        .setup(|app| {
            if let Some(window) = tauri::Manager::get_webview_window(app, "main") {
                let _ = window.set_resizable(false);
                let _ = window.set_maximizable(false);

                #[cfg(target_os = "windows")]
                fit_window_to_monitor_work_area(&window, 0, 0);

                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running marucast-gaming application");
}
