#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use axum::{
    body::Body,
    extract::{Query, State},
    http::{header, HeaderValue, StatusCode},
    response::Response,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{
    io::Cursor,
    path::{Path, PathBuf},
    process::Command,
    sync::{Arc, Mutex},
    time::Duration,
};
use tower_http::cors::{Any, CorsLayer};

#[cfg(target_os = "windows")]
#[link(name = "user32")]
#[link(name = "gdi32")]
#[link(name = "shell32")]
extern "system" {}

#[cfg(target_os = "windows")]
use windows_sys::Win32::{
    Foundation::{HWND, LPARAM, RECT},
    Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
        GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        SRCCOPY,
    },
    UI::WindowsAndMessaging::{
        EnumWindows, GetClientRect, GetWindowLongPtrW, GetWindowTextW, GetWindowThreadProcessId,
        IsWindow, PostMessageW, SetLayeredWindowAttributes, SetWindowLongPtrW, SetWindowPos,
        GWL_EXSTYLE, HWND_TOP, LWA_ALPHA, SWP_NOACTIVATE, SWP_NOZORDER, SWP_SHOWWINDOW, WM_LBUTTONDOWN,
        WM_LBUTTONUP, WM_MOUSEMOVE, WM_RBUTTONDOWN, WM_RBUTTONUP, WS_EX_APPWINDOW, WS_EX_LAYERED,
        WS_EX_TOOLWINDOW, WS_EX_TRANSPARENT,
    },
};

#[cfg(target_os = "windows")]
extern "system" {
    fn PrintWindow(hwnd: HWND, hdcBlt: windows_sys::Win32::Graphics::Gdi::HDC, nFlags: u32) -> i32;
}

const MK_LBUTTON: usize = 0x0001;
const MK_RBUTTON: usize = 0x0002;

#[derive(Clone)]
pub struct AppState {
    pub current_session: Arc<Mutex<Option<ActiveSession>>>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ActiveSession {
    pub process_id: u32,
    pub path: String,
    pub name: String,
    pub is_japanese_locale: bool,
    pub is_admin: bool,
    pub is_offscreen: bool,
    pub hwnd: Option<isize>,
}

#[derive(Serialize)]
pub struct ExecutableItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size_bytes: u64,
    pub likely_game: bool,
}

#[derive(Deserialize)]
pub struct ScanQuery {
    pub dir: Option<String>,
}

#[derive(Deserialize)]
pub struct LaunchRequest {
    pub path: String,
    #[serde(default)]
    pub japanese_locale: bool,
    #[serde(default)]
    pub as_admin: bool,
    #[serde(default = "default_true")]
    pub offscreen: bool,
    #[serde(default = "default_scale")]
    pub scale_factor: f32,
}

fn default_true() -> bool {
    true
}

fn default_scale() -> f32 {
    1.75
}

#[derive(Serialize)]
pub struct RunningWindowItem {
    pub hwnd: isize,
    pub pid: u32,
    pub title: String,
    pub width: i32,
    pub height: i32,
}

#[derive(Deserialize)]
pub struct HookWindowRequest {
    pub hwnd: isize,
    #[serde(default = "default_true")]
    pub offscreen: bool,
}

#[derive(Deserialize)]
pub struct InputRequest {
    pub event_type: String, // "down", "up", "click", "move", "key"
    #[serde(default)]
    pub x_ratio: f32,       // 0.0 to 1.0
    #[serde(default)]
    pub y_ratio: f32,       // 0.0 to 1.0
    #[serde(default = "default_left")]
    pub button: String,     // "left", "right"
    #[serde(default)]
    pub key: String,        // "space", "enter", "escape", "ctrl", "s", "l", "a", etc.
}

fn default_left() -> String {
    "left".to_string()
}

#[tokio::main]
async fn main() {
    let state = AppState {
        current_session: Arc::new(Mutex::new(None)),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/status", get(get_status))
        .route("/api/drives", get(get_drives))
        .route("/api/windows", get(get_running_windows))
        .route("/api/hook_window", post(hook_window))
        .route("/api/scan", get(scan_directory))
        .route("/api/launch", post(launch_app))
        .route("/api/stop", post(stop_app))
        .route("/api/input", post(handle_input))
        .route("/api/screenshot", get(get_screenshot))
        .layer(cors)
        .with_state(state);

    let addr = "0.0.0.0:48792";
    println!("[Marucast PC Agent] Running headless on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn get_running_windows() -> Json<Vec<RunningWindowItem>> {
    let mut list = Vec::new();
    #[cfg(target_os = "windows")]
    {
        struct WindowEnumData {
            windows: Vec<RunningWindowItem>,
        }

        unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> i32 {
            let data = &mut *(lparam as *mut WindowEnumData);
            if IsWindow(hwnd) == 0 {
                return 1;
            }

            let mut title_buf = [0u16; 512];
            let len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), 512);
            if len == 0 {
                return 1;
            }
            let title = String::from_utf16_lossy(&title_buf[..len as usize]);

            let lower = title.to_lowercase();
            if lower == "program manager" || lower == "windows input experience" || lower.starts_with("settings") {
                return 1;
            }

            let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
            GetClientRect(hwnd, &mut rect);
            let width = rect.right - rect.left;
            let height = rect.bottom - rect.top;

            if width > 150 && height > 150 {
                let mut pid: u32 = 0;
                GetWindowThreadProcessId(hwnd, &mut pid);

                data.windows.push(RunningWindowItem {
                    hwnd: hwnd as isize,
                    pid,
                    title,
                    width,
                    height,
                });
            }
            1
        }

        let mut data = WindowEnumData { windows: Vec::new() };
        unsafe {
            EnumWindows(Some(enum_proc), &mut data as *mut WindowEnumData as LPARAM);
        }
        list = data.windows;
    }
    Json(list)
}

async fn hook_window(
    State(state): State<AppState>,
    Json(payload): Json<HookWindowRequest>,
) -> Result<Json<ActiveSession>, (StatusCode, String)> {
    let hwnd_ptr = payload.hwnd as HWND;
    #[cfg(target_os = "windows")]
    unsafe {
        if IsWindow(hwnd_ptr) == 0 {
            return Err((StatusCode::NOT_FOUND, "Window not found".to_string()));
        }

        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd_ptr, &mut pid);

        let mut title_buf = [0u16; 512];
        let len = GetWindowTextW(hwnd_ptr, title_buf.as_mut_ptr(), 512);
        let title = if len > 0 {
            String::from_utf16_lossy(&title_buf[..len as usize])
        } else {
            "Active Window".to_string()
        };

        if payload.offscreen {
            let ex_style = GetWindowLongPtrW(hwnd_ptr, GWL_EXSTYLE);
            let new_style = (ex_style | WS_EX_TOOLWINDOW as isize) & !(WS_EX_APPWINDOW as isize);
            SetWindowLongPtrW(hwnd_ptr, GWL_EXSTYLE, new_style);

            if let Some(target_display) = crate::virtual_display::get_stream_target_display() {
                SetWindowPos(
                    hwnd_ptr,
                    HWND_TOP,
                    target_display.left,
                    target_display.top,
                    target_display.width,
                    target_display.height,
                    SWP_NOACTIVATE | SWP_NOZORDER | SWP_SHOWWINDOW,
                );
            } else {
                SetWindowPos(
                    hwnd_ptr,
                    HWND_TOP,
                    -3200,
                    -3200,
                    1920,
                    1080,
                    SWP_NOACTIVATE | SWP_NOZORDER | SWP_SHOWWINDOW,
                );
            }
        }

        let session = ActiveSession {
            process_id: pid,
            path: String::new(),
            name: title,
            is_japanese_locale: false,
            is_admin: false,
            is_offscreen: payload.offscreen,
            hwnd: Some(payload.hwnd),
        };

        *state.current_session.lock().unwrap() = Some(session.clone());
        return Ok(Json(session));
    }

    #[cfg(not(target_os = "windows"))]
    Err((StatusCode::NOT_IMPLEMENTED, "Windows only".to_string()))
}

async fn get_drives() -> Json<Vec<String>> {
    let mut drives = Vec::new();
    #[cfg(target_os = "windows")]
    {
        for letter in b'A'..=b'Z' {
            let drive_str = format!("{}:\\", letter as char);
            if Path::new(&drive_str).exists() {
                drives.push(drive_str);
            }
        }
    }
    if drives.is_empty() {
        drives.push("C:\\".to_string());
    }
    Json(drives)
}

async fn get_status(State(state): State<AppState>) -> Json<serde_json::Value> {
    let session = state.current_session.lock().unwrap().clone();
    let hostname = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "Windows PC".to_string());

    Json(serde_json::json!({
        "status": "online",
        "service": "Marucast for Gaming PC Agent",
        "version": "1.0.0",
        "hostname": hostname,
        "active_session": session
    }))
}

async fn scan_directory(Query(query): Query<ScanQuery>) -> Json<Vec<ExecutableItem>> {
    let target_dir = query.dir.unwrap_or_else(|| {
        if Path::new("D:\\Games").exists() {
            "D:\\Games".to_string()
        } else if Path::new("C:\\Games").exists() {
            "C:\\Games".to_string()
        } else {
            "D:\\".to_string()
        }
    });

    let dir_path = PathBuf::from(&target_dir);
    let mut items = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            let is_dir = path.is_dir();
            let name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            if is_dir {
                // If it's a directory, check if it contains a top-level .exe (like a game folder)
                let mut has_exe = false;
                if let Ok(sub_entries) = std::fs::read_dir(&path) {
                    for sub in sub_entries.flatten() {
                        if let Some(ext) = sub.path().extension() {
                            if ext.eq_ignore_ascii_case("exe") {
                                has_exe = true;
                                break;
                            }
                        }
                    }
                }

                items.push(ExecutableItem {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_dir: true,
                    size_bytes: 0,
                    likely_game: has_exe,
                });
            } else if let Some(ext) = path.extension() {
                if ext.eq_ignore_ascii_case("exe") {
                    let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                    let is_uninstaller = name.to_lowercase().contains("unins")
                        || name.to_lowercase().contains("setup")
                        || name.to_lowercase().contains("crash");

                    items.push(ExecutableItem {
                        name,
                        path: path.to_string_lossy().to_string(),
                        is_dir: false,
                        size_bytes: size,
                        likely_game: !is_uninstaller,
                    });
                }
            }
        }
    }

    // Sort: directories first, then likely games, then alphabetically
    items.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| b.likely_game.cmp(&a.likely_game))
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Json(items)
}

async fn launch_app(
    State(state): State<AppState>,
    Json(payload): Json<LaunchRequest>,
) -> Result<Json<ActiveSession>, (StatusCode, String)> {
    let target_path = PathBuf::from(&payload.path);
    if !target_path.exists() {
        return Err((
            StatusCode::NOT_FOUND,
            format!("Executable not found at path: {}", payload.path),
        ));
    }

    let file_stem = target_path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let parent_dir = target_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .to_path_buf();

    // 1. Locate Locale Emulator if requested
    let mut use_le = false;
    let mut le_path = PathBuf::new();

    if payload.japanese_locale {
        let possible_paths = [
            PathBuf::from("C:\\Program Files\\Locale Emulator\\LEProc.exe"),
            PathBuf::from("C:\\Program Files (x86)\\Locale Emulator\\LEProc.exe"),
            PathBuf::from("D:\\Locale Emulator\\LEProc.exe"),
            PathBuf::from("D:\\Software\\Locale Emulator\\LEProc.exe"),
        ];

        for p in &possible_paths {
            if p.exists() {
                le_path = p.clone();
                use_le = true;
                break;
            }
        }
    }

    // 2. Launch process
    let mut cmd = if use_le {
        let mut c = Command::new(le_path);
        c.arg("-run").arg(&payload.path);
        c.current_dir(&parent_dir);
        c
    } else if payload.as_admin {
        let mut c = Command::new("powershell");
        c.arg("-WindowStyle")
            .arg("Hidden")
            .arg("-Command")
            .arg(format!(
                "Start-Process -FilePath '{}' -WorkingDirectory '{}' -Verb RunAs",
                payload.path,
                parent_dir.to_string_lossy()
            ));
        c
    } else {
        let mut c = Command::new(&payload.path);
        c.current_dir(&parent_dir);
        let scale = if payload.scale_factor > 0.5 { payload.scale_factor } else { 1.75 };
        if payload.path.to_lowercase().contains("chrome.exe") || payload.path.to_lowercase().contains("msedge.exe") {
            c.arg("--disable-gpu");
            c.arg("--disable-gpu-compositing");
            c.arg("--disable-direct-composition");
            c.arg(format!("--force-device-scale-factor={}", scale));
            c.arg("--window-size=1920,1080");
            c.arg("--new-window");
            c.arg("https://www.google.com");
        }
        if payload.japanese_locale {
            // Environment fallback for Japanese locale simulation
            c.env("LANG", "ja_JP.UTF-8");
            c.env("LC_ALL", "ja_JP.UTF-8");
        }
        c
    };

    let child = cmd
        .spawn()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to spawn process: {}", e)))?;

    let pid = child.id();

    // 3. Retry loop to allow window to initialize and hook HWND (up to 2.5s)
    let mut hwnd = None;
    #[cfg(target_os = "windows")]
    {
        for _ in 0..10 {
            tokio::time::sleep(Duration::from_millis(250)).await;
            hwnd = find_window_for_pid(pid, &file_stem);
            if hwnd.is_some() {
                break;
            }
        }
    }

    #[cfg(target_os = "windows")]
    if let Some(h) = hwnd {
        let hwnd_ptr = h as HWND;
        unsafe {
            if payload.offscreen {
                let ex_style = GetWindowLongPtrW(hwnd_ptr, GWL_EXSTYLE);
                let new_style = (ex_style | WS_EX_TOOLWINDOW as isize) & !(WS_EX_APPWINDOW as isize);
                SetWindowLongPtrW(hwnd_ptr, GWL_EXSTYLE, new_style);

                SetWindowPos(
                    hwnd_ptr,
                    HWND_TOP,
                    0,
                    0,
                    1920,
                    1080,
                    SWP_NOACTIVATE | SWP_NOZORDER | SWP_SHOWWINDOW,
                );
            }
        }
    }

    let session = ActiveSession {
        process_id: pid,
        path: payload.path,
        name: file_stem,
        is_japanese_locale: payload.japanese_locale,
        is_admin: payload.as_admin,
        is_offscreen: payload.offscreen,
        hwnd,
    };

    *state.current_session.lock().unwrap() = Some(session.clone());

    Ok(Json(session))
}

async fn stop_app(State(state): State<AppState>) -> Json<serde_json::Value> {
    let mut lock = state.current_session.lock().unwrap();
    if let Some(session) = lock.take() {
        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(["/F", "/PID", &session.process_id.to_string()])
                .output();
        }
        Json(serde_json::json!({ "success": true, "stopped_pid": session.process_id }))
    } else {
        Json(serde_json::json!({ "success": false, "message": "No active session" }))
    }
}

#[cfg(target_os = "windows")]
unsafe fn get_deepest_child(parent: HWND, client_pt: windows_sys::Win32::Foundation::POINT) -> (HWND, windows_sys::Win32::Foundation::POINT) {
    let mut current_hwnd = parent;
    let mut current_pt = client_pt;

    for _ in 0..8 {
        let child = windows_sys::Win32::UI::WindowsAndMessaging::RealChildWindowFromPoint(current_hwnd, current_pt);
        if child.is_null() || child == current_hwnd {
            break;
        }
        let mut screen_pt = current_pt;
        windows_sys::Win32::Graphics::Gdi::ClientToScreen(current_hwnd, &mut screen_pt);
        windows_sys::Win32::Graphics::Gdi::ScreenToClient(child, &mut screen_pt);
        current_hwnd = child;
        current_pt = screen_pt;
    }

    (current_hwnd, current_pt)
}

async fn handle_input(
    State(state): State<AppState>,
    Json(payload): Json<InputRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let hwnd_opt = {
        let lock = state.current_session.lock().unwrap();
        lock.as_ref().and_then(|s| s.hwnd)
    };

    #[cfg(target_os = "windows")]
    if let Some(h) = hwnd_opt {
        let hwnd_ptr = h as HWND;
        unsafe {
            if IsWindow(hwnd_ptr) == 0 {
                return Err((StatusCode::BAD_REQUEST, "Window is no longer active".to_string()));
            }

            let mut rect = RECT {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
            };
            GetClientRect(hwnd_ptr, &mut rect);

            let width = (rect.right - rect.left).max(1) as f32;
            let height = (rect.bottom - rect.top).max(1) as f32;

            let target_x = (payload.x_ratio.clamp(0.0, 1.0) * width) as i32;
            let target_y = (payload.y_ratio.clamp(0.0, 1.0) * height) as i32;

            let initial_pt = windows_sys::Win32::Foundation::POINT {
                x: target_x,
                y: target_y,
            };

            let (target_hwnd, local_pt) = get_deepest_child(hwnd_ptr, initial_pt);
            let lparam = (((local_pt.y as u32 & 0xFFFF) << 16) | (local_pt.x as u32 & 0xFFFF)) as LPARAM;

            match payload.event_type.as_str() {
                "key" => {
                    let vk = match payload.key.to_lowercase().as_str() {
                        "space" => 0x20usize,
                        "enter" | "return" => 0x0Dusize,
                        "escape" | "esc" => 0x1Busize,
                        "ctrl" | "control" => 0x11usize,
                        "tab" => 0x09usize,
                        "f11" => 0x7Ausize,
                        "s" => 0x53usize,
                        "l" => 0x4Cusize,
                        "a" => 0x41usize,
                        "q" => 0x51usize,
                        "z" => 0x5Ausize,
                        "x" => 0x58usize,
                        "c" => 0x43usize,
                        "up" => 0x26usize,
                        "down" => 0x28usize,
                        "left" => 0x25usize,
                        "right" => 0x27usize,
                        _ => 0usize,
                    };
                    if vk != 0 {
                        // WM_KEYDOWN = 0x0100, WM_KEYUP = 0x0101
                        PostMessageW(target_hwnd, 0x0100, vk, 0);
                        PostMessageW(target_hwnd, 0x0101, vk, 0);
                    }
                }
                "move" => {
                    let w_param = if payload.button == "left" {
                        MK_LBUTTON
                    } else if payload.button == "right" {
                        MK_RBUTTON
                    } else {
                        0
                    };
                    PostMessageW(target_hwnd, WM_MOUSEMOVE, w_param, lparam);
                }
                "down" | "click" => {
                    // Send mouse move first so window registers hover and focus
                    PostMessageW(target_hwnd, WM_MOUSEMOVE, 0, lparam);

                    let msg_down = if payload.button == "right" {
                        WM_RBUTTONDOWN
                    } else {
                        WM_LBUTTONDOWN
                    };
                    let w_param = if payload.button == "right" {
                        MK_RBUTTON
                    } else {
                        MK_LBUTTON
                    };
                    PostMessageW(target_hwnd, msg_down, w_param, lparam);

                    if payload.event_type == "click" {
                        let msg_up = if payload.button == "right" {
                            WM_RBUTTONUP
                        } else {
                            WM_LBUTTONUP
                        };
                        PostMessageW(target_hwnd, msg_up, 0, lparam);
                    }
                }
                "up" => {
                    let msg_up = if payload.button == "right" {
                        WM_RBUTTONUP
                    } else {
                        WM_LBUTTONUP
                    };
                    PostMessageW(target_hwnd, msg_up, 0, lparam);
                }
                _ => {}
            }
        }

        return Ok(Json(serde_json::json!({ "success": true })));
    }

    Err((StatusCode::NOT_FOUND, "No target HWND to inject input".to_string()))
}

async fn get_screenshot(State(state): State<AppState>) -> Result<Response, (StatusCode, String)> {
    let hwnd_opt = {
        let mut lock = state.current_session.lock().unwrap();
        if let Some(session) = lock.as_mut() {
            #[cfg(target_os = "windows")]
            {
                let is_valid = session.hwnd.map(|h| unsafe { IsWindow(h as HWND) != 0 }).unwrap_or(false);
                if !is_valid {
                    if let Some(found) = find_window_for_pid(session.process_id, &session.name) {
                        let hwnd_ptr = found as HWND;
                        if session.is_offscreen {
                            unsafe {
                                let ex_style = GetWindowLongPtrW(hwnd_ptr, GWL_EXSTYLE);
                                let new_style = (ex_style | WS_EX_TOOLWINDOW as isize) & !(WS_EX_APPWINDOW as isize);
                                SetWindowLongPtrW(hwnd_ptr, GWL_EXSTYLE, new_style);
                                SetWindowPos(
                                    hwnd_ptr,
                                    HWND_TOP,
                                    0,
                                    0,
                                    1920,
                                    1080,
                                    SWP_NOACTIVATE | SWP_NOZORDER | SWP_SHOWWINDOW,
                                );
                            }
                        }
                        session.hwnd = Some(found);
                    }
                }
            }
            session.hwnd
        } else {
            None
        }
    };

    #[cfg(target_os = "windows")]
    if let Some(h) = hwnd_opt {
        let hwnd_ptr = h as HWND;
        let jpeg_bytes = capture_window_jpeg(hwnd_ptr)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Capture failed: {}", e)))?;

        let mut res = Response::new(Body::from(jpeg_bytes));
        res.headers_mut().insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("image/jpeg"),
        );
        res.headers_mut().insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-store, no-cache, must-revalidate"),
        );
        return Ok(res);
    }

    Err((StatusCode::NOT_FOUND, "No active window to capture".to_string()))
}

#[cfg(target_os = "windows")]
fn capture_window_jpeg(hwnd: HWND) -> Result<Vec<u8>, String> {
    unsafe {
        if IsWindow(hwnd) == 0 {
            return Err("Target window is invalid".to_string());
        }

        let mut rect = RECT {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
        };
        GetClientRect(hwnd, &mut rect);

        let width = (rect.right - rect.left).max(1);
        let height = (rect.bottom - rect.top).max(1);

        let hdc_window = GetDC(hwnd);
        if hdc_window.is_null() {
            return Err("Failed to get window DC".to_string());
        }

        let hdc_mem = CreateCompatibleDC(hdc_window);
        let hbm = CreateCompatibleBitmap(hdc_window, width, height);
        let old_bm = SelectObject(hdc_mem, hbm);

        // PrintWindow with PW_RENDERFULLCONTENT (2) or full window (0) or PW_CLIENTONLY (1)
        let mut printed = PrintWindow(hwnd, hdc_mem, 2);
        if printed == 0 {
            printed = PrintWindow(hwnd, hdc_mem, 0);
        }
        if printed == 0 {
            printed = PrintWindow(hwnd, hdc_mem, 1);
        }
        if printed == 0 {
            BitBlt(hdc_mem, 0, 0, width, height, hdc_window, 0, 0, SRCCOPY);
        }

        let mut bmi: BITMAPINFO = std::mem::zeroed();
        bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        bmi.bmiHeader.biWidth = width;
        bmi.bmiHeader.biHeight = -height; // Top-down
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB;

        let mut raw_pixels = vec![0u8; (width * height * 4) as usize];
        GetDIBits(
            hdc_mem,
            hbm,
            0,
            height as u32,
            raw_pixels.as_mut_ptr() as _,
            &mut bmi,
            DIB_RGB_COLORS,
        );

        // Cleanup GDI objects
        SelectObject(hdc_mem, old_bm);
        DeleteObject(hbm);
        DeleteDC(hdc_mem);
        ReleaseDC(hwnd, hdc_window);

        // Convert BGRA to RGB and encode to JPEG
        let mut rgb_pixels = Vec::with_capacity((width * height * 3) as usize);
        for chunk in raw_pixels.chunks_exact(4) {
            rgb_pixels.push(chunk[2]); // R
            rgb_pixels.push(chunk[1]); // G
            rgb_pixels.push(chunk[0]); // B
        }

        let img = image::RgbImage::from_raw(width as u32, height as u32, rgb_pixels)
            .ok_or_else(|| "Failed to construct ImageBuffer".to_string())?;

        let mut jpeg_buf = Cursor::new(Vec::new());
        img.write_to(&mut jpeg_buf, image::ImageFormat::Jpeg)
            .map_err(|e| format!("JPEG encode failed: {}", e))?;

        Ok(jpeg_buf.into_inner())
    }
}

#[cfg(target_os = "windows")]
fn find_window_for_pid(target_pid: u32, target_stem: &str) -> Option<isize> {
    struct EnumData {
        target_pid: u32,
        target_stem: String,
        found_hwnd: Option<isize>,
    }

    unsafe extern "system" fn enum_windows_callback(hwnd: HWND, lparam: LPARAM) -> i32 {
        let data = &mut *(lparam as *mut EnumData);
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);

        let mut title_buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), 512);
        let title = if len > 0 {
            String::from_utf16_lossy(&title_buf[..len as usize])
        } else {
            String::new()
        };

        let mut matches = pid == data.target_pid;
        if !matches && !data.target_stem.is_empty() {
            let stem_clean = data.target_stem.replace("-", " ").replace("_", " ").to_lowercase();
            let title_clean = title.replace("-", " ").replace("_", " ").to_lowercase();
            if title_clean.contains(&stem_clean) || stem_clean.split_whitespace().any(|word| word.len() > 3 && title_clean.contains(word)) {
                matches = true;
            }
        }

        if matches {
            let mut rect = RECT {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
            };
            GetClientRect(hwnd, &mut rect);
            let width = rect.right - rect.left;
            let height = rect.bottom - rect.top;

            // Check if it's a visible root window (> 50x50)
            if width > 50 && height > 50 {
                data.found_hwnd = Some(hwnd as isize);
                return 0; // Stop enumeration
            }
        }
        1 // Continue
    }

    let mut data = EnumData {
        target_pid,
        target_stem: target_stem.to_string(),
        found_hwnd: None,
    };

    unsafe {
        EnumWindows(
            Some(enum_windows_callback),
            &mut data as *mut EnumData as LPARAM,
        );
    }

    data.found_hwnd
}
