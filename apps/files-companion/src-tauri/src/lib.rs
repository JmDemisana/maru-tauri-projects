mod downloader;
mod mount;
mod uploader;
mod webdav;

use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{Manager, State};
use serde::Serialize;

// State shared between Tauri commands and the WebDAV thread
pub struct SharedState(pub Arc<Mutex<webdav::AppState>>);

#[derive(Serialize)]
struct StatusPayload {
    port: u16,
    drive_letter: Option<String>,
    elevated: bool,
    subscribed: bool,
    sub_user: Option<String>,
    elevation_user: Option<String>,
}

#[tauri::command]
async fn get_status(state: State<'_, SharedState>) -> Result<StatusPayload, String> {
    let mut s = state.0.lock().await;
    if let Some(letter) = s.drive_letter {
        if !mount::is_drive_mounted(letter) {
            s.drive_letter = None;
            save_config(&s);
        }
    }

    let mut config_changed = false;

    let elevated = if let Some(ref tok) = s.school_admin_token {
        if webdav::is_jwt_expired(tok) {
            s.school_admin_token = None;
            s.elevation_user_display = None;
            config_changed = true;
            false
        } else {
            true
        }
    } else {
        false
    };

    let subscribed = if let Some(ref tok) = s.sub_token {
        if webdav::is_jwt_expired(tok) {
            s.sub_token = None;
            s.sub_user_display = None;
            config_changed = true;
            false
        } else {
            true
        }
    } else {
        false
    };

    if config_changed {
        save_config(&s);
    }

    Ok(StatusPayload {
        port: s.port,
        drive_letter: s.drive_letter.map(|c| c.to_string()),
        elevated,
        subscribed,
        sub_user: s.sub_user_display.clone(),
        elevation_user: s.elevation_user_display.clone(),
    })
}

#[tauri::command]
async fn toggle_always_on_top(window: tauri::Window) -> Result<bool, String> {
    let is_on_top = window.is_always_on_top().unwrap_or(false);
    let next_state = !is_on_top;
    window.set_always_on_top(next_state).map_err(|e| e.to_string())?;
    Ok(next_state)
}

#[tauri::command]
async fn trigger_mount(state: State<'_, SharedState>) -> Result<String, String> {
    let port;
    let existing_letter;
    let best_letter;

    {
        let s = state.0.lock().await;
        port = s.port;
        existing_letter = s.drive_letter;
        best_letter = if existing_letter.is_none() {
            mount::find_best_drive_letter()
        } else {
            None
        };
    }

    let letter = if let Some(l) = existing_letter { l } else {
        match best_letter {
            Some(l) => l,
            None => return Err("No available drive letters found on your system.".to_string()),
        }
    };

    // Run blocking net use calls off the async runtime thread
    tokio::task::spawn_blocking(move || mount::mount_drive(letter, port))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e)?;

    // Save new drive letter
    {
        let mut s = state.0.lock().await;
        s.drive_letter = Some(letter);
        save_config(&s);
    }

    Ok(format!("{}:", letter))
}

#[tauri::command]
async fn trigger_unmount(state: State<'_, SharedState>) -> Result<(), String> {
    let mut s = state.0.lock().await;
    if let Some(letter) = s.drive_letter {
        match mount::unmount_drive(letter) {
            Ok(_) => {
                s.drive_letter = None;
                save_config(&s);
                Ok(())
            }
            Err(e) => Err(e),
        }
    } else {
        Ok(())
    }
}

#[tauri::command]
fn open_browser_login(scope: String) -> Result<(), String> {
    let url = if scope == "elevation" {
        "https://maruchansquigle.vercel.app/elevation#files_companion"
    } else {
        "https://maruchansquigle.vercel.app/subscription#files_companion"
    };

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = std::process::Command::new("cmd");
        cmd.creation_flags(0x08000000);
        let _ = cmd.args(&["/C", "start", "", url]).spawn();
    }

    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new("open").arg(url).spawn();
    }

    Ok(())
}

#[tauri::command]
async fn clear_auth(state: State<'_, SharedState>) -> Result<(), String> {
    let mut s = state.0.lock().await;
    
    // Unmount first
    if let Some(letter) = s.drive_letter {
        let _ = mount::unmount_drive(letter);
    }
    
    s.school_admin_token = None;
    s.sub_token = None;
    s.drive_letter = None;
    s.user_cleared = true;
    s.path_map.clear();
    
    // Add default root
    s.path_map.insert("/".to_string(), webdav::VirtualNode {
        name: "".to_string(),
        is_dir: true,
        path: "/".to_string(),
        size: 0,
        modified: 0,
        direct_url: None,
        file_id: None,
        is_split: false,
        split_parts: Vec::new(),
        split_archive_name: None,
        is_raw_split: false,
    });

    save_config(&s);
    Ok(())
}

fn save_config(state: &webdav::AppState) {
    let config_path = state.config_dir.join("config.json");
    let json = serde_json::json!({
        "school_admin_token": state.school_admin_token,
        "sub_token": state.sub_token,
        "port": state.port,
        "drive_letter": state.drive_letter.map(|c| c.to_string()),
        "backend_origin": state.backend_origin,
        "user_cleared": state.user_cleared,
    });

    if let Ok(data) = serde_json::to_string_pretty(&json) {
        let _ = fs::write(config_path, data);
    }
}

fn percent_decode(s: &str) -> String {
    let mut res = Vec::new();
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(hex) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                res.push(hex);
                i += 3;
                continue;
            }
        }
        res.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&res).into_owned()
}

fn simple_percent_encode(s: &str) -> String {
    s.replace("%", "%25")
     .replace(":", "%3A")
     .replace("/", "%2F")
     .replace("?", "%3F")
     .replace("=", "%3D")
     .replace("&", "%26")
     .replace(" ", "%20")
}

#[cfg(windows)]
fn register_custom_protocol() {
    use winreg::enums::*;
    use winreg::RegKey;

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_str) = exe_path.to_str() {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            if let Ok((key, _)) = hkcu.create_subkey("Software\\Classes\\files-companion") {
                let _ = key.set_value("", &"URL:Files Companion Protocol");
                let _ = key.set_value("URL Protocol", &"");
                if let Ok((cmd_key, _)) = key.create_subkey("shell\\open\\command") {
                    let cmd_val = format!("\"{}\" \"%1\"", exe_str);
                    let _ = cmd_key.set_value("", &cmd_val);
                }
            }
        }
    }
}

#[cfg(not(windows))]
fn register_custom_protocol() {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    register_custom_protocol();

    let args: Vec<String> = std::env::args().collect();
    let mut startup_token = None;
    let mut startup_type = None;
    let mut startup_origin = None;

    if args.len() > 1 {
        let mut raw_arg = args[1].trim().to_string();
        if raw_arg.starts_with('"') && raw_arg.ends_with('"') {
            raw_arg = raw_arg[1..raw_arg.len() - 1].to_string();
        }
        
        let prefix = "files-companion://";
        let alt_prefix = "files-companion:";
        let is_valid_protocol = raw_arg.starts_with(prefix) || raw_arg.starts_with(alt_prefix);
        
        if is_valid_protocol {
            if let Some(query_start) = raw_arg.find('?') {
                let query = &raw_arg[query_start + 1..];
                for pair in query.split('&') {
                    if let Some((key, val)) = pair.split_once('=') {
                        let val = percent_decode(val);
                        if key == "token" {
                            startup_token = Some(val);
                        } else if key == "type" {
                            startup_type = Some(val);
                        } else if key == "origin" {
                            startup_origin = Some(val);
                        }
                    }
                }
            }
        }

        // Try to ping the running instance
        if let (Some(token), Some(auth_type)) = (startup_token.clone(), startup_type.clone()) {
            let origin_val = startup_origin.clone().unwrap_or_else(|| "https://maruchansquigle.vercel.app".to_string());
            let ping_url = format!(
                "http://127.0.0.1:49152/auth?token={}&type={}&origin={}",
                simple_percent_encode(&token),
                simple_percent_encode(&auth_type),
                simple_percent_encode(&origin_val)
            );
            if let Ok(rt) = tokio::runtime::Builder::new_current_thread().enable_all().build() {
                let ping_succeeded = rt.block_on(async {
                    let client = reqwest::Client::new();
                    match client.get(&ping_url).send().await {
                        Ok(resp) if resp.status().is_success() => {
                            // Check the response body says {"ok":true}
                            if let Ok(text) = resp.text().await {
                                eprintln!("[files-companion] Ping response: {}", text);
                                text.contains("\"ok\":true")
                            } else {
                                false
                            }
                        }
                        Ok(resp) => {
                            eprintln!("[files-companion] Ping got HTTP {}", resp.status());
                            false
                        }
                        Err(e) => {
                            eprintln!("[files-companion] Ping failed: {}", e);
                            false
                        }
                    }
                });
                if ping_succeeded {
                    eprintln!("[files-companion] Handoff to running instance succeeded. Exiting.");
                    std::process::exit(0);
                }
            }
        }
    }

    let app_data = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    let base_dir = PathBuf::from(app_data).join("MaruFilesCompanion");
    let cache_dir = base_dir.join("Cache");
    let config_dir = base_dir.join("Config");
    
    let _ = fs::create_dir_all(&cache_dir);
    let _ = fs::create_dir_all(&config_dir);

    let config_path = config_dir.join("config.json");
    let mut school_admin_token = None;
    let mut sub_token = None;
    let mut port = 49152;
    let mut drive_letter = None;
    let mut backend_origin = "https://maruchansquigle.vercel.app".to_string();
    let mut user_cleared = false;

    let mut sub_user_display = None;
    let mut elevation_user_display = None;

    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                school_admin_token = json["school_admin_token"].as_str().map(|s| s.to_string());
                sub_token = json["sub_token"].as_str().map(|s| s.to_string());
                sub_user_display = json["sub_user_display"].as_str().map(|s| s.to_string());
                elevation_user_display = json["elevation_user_display"].as_str().map(|s| s.to_string());
                if let Some(p) = json["port"].as_u64() {
                    port = p as u16;
                }
                if let Some(d) = json["drive_letter"].as_str().and_then(|s| s.chars().next()) {
                    drive_letter = Some(d);
                }
                if let Some(o) = json["backend_origin"].as_str() {
                    backend_origin = o.to_string();
                }
                if let Some(uc) = json["user_cleared"].as_bool() {
                    user_cleared = uc;
                }
            }
        }
    }

    // Override config with startup parameters if launched via deep link
    if let (Some(token), Some(auth_type)) = (startup_token, startup_type) {
        user_cleared = false;
        let display_user = webdav::decode_jwt_user_display(&token);
        if auth_type == "elevation" {
            school_admin_token = Some(token);
            elevation_user_display = display_user.or(Some("Elevated Admin".to_string()));
        } else if auth_type == "subscription" {
            sub_token = Some(token);
            sub_user_display = display_user.or(Some("Subscriber Account".to_string()));
        }
        if let Some(origin) = startup_origin {
            backend_origin = origin;
        }
    }

    let app_state = webdav::AppState {
        school_admin_token,
        sub_token,
        sub_user_display,
        elevation_user_display,
        port,
        drive_letter,
        cache_dir,
        config_dir,
        path_map: std::collections::HashMap::new(),
        backend_origin,
        user_cleared,
    };

    save_config(&app_state);

    let state_arc = Arc::new(Mutex::new(app_state));
    let state_clone = state_arc.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(SharedState(state_arc))
        .setup(move |app| {
            let handle = app.handle().clone();
            let state_for_setup = state_clone.clone();

            // Clean up any lingering/ghost drives from previous runs first
            mount::cleanup_stale_webdav_drives();

            // Register files-companion:// deep-link protocol in Windows Registry
            mount::register_deep_link_protocol();

            // Mount drive immediately from cached state if configured
            let state_for_mount = state_for_setup.clone();
            let _mount_handle = tauri::async_runtime::spawn(async move {
                let mount_state = state_for_mount.lock().await;
                if let Some(letter) = mount_state.drive_letter {
                    drop(mount_state);
                    let _ = mount::mount_drive(letter, port);
                }
            });
            // Refresh file tree in background — doesn't block mount or WebDAV startup
            let state_for_rebuild = state_for_setup.clone();
            tauri::async_runtime::spawn(async move {
                let mut s = state_for_rebuild.lock().await;
                let _ = webdav::rebuild_file_tree(&mut s).await;
            });

            // Start WebDAV thread
            tauri::async_runtime::spawn(async move {
                webdav::run_webdav_server(state_clone, handle).await;
            });

            // System tray menu with Quit option to dissolve drives on exit
            let quit_i = tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = tauri::menu::MenuItem::with_id(app, "show", "Show App", true, None::<&str>)?;
            let menu = tauri::menu::Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    if event.id() == "quit" {
                        mount::cleanup_stale_webdav_drives();
                        app.exit(0);
                    } else if event.id() == "show" {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    match event {
                        tauri::tray::TrayIconEvent::Click { button, button_state, .. } => {
                            if button == tauri::tray::MouseButton::Left && button_state == tauri::tray::MouseButtonState::Up {
                                let app = tray.app_handle();
                                if let Some(window) = app.get_webview_window("main") {
                                    if window.is_visible().unwrap_or(false) && !window.is_minimized().unwrap_or(false) {
                                        let _ = window.hide();
                                    } else {
                                        let _ = window.show();
                                        let _ = window.unminimize();
                                        let _ = window.set_focus();
                                    }
                                }
                            }
                        }
                        tauri::tray::TrayIconEvent::DoubleClick { .. } => {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Intercept window close request to minimize to tray instead
            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window_clone.hide();
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_status,
            trigger_mount,
            trigger_unmount,
            open_browser_login,
            clear_auth,
            toggle_always_on_top
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
