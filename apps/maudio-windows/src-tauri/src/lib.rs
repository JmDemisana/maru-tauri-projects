pub mod media_control;

use media_control::{windows_impl, MediaState};
use tauri::{Emitter, Manager};
use std::io::{Read, Write};
use std::net::TcpListener;

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

#[tauri::command]
fn set_auto_start(enable: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_str = exe_path.to_str().ok_or("Invalid executable path")?;
        let cmd_val = format!("\"{}\" --minimized", exe_str);

        if enable {
            let status = Command::new("reg")
                .args(&["add", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "MAudio", "/t", "REG_SZ", "/d", &cmd_val, "/f"])
                .status()
                .map_err(|e| e.to_string())?;
            if !status.success() {
                return Err("Failed to write autostart registry entry".to_string());
            }
        } else {
            let _ = Command::new("reg")
                .args(&["delete", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "MAudio", "/f"])
                .status();
        }
    }
    Ok(())
}

#[tauri::command]
fn get_auto_start() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let output = Command::new("reg")
            .args(&["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "MAudio"])
            .output()
            .map_err(|e| e.to_string())?;
        Ok(output.status.success())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(false)
    }
}

fn start_auth_loopback_server(app_handle: tauri::AppHandle) {
    std::thread::spawn(move || {
        let listener = match TcpListener::bind("127.0.0.1:48123") {
            Ok(l) => l,
            Err(e) => {
                eprintln!("Auth loopback server bind notice: {}", e);
                return;
            }
        };

        for stream in listener.incoming() {
            if let Ok(mut stream) = stream {
                let mut buffer = [0; 2048];
                if let Ok(size) = stream.read(&mut buffer) {
                    let request = String::from_utf8_lossy(&buffer[..size]);
                    if request.starts_with("OPTIONS") {
                        let response = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\n\r\n";
                        let _ = stream.write_all(response.as_bytes());
                    } else if request.contains("/auth") {
                        if let Some(token_pos) = request.find("token=") {
                            let sub = &request[token_pos + 6..];
                            let token_end = sub.find(|c: char| c == ' ' || c == '&' || c == '\r' || c == '\n').unwrap_or(sub.len());
                            let token = sub[..token_end].to_string();
                            let _ = app_handle.emit("lastfm-auth-token", token);

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
        .invoke_handler(tauri::generate_handler![
            get_media_state,
            send_media_control,
            move_to_next_monitor,
            set_auto_start,
            get_auto_start
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
