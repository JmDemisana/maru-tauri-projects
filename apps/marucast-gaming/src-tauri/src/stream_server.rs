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
    path::{Path, PathBuf},
    process::Command,
    sync::{Arc, Mutex},
    time::Duration,
};
use tower_http::cors::{Any, CorsLayer};

#[cfg(target_os = "windows")]
use windows_sys::Win32::{
    Foundation::{CloseHandle, HWND, INVALID_HANDLE_VALUE, LPARAM, RECT},
    Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
        GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        SRCCOPY,
    },
    UI::WindowsAndMessaging::{
        EnumWindows, GetClientRect, GetWindowLongPtrW, GetWindowTextW,
        GetWindowThreadProcessId, IsWindow, PostMessageW, SetWindowLongPtrW, SetWindowPos,
        GWL_EXSTYLE, HWND_TOP, SWP_NOACTIVATE, SWP_NOZORDER, SWP_SHOWWINDOW, WM_LBUTTONDOWN,
        WM_LBUTTONUP, WM_MOUSEMOVE, WM_RBUTTONDOWN, WM_RBUTTONUP, WS_EX_APPWINDOW,
        WS_EX_TOOLWINDOW,
    },
    System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    },
};

#[cfg(target_os = "windows")]
extern "system" {
    fn PrintWindow(hwnd: HWND, hdcBlt: windows_sys::Win32::Graphics::Gdi::HDC, nFlags: u32) -> i32;
}

const MK_LBUTTON: usize = 0x0001;
const MK_RBUTTON: usize = 0x0002;

#[derive(Clone)]
pub struct ServerState {
    pub current_session: Arc<Mutex<Option<ActiveSession>>>,
    #[cfg(target_os = "windows")]
    pub loopback: Arc<crate::audio::LoopbackCapture>,
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
    #[serde(default)]
    pub vdd_active: bool,
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

pub fn spawn_server_background() {
    std::thread::spawn(|| {
        let rt = match tokio::runtime::Runtime::new() {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[Marucast Desktop Server] Failed to create Tokio runtime: {}", e);
                return;
            }
        };

        rt.block_on(async {
            #[cfg(target_os = "windows")]
            let loopback = {
                let lb = crate::audio::start_loopback_capture();
                lb.start();
                lb
            };

            let state = ServerState {
                current_session: Arc::new(Mutex::new(None)),
                #[cfg(target_os = "windows")]
                loopback,
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
                .route("/api/stream", get(get_mjpeg_stream))
                .route("/api/audio", get(get_audio_stream))
                .layer(cors)
                .with_state(state);

            let addr = "0.0.0.0:48792";
            println!("[Marucast Desktop Server] Streaming server online on {}", addr);

            if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
                let _ = axum::serve(listener, app).await;
            } else {
                eprintln!("[Marucast Desktop Server] Failed to bind to {}", addr);
            }
        });
    });
}

async fn get_status(State(state): State<ServerState>) -> Json<serde_json::Value> {
    let session = state.current_session.lock().unwrap().clone();
    let hostname = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "Windows PC".to_string());

    Json(serde_json::json!({
        "status": "online",
        "service": "Marucast for Gaming Desktop",
        "version": "2.0.0",
        "hostname": hostname,
        "active_session": session
    }))
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

async fn get_running_windows() -> Json<Vec<RunningWindowItem>> {
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
        return Json(data.windows);
    }

    #[cfg(not(target_os = "windows"))]
    Json(Vec::new())
}

async fn hook_window(
    State(state): State<ServerState>,
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

        if let Some(target_display) = crate::virtual_display::get_stream_target_display() {
            SetWindowPos(
                hwnd_ptr,
                HWND_TOP,
                target_display.left,
                target_display.top,
                target_display.width,
                target_display.height,
                SWP_NOACTIVATE | SWP_SHOWWINDOW,
            );
        } else {
            let target = get_stream_target_display_or_primary();
            SetWindowPos(
                hwnd_ptr,
                HWND_TOP,
                target.left,
                target.top,
                target.width,
                target.height,
                SWP_NOACTIVATE | SWP_SHOWWINDOW,
            );
        }

        let session = ActiveSession {
            process_id: pid,
            path: String::new(),
            name: title,
            is_japanese_locale: false,
            is_admin: false,
            is_offscreen: payload.offscreen,
            hwnd: Some(payload.hwnd),
            vdd_active: false,
        };

        *state.current_session.lock().unwrap() = Some(session.clone());
        return Ok(Json(session));
    }

    #[cfg(not(target_os = "windows"))]
    Err((StatusCode::NOT_IMPLEMENTED, "Windows only".to_string()))
}

async fn scan_directory(Query(query): Query<ScanQuery>) -> Json<Vec<ExecutableItem>> {
    let target_dir = query
        .dir
        .unwrap_or_else(|| "D:\\Games\\Visual Novels".to_string());
    let path = PathBuf::from(&target_dir);

    let mut items = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&path) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            if path.is_dir() {
                let has_exe = std::fs::read_dir(&path)
                    .map(|mut r| {
                        r.any(|e| {
                            e.map(|sub| {
                                sub.path()
                                    .extension()
                                    .map(|ext| ext.eq_ignore_ascii_case("exe"))
                                    .unwrap_or(false)
                            })
                            .unwrap_or(false)
                        })
                    })
                    .unwrap_or(false);

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
    State(state): State<ServerState>,
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

    // 1b. Ensure a virtual display exists for streaming
    let mut vdd_active = false;
    #[cfg(target_os = "windows")]
    {
        let has_secondary = crate::virtual_display::get_stream_target_display().is_some();
        if !has_secondary {
            match crate::vdd::ensure_and_create() {
                Ok(_) => {
                    eprintln!("[Marucast] Virtual display created via VDD");
                    vdd_active = true;
                }
                Err(e) => {
                    eprintln!("[Marucast] VDD failed: {}, falling back to primary monitor", e);
                }
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
            c.env("LANG", "ja_JP.UTF-8");
            c.env("LC_ALL", "ja_JP.UTF-8");
        }
        c
    };

    let child = cmd
        .spawn()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to spawn process: {}", e)))?;

    let pid = child.id();

    // 3. Hook HWND
    let mut hwnd = None;
    #[cfg(target_os = "windows")]
    {
        for _ in 0..12 {
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

                let target = get_stream_target_display_or_primary();
                SetWindowPos(
                    hwnd_ptr,
                    HWND_TOP,
                    target.left,
                    target.top,
                    target.width,
                    target.height,
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
        vdd_active,
    };

    *state.current_session.lock().unwrap() = Some(session.clone());

    #[cfg(target_os = "windows")]
    crate::audio::mute_pc_audio();

    Ok(Json(session))
}

async fn stop_app(State(state): State<ServerState>) -> Json<serde_json::Value> {
    let mut lock = state.current_session.lock().unwrap();
    if let Some(session) = lock.take() {
        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(["/F", "/PID", &session.process_id.to_string()])
                .output();
            crate::audio::unmute_pc_audio();

            if session.vdd_active {
                match crate::vdd::destroy_virtual_display() {
                    Ok(_) => eprintln!("[Marucast] Virtual display destroyed"),
                    Err(e) => eprintln!("[Marucast] VDD destroy failed: {}", e),
                }
            }
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
    State(state): State<ServerState>,
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

            let (target_hwnd, final_pt) = get_deepest_child(hwnd_ptr, initial_pt);
            let lparam: isize = (((final_pt.y as u32 & 0xFFFF) << 16) | (final_pt.x as u32 & 0xFFFF)) as isize;

            if payload.event_type == "key" {
                let vk: usize = match payload.key.to_lowercase().as_str() {
                    "space" => 0x20,
                    "enter" | "return" => 0x0D,
                    "escape" | "esc" => 0x1B,
                    "tab" => 0x09,
                    "backspace" => 0x08,
                    "ctrl" | "control" => 0x11,
                    "shift" => 0x10,
                    "alt" | "menu" => 0x12,
                    "f11" => 0x7A,
                    "pageup" => 0x21,
                    "pagedown" => 0x22,
                    "up" => 0x26,
                    "down" => 0x28,
                    "left" => 0x25,
                    "right" => 0x27,
                    "home" => 0x24,
                    "end" => 0x23,
                    "delete" | "del" => 0x2E,
                    "insert" | "ins" => 0x2D,
                    "a" => 0x41, "b" => 0x42, "c" => 0x43, "d" => 0x44,
                    "e" => 0x45, "f" => 0x46, "g" => 0x47, "h" => 0x48,
                    "i" => 0x49, "j" => 0x4A, "k" => 0x4B, "l" => 0x4C,
                    "m" => 0x4D, "n" => 0x4E, "o" => 0x4F, "p" => 0x50,
                    "q" => 0x51, "r" => 0x52, "s" => 0x53, "t" => 0x54,
                    "u" => 0x55, "v" => 0x56, "w" => 0x57, "x" => 0x58,
                    "y" => 0x59, "z" => 0x5A,
                    "0" => 0x30, "1" => 0x31, "2" => 0x32, "3" => 0x33,
                    "4" => 0x34, "5" => 0x35, "6" => 0x36, "7" => 0x37,
                    "8" => 0x38, "9" => 0x39,
                    _ => 0,
                };
                if vk != 0 {
                    PostMessageW(target_hwnd, 0x0100, vk, 0);
                    PostMessageW(target_hwnd, 0x0101, vk, 0);
                }
                return Ok(Json(serde_json::json!({ "success": true })));
            }

            match payload.event_type.as_str() {
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

/// MJPEG stream — one persistent HTTP connection, frames pushed at target FPS.
/// Android connects once and reads frames continuously, no per-frame round-trip.
async fn get_mjpeg_stream(State(state): State<ServerState>) -> Response {
    use axum::body::Body;
    use tokio_stream::wrappers::ReceiverStream;

    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Vec<u8>, std::io::Error>>(4);

    let state_clone = state.clone();
    tokio::spawn(async move {
        let boundary = b"--mjpegboundary\r\n";
        loop {
            let hwnd_opt = {
                let mut lock = state_clone.current_session.lock().unwrap();
                if let Some(session) = lock.as_mut() {
                    let is_valid = session.hwnd.map(|h| unsafe { IsWindow(h as HWND) != 0 }).unwrap_or(false);
                    if !is_valid {
                        if let Some(found) = find_window_for_pid(session.process_id, &session.name) {
                            session.hwnd = Some(found);
                            let target = get_stream_target_display_or_primary();
                            unsafe {
                                SetWindowPos(
                                    found as HWND, HWND_TOP, target.left, target.top,
                                    target.width, target.height,
                                    SWP_NOACTIVATE | SWP_NOZORDER | SWP_SHOWWINDOW,
                                );
                            }
                        }
                    }
                    session.hwnd
                } else {
                    None
                }
            };

            #[cfg(target_os = "windows")]
            if let Ok(jpeg) = capture_frame_jpeg(hwnd_opt) {
                let header = format!(
                    "--mjpegboundary\r\nContent-Type: image/jpeg\r\nContent-Length: {}\r\n\r\n",
                    jpeg.len()
                );
                let mut chunk = header.into_bytes();
                chunk.extend_from_slice(&jpeg);
                chunk.extend_from_slice(b"\r\n");
                if tx.send(Ok(chunk)).await.is_err() {
                    break; // client disconnected
                }
            } else {
                // No active session — send a small keepalive comment
                let _ = tx.send(Ok(b"--mjpegboundary\r\n\r\n".to_vec())).await;
            }

            // Target ~30 FPS
            tokio::time::sleep(Duration::from_millis(33)).await;
        }
        let _ = boundary; // suppress unused warning
    });

    let stream = ReceiverStream::new(rx);
    let body = Body::from_stream(stream);
    let mut res = Response::new(body);
    res.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("multipart/x-mixed-replace; boundary=mjpegboundary"),
    );
    res.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-store, no-cache, must-revalidate"),
    );
    res.headers_mut().insert(
        header::CONNECTION,
        HeaderValue::from_static("keep-alive"),
    );
    res
}

/// Raw PCM audio stream — Android reads interleaved f32 samples.
async fn get_audio_stream(State(state): State<ServerState>) -> Response {
    use axum::body::Body;
    use tokio_stream::wrappers::ReceiverStream;

    #[cfg(target_os = "windows")]
    {
        let (tx, rx) = tokio::sync::mpsc::channel::<Result<Vec<u8>, std::io::Error>>(8);
        let loopback = state.loopback.clone();

        tokio::spawn(async move {
            let sample_rate = loopback.sample_rate();
            let channels = loopback.channels();
            let mut header = sample_rate.to_le_bytes().to_vec();
            header.extend_from_slice(&channels.to_le_bytes());
            if tx.send(Ok(header)).await.is_err() { return; }

            loop {
                let samples = loopback.drain_samples(4800);
                if samples.is_empty() {
                    let silence = vec![0u8; 4800 * 4];
                    if tx.send(Ok(silence)).await.is_err() { break; }
                } else {
                    let mut buf = Vec::with_capacity(samples.len() * 4);
                    for s in &samples {
                        buf.extend_from_slice(&s.to_le_bytes());
                    }
                    if tx.send(Ok(buf)).await.is_err() { break; }
                }
                tokio::time::sleep(Duration::from_millis(50)).await;
            }
        });

        let stream = ReceiverStream::new(rx);
        let body = Body::from_stream(stream);
        let mut res = Response::new(body);
        res.headers_mut().insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/octet-stream"),
        );
        res.headers_mut().insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-store, no-cache, must-revalidate"),
        );
        res.headers_mut().insert(
            header::CONNECTION,
            HeaderValue::from_static("keep-alive"),
        );
        return res;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let mut res = Response::new(Body::empty());
        *res.status_mut() = StatusCode::NOT_FOUND;
        res
    }
}

async fn get_screenshot(State(state): State<ServerState>) -> Result<Response, (StatusCode, String)> {
    let hwnd_opt = {
        let mut lock = state.current_session.lock().unwrap();
        if let Some(session) = lock.as_mut() {
            #[cfg(target_os = "windows")]
            {
                let is_valid = session.hwnd.map(|h| unsafe { IsWindow(h as HWND) != 0 }).unwrap_or(false);
                if !is_valid {
                    if let Some(found) = find_window_for_pid(session.process_id, &session.name) {
                        let target = get_stream_target_display_or_primary();
                        unsafe {
                            SetWindowPos(
                                found as HWND,
                                HWND_TOP,
                                target.left,
                                target.top,
                                target.width,
                                target.height,
                                SWP_NOACTIVATE | SWP_SHOWWINDOW,
                            );
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
    {
        let jpeg_bytes = capture_frame_jpeg(hwnd_opt)
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

    #[cfg(not(target_os = "windows"))]
    Err((StatusCode::NOT_FOUND, "Windows only".to_string()))
}

#[cfg(target_os = "windows")]
fn capture_frame_jpeg(hwnd_opt: Option<isize>) -> Result<Vec<u8>, String> {
    // 1. If a secondary / virtual display exists, capture the dedicated monitor output directly
    if let Some(disp) = crate::virtual_display::get_stream_target_display() {
        return capture_display_jpeg(disp.left, disp.top, disp.width, disp.height);
    }

    // 2. Otherwise capture the hooked window
    if let Some(h) = hwnd_opt {
        return capture_window_jpeg(h as HWND);
    }

    Err("No active window or secondary display to capture".to_string())
}

#[cfg(target_os = "windows")]
fn capture_display_jpeg(left: i32, top: i32, width: i32, height: i32) -> Result<Vec<u8>, String> {
    unsafe {
        let hdc_screen = GetDC(0 as HWND);
        if hdc_screen.is_null() {
            return Err("Failed to get Screen DC".to_string());
        }

        let hdc_mem = CreateCompatibleDC(hdc_screen);
        let hbm = CreateCompatibleBitmap(hdc_screen, width, height);
        let old_bm = SelectObject(hdc_mem, hbm);

        BitBlt(hdc_mem, 0, 0, width, height, hdc_screen, left, top, SRCCOPY);

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

        SelectObject(hdc_mem, old_bm);
        DeleteObject(hbm);
        DeleteDC(hdc_mem);
        ReleaseDC(0 as HWND, hdc_screen);

        let mut rgb_pixels = Vec::with_capacity((width * height * 3) as usize);
        for pixel in raw_pixels.chunks_exact(4) {
            rgb_pixels.extend_from_slice(&[pixel[2], pixel[1], pixel[0]]);
        }

        let mut jpeg_buf = Vec::with_capacity((width * height) as usize / 4);
        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_buf, 65);
        encoder
            .encode(&rgb_pixels, width as u32, height as u32, image::ExtendedColorType::Rgb8)
            .map_err(|e| format!("JPEG encode failed: {}", e))?;

        Ok(jpeg_buf)
    }
}

#[cfg(target_os = "windows")]
fn capture_window_jpeg(hwnd: HWND) -> Result<Vec<u8>, String> {
    unsafe {
        if IsWindow(hwnd) == 0 {
            return Err("Target window is invalid".to_string());
        }

        let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
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
        bmi.bmiHeader.biHeight = -height;
        bmi.bmiHeader.biPlanes = 1;
        bmi.bmiHeader.biBitCount = 32;
        bmi.bmiHeader.biCompression = BI_RGB;

        let mut raw_pixels = vec![0u8; (width * height * 4) as usize];
        GetDIBits(hdc_mem, hbm, 0, height as u32, raw_pixels.as_mut_ptr() as _, &mut bmi, DIB_RGB_COLORS);

        SelectObject(hdc_mem, old_bm);
        DeleteObject(hbm);
        DeleteDC(hdc_mem);
        ReleaseDC(hwnd, hdc_window);

        let mut rgb_pixels = Vec::with_capacity((width * height * 3) as usize);
        for pixel in raw_pixels.chunks_exact(4) {
            rgb_pixels.extend_from_slice(&[pixel[2], pixel[1], pixel[0]]);
        }

        let mut jpeg_buf = Vec::with_capacity(32 * 1024);
        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_buf, 65);
        encoder
            .encode(&rgb_pixels, width as u32, height as u32, image::ExtendedColorType::Rgb8)
            .map_err(|e| format!("JPEG encode failed: {}", e))?;

        Ok(jpeg_buf)
    }
}

/// Finds the target display for streaming. Prefers secondary/virtual display.
/// Falls back to primary monitor so capture always works.
fn get_stream_target_display_or_primary() -> crate::virtual_display::DisplayInfo {
    crate::virtual_display::get_stream_target_display()
        .unwrap_or_else(|| {
            let displays = crate::virtual_display::get_all_displays();
            displays.into_iter().find(|d| d.is_primary).unwrap_or(crate::virtual_display::DisplayInfo {
                name: "Primary".to_string(),
                left: 0, top: 0, width: 1920, height: 1080, is_primary: true,
            })
        })
}

#[cfg(target_os = "windows")]
fn find_window_for_pid(target_pid: u32, target_stem: &str) -> Option<isize> {
    struct EnumData {
        target_pids: Vec<u32>,
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

        let mut matches = data.target_pids.contains(&pid);
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
        target_pids: process_tree_pids(target_pid),
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

/// Many visual novels use a small launcher that starts the real game in a child
/// process. Track that whole process tree so the live stream follows the actual
/// game window rather than the launcher that has already exited.
#[cfg(target_os = "windows")]
fn process_tree_pids(root_pid: u32) -> Vec<u32> {
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return vec![root_pid];
        }

        let mut entries = Vec::new();
        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                entries.push((entry.th32ProcessID, entry.th32ParentProcessID));
                entry = std::mem::zeroed();
                entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }
        CloseHandle(snapshot);

        let mut pids = vec![root_pid];
        let mut index = 0;
        while index < pids.len() {
            let parent = pids[index];
            for (pid, parent_pid) in &entries {
                if *parent_pid == parent && !pids.contains(pid) {
                    pids.push(*pid);
                }
            }
            index += 1;
        }
        pids
    }
}
