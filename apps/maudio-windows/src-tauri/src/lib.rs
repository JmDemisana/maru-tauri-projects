pub mod media_control;
pub mod dsp_engine;

use media_control::{windows_impl, MediaState};
use dsp_engine::DspEngine;
use tauri::{Emitter, Manager};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct LastfmAuth {
    username: String,
    session_key: String,
}

fn lastfm_auth_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("lastfm-auth.json"))
}

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
fn hide_command_window(command: &mut std::process::Command) -> &mut std::process::Command {
    use std::os::windows::process::CommandExt;
    command.creation_flags(CREATE_NO_WINDOW)
}

#[cfg(not(target_os = "windows"))]
fn hide_command_window(command: &mut std::process::Command) -> &mut std::process::Command {
    command
}

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
fn start_native_dsp(app_name: Option<String>, state: tauri::State<'_, DspEngine>) -> Result<bool, String> {
    let name = app_name.unwrap_or_else(|| "spotify".to_string());
    state.start(name)
}

#[tauri::command]
fn stop_native_dsp(state: tauri::State<'_, DspEngine>) -> Result<bool, String> {
    state.stop()
}

#[tauri::command]
fn set_native_stem_levels(vocal: u32, inst: u32, bass: u32, state: tauri::State<'_, DspEngine>) -> Result<bool, String> {
    state.set_stem_levels(vocal, inst, bass);
    Ok(true)
}

#[tauri::command]
fn get_dsp_spectrum_peaks(state: tauri::State<'_, DspEngine>) -> Result<Vec<f32>, String> {
    Ok(state.get_peaks().to_vec())
}

#[tauri::command]
fn load_lastfm_auth(app: tauri::AppHandle) -> Result<LastfmAuth, String> {
    let path = lastfm_auth_path(&app)?;
    if !path.exists() {
        return Ok(LastfmAuth::default());
    }

    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
fn save_lastfm_auth(app: tauri::AppHandle, username: String, session_key: String) -> Result<LastfmAuth, String> {
    let auth = LastfmAuth {
        username: username.trim().to_string(),
        session_key: session_key.trim().to_string(),
    };
    let path = lastfm_auth_path(&app)?;
    let raw = serde_json::to_string_pretty(&auth).map_err(|e| e.to_string())?;
    fs::write(path, raw).map_err(|e| e.to_string())?;
    Ok(auth)
}

#[tauri::command]
fn clear_lastfm_auth(app: tauri::AppHandle) -> Result<(), String> {
    let path = lastfm_auth_path(&app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn hide_main_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
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

    Ok(())
}

#[tauri::command]
fn set_auto_start(enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_str = current_exe.to_string_lossy().to_string();

        if enabled {
            let cmd = format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v MAudio /t REG_SZ /d \"\\\"{}\\\" --minimized\" /f", exe_str);
            let output = hide_command_window(Command::new("cmd").args(&["/C", &cmd])).output().map_err(|e| e.to_string())?;
            if !output.status.success() {
                return Err(String::from_utf8_lossy(&output.stderr).to_string());
            }
        } else {
            let cmd = "reg delete HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v MAudio /f";
            let _ = hide_command_window(Command::new("cmd").args(&["/C", cmd])).output();
        }
    }
    Ok(())
}

#[tauri::command]
fn get_auto_start() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let cmd = "reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v MAudio";
        let output = hide_command_window(Command::new("cmd").args(&["/C", cmd])).output().map_err(|e| e.to_string())?;
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            return Ok(stdout.contains("MAudio"));
        }
    }
    Ok(false)
}

fn start_auth_loopback_server(app_handle: tauri::AppHandle) {
    std::thread::spawn(move || {
        let listener = match TcpListener::bind("127.0.0.1:48123") {
            Ok(l) => l,
            Err(e) => {
                eprintln!("Failed to bind auth loopback server: {}", e);
                return;
            }
        };

        for stream in listener.incoming() {
            if let Ok(mut stream) = stream {
                let mut buffer = [0; 2048];
                if let Ok(n) = stream.read(&mut buffer) {
                    let req = String::from_utf8_lossy(&buffer[..n]);
                    
                    if req.contains("OPTIONS") {
                        let response = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\n\r\n";
                        let _ = stream.write_all(response.as_bytes());
                        continue;
                    }

                    if let Some(pos) = req.find("token=") {
                        let rest = &req[pos + 6..];
                        let token: String = rest.chars().take_while(|c| c.is_alphanumeric() || *c == '_' || *c == '-').collect();

                        if !token.is_empty() {
                            let _ = app_handle.emit("lastfm_token_received", &token);
                            
                            if let Some(win) = app_handle.get_webview_window("main") {
                                let _ = win.unminimize();
                                let _ = win.show();
                                let _ = win.set_focus();
                            }
                        }

                        let response = "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: application/json\r\n\r\n{\"status\":\"ok\"}";
                        let _ = stream.write_all(response.as_bytes());
                    } else {
                        let response = "HTTP/1.1 404 Not Found\r\n\r\n";
                        let _ = stream.write_all(response.as_bytes());
                    }
                }
            }
        }
    });
}

pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    let start_minimized = args.iter().any(|a| a == "--minimized" || a == "--tray");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(DspEngine::new())
        .invoke_handler(tauri::generate_handler![
            get_media_state,
            send_media_control,
            move_to_next_monitor,
            load_lastfm_auth,
            save_lastfm_auth,
            clear_lastfm_auth,
            hide_main_window,
            set_auto_start,
            get_auto_start,
            start_native_dsp,
            stop_native_dsp,
            set_native_stem_levels,
            get_dsp_spectrum_peaks
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            start_auth_loopback_server(app_handle.clone());

            // 1. System Tray
            use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};
            use tauri::menu::{Menu, MenuItem};

            if let Ok(icon) = app.default_window_icon().cloned().ok_or("No default icon") {
                let show_i = MenuItem::with_id(app, "show", "Show MAudio", true, None::<&str>)?;
                let quit_i = MenuItem::with_id(app, "quit", "Quit MAudio", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

                let _tray = TrayIconBuilder::new()
                    .icon(icon)
                    .tooltip("MAudio - Music Suite & Scrobbler")
                    .menu(&menu)
                    .on_menu_event(|app, event| {
                        match event.id.as_ref() {
                            "show" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.unminimize();
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.unminimize();
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    })
                    .build(app);
            }

            // 2. Window Setup
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_resizable(false);
                let _ = window.set_maximizable(false);

                // Fit to primary work area
                #[cfg(target_os = "windows")]
                fit_window_to_monitor_work_area(&window, 0, 0);

                if !start_minimized {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running maudio application");
}
