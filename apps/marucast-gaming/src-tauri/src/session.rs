use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::thread::{sleep, spawn};
use std::time::Duration;

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, VK_MENU,
};
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::WindowsAndMessaging::{
    FindWindowW, GetForegroundWindow, GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN,
};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSession {
    pub session_id: String,
    pub package_name: String,
    pub app_name: String,
    pub device_serial: String,
    pub audio_mode: String, // "phone" | "pc" | "both"
    pub is_running: bool,
}

pub struct SessionManager {
    sessions: Arc<Mutex<HashMap<String, Child>>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Finds the scrcpy executable in LocalAppData or system PATH
    fn get_scrcpy_path() -> Result<PathBuf, String> {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let p = PathBuf::from(local_app_data)
                .join("scrcpy")
                .join("scrcpy-win64-v4.1")
                .join("scrcpy.exe");
            if p.exists() {
                return Ok(p);
            }
        }

        // Check PATH
        if let Ok(output) = Command::new("where.exe").arg("scrcpy").output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Some(first_line) = stdout.lines().next() {
                    return Ok(PathBuf::from(first_line.trim()));
                }
            }
        }

        Err("scrcpy.exe not found. Please install scrcpy in %LOCALAPPDATA%\\scrcpy.".to_string())
    }

    /// Launches an off-screen app session in fixed borderless fullscreen (Alt-Tab friendly, Alt+Q to close)
    pub fn launch_session(
        &self,
        device: &str,
        package_name: &str,
        app_name: &str,
        audio_mode: &str, // "phone", "pc", "both"
        dpi: Option<i32>,
    ) -> Result<AppSession, String> {
        let scrcpy_path = Self::get_scrcpy_path()?;
        let session_id = format!("{}_{}", package_name, std::time::SystemTime::now().elapsed().unwrap_or_default().as_millis());
        let window_title = format!("{} - Marucast for Gaming", app_name);
        let target_dpi = dpi.unwrap_or(240);

        // 1. Wake up device compositor & dismiss keyguard if asleep
        let _ = Command::new("adb")
            .args(&["-s", device, "shell", "input", "keyevent", "KEYCODE_WAKEUP"])
            .output();

        let mut cmd = Command::new(scrcpy_path);

        #[cfg(target_os = "windows")]
        let (screen_w, screen_h) = unsafe {
            let w = GetSystemMetrics(SM_CXSCREEN);
            let h = GetSystemMetrics(SM_CYSCREEN);
            if w > 0 && h > 0 { (w, h) } else { (1920, 1080) }
        };
        #[cfg(not(target_os = "windows"))]
        let (screen_w, screen_h) = (1920, 1080);

        // 2. High-Performance Borderless Display (Customizable Density):
        cmd.arg(format!("--tcpip={}", device))
            .arg(format!("--new-display={}x{}/{}", screen_w, screen_h, target_dpi))
            .arg("--fullscreen")
            .arg("--window-borderless")
            .arg("--no-vd-system-decorations")
            .arg(format!("--start-app=+{}", package_name))
            .arg(format!("--window-title={}", window_title))
            .arg("--video-codec=h265") // Hardware HEVC on Samsung Exynos
            .arg("--video-bit-rate=24M") // High bitrate 24Mbps pristine stream
            .arg("--max-fps=60") // Smooth 60 FPS
            .arg("--video-buffer=0") // 0ms buffer delay (zero latency)
            .arg("--audio-buffer=20") // 20ms low latency audio buffer
            .arg("--stay-awake") // Keeps Android GPU compositor awake
            .arg("--turn-screen-off") // Turns off physical phone screen to save power
            .arg("--legacy-paste"); // 2-way clipboard injection

        // 3. Audio routing configuration
        match audio_mode {
            "phone" => {
                cmd.arg("--no-audio");
            }
            "both" => {
                cmd.arg("--audio-source=playback").arg("--audio-dup");
            }
            "pc" | _ => {
                cmd.arg("--audio-source=output");
            }
        }

        let child = cmd.spawn().map_err(|e| format!("Failed to spawn scrcpy session: {}", e))?;

        let mut lock = self.sessions.lock().unwrap();
        lock.insert(session_id.clone(), child);

        // Spawn background supervisor to listen for Alt+Q / Alt+F4 and monitor lifecycle
        let sessions_clone = self.sessions.clone();
        let session_id_clone = session_id.clone();
        let device_clone = device.to_string();
        let pkg_clone = package_name.to_string();
        let title_clone = window_title.clone();

        spawn(move || {
            let mut target_hwnd = std::ptr::null_mut();

            // Find HWND
            for _ in 0..20 {
                sleep(Duration::from_millis(150));

                #[cfg(target_os = "windows")]
                {
                    use std::ffi::OsStr;
                    use std::os::windows::ffi::OsStrExt;
                    let wide_title: Vec<u16> = OsStr::new(&title_clone)
                        .encode_wide()
                        .chain(std::iter::once(0))
                        .collect();

                    unsafe {
                        let hwnd = FindWindowW(std::ptr::null(), wide_title.as_ptr());
                        if !hwnd.is_null() {
                            target_hwnd = hwnd;
                            break;
                        }
                    }
                }
            }

            let mut loop_counter = 0;

            loop {
                sleep(Duration::from_millis(50));
                loop_counter += 1;

                // 1. Alt+Q Close Shortcut Detection
                #[cfg(target_os = "windows")]
                {
                    if !target_hwnd.is_null() {
                        unsafe {
                            let fg = GetForegroundWindow();
                            if fg == target_hwnd {
                                let alt_down = (GetAsyncKeyState(VK_MENU as i32) as u16 & 0x8000) != 0;
                                let q_down = (GetAsyncKeyState(b'Q' as i32) as u16 & 0x8000) != 0;

                                if alt_down && q_down {
                                    println!("[Supervisor] Alt+Q pressed. Closing fullscreen cast window.");
                                    let mut lock = sessions_clone.lock().unwrap();
                                    if let Some(mut child) = lock.remove(&session_id_clone) {
                                        let _ = child.kill();
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }

                // 2. Periodic app focus check every ~1.5s
                if loop_counter % 30 == 0 {
                    let output = Command::new("adb")
                        .args(&["-s", &device_clone, "shell", "dumpsys", "window", "windows"])
                        .output();

                    if let Ok(out) = output {
                        let text = String::from_utf8_lossy(&out.stdout);
                        
                        // If scrcpy window closed by user
                        let mut lock = sessions_clone.lock().unwrap();
                        if let Some(child) = lock.get_mut(&session_id_clone) {
                            if let Ok(Some(_)) = child.try_wait() {
                                lock.remove(&session_id_clone);
                                break;
                            }
                        } else {
                            break;
                        }

                        // Check if current focused window belongs to app
                        let has_focus = text.lines().any(|l| {
                            l.contains("mCurrentFocus") && l.contains(&pkg_clone)
                        });

                        let is_launcher_focused = text.lines().any(|l| {
                            l.contains("mCurrentFocus") && (l.contains("launcher") || l.contains("SecDesktopLauncher"))
                        });

                        if is_launcher_focused && !has_focus {
                            println!("[Supervisor] App {} exited. Closing session window.", pkg_clone);
                            if let Some(mut child) = lock.remove(&session_id_clone) {
                                let _ = child.kill();
                            }
                            break;
                        }
                    }
                }
            }
        });

        Ok(AppSession {
            session_id,
            package_name: package_name.to_string(),
            app_name: app_name.to_string(),
            device_serial: device.to_string(),
            audio_mode: audio_mode.to_string(),
            is_running: true,
        })
    }

    /// Stops a running app session
    pub fn stop_session(&self, session_id: &str) -> Result<bool, String> {
        let mut lock = self.sessions.lock().unwrap();
        if let Some(mut child) = lock.remove(session_id) {
            child.kill().map_err(|e| format!("Failed to stop session: {}", e))?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Injects an Android Back keyevent (Shift+Space mapping)
    pub fn send_back_key(device: &str) -> Result<(), String> {
        Command::new("adb")
            .args(&["-s", device, "shell", "input", "keyevent", "KEYCODE_BACK"])
            .output()
            .map_err(|e| format!("Failed to send back keyevent: {}", e))?;
        Ok(())
    }
}
