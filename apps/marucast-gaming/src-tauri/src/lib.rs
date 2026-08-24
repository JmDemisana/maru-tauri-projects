pub mod adb;
pub mod session;

use adb::{AdbDevice, AndroidApp, RecentTask};
use session::{AppSession, SessionManager};
use std::sync::Mutex;
use tauri::State;

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
    let lock = state.lock().unwrap();
    lock.session_manager.launch_session(&device, &package_name, &app_name, &audio_mode, dpi)
}

#[tauri::command]
fn stop_app(session_id: String, state: State<Mutex<AppState>>) -> Result<bool, String> {
    let lock = state.lock().unwrap();
    lock.session_manager.stop_session(&session_id)
}

#[tauri::command]
fn send_back(device: String) -> Result<(), String> {
    SessionManager::send_back_key(&device)
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
            send_back
        ])
        .setup(|app| {
            if let Some(window) = tauri::Manager::get_webview_window(app, "main") {
                let _ = window.maximize();
                let _ = window.show();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running marucast-gaming application");
}
