use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
fn hide_command_window(command: &mut std::process::Command) -> &mut std::process::Command {
    command.creation_flags(CREATE_NO_WINDOW)
}

#[cfg(not(target_os = "windows"))]
fn hide_command_window(command: &mut std::process::Command) -> &mut std::process::Command {
    command
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannerDeviceInfo {
    pub id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub has_feeder: bool,
    pub has_flatbed: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanOptions {
    pub device_id: Option<String>,
    pub device_name: Option<String>,
    pub source: String,       // "Flatbed" | "Feeder"
    pub color_mode: String,   // "Color" | "Gray" | "Text"
    pub dpi: u32,             // 100, 150, 200, 300, 600
    pub format: String,       // "PNG" | "JPEG" | "BMP"
    pub precrop: String,      // "Entire" | "Folio" | "Letter" | "A4" | "HalfLetter" | "Custom"
    pub custom_width_inches: Option<f64>,
    pub custom_height_inches: Option<f64>,
    pub out_dir: Option<String>,
    pub file_name_prefix: Option<String>,
    pub show_dialog: Option<bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CropRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedBatchItem {
    pub page_number: Option<u32>,
    pub file_path: String,
    pub file_name: String,
    pub preview_path: Option<String>,
    pub thumb_path: Option<String>,
    pub width: u32,
    pub height: u32,
    pub dpi: u32,
    pub color_mode: String,
    pub precrop: String,
    pub source: String,
    pub crop_rect: Option<CropRect>,
    pub full_flatbed_preserved: Option<bool>,
    pub preview_base64: Option<String>,
    pub thumb_base64: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanPageResult {
    pub ok: bool,
    pub file_path: Option<String>,
    pub file_name: Option<String>,
    pub preview_path: Option<String>,
    pub thumb_path: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub dpi: Option<u32>,
    pub color_mode: Option<String>,
    pub precrop: Option<String>,
    pub source: Option<String>,
    pub crop_rect: Option<CropRect>,
    pub full_flatbed_preserved: Option<bool>,
    pub preview_base64: Option<String>,
    pub thumb_base64: Option<String>,
    pub pages: Option<Vec<ScannedBatchItem>>,
    pub error: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchivePage {
    pub file_name: String,
    pub page_number: u32,
    pub width: u32,
    pub height: u32,
    pub dpi: u32,
    pub preview_base64: String,
    pub thumb_base64: String,
    pub ocr_text: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveLoadResult {
    pub ok: bool,
    pub manifest_raw: Option<String>,
    pub pages: Vec<ArchivePage>,
    pub error: Option<String>,
}

fn get_scripts_dir() -> PathBuf {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    // Try adjacent to binary first (installed app or debug target)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let candidate1 = exe_dir.join("scripts").join("scanner-backend.ps1");
            if candidate1.exists() {
                return exe_dir.join("scripts");
            }
            let candidate2 = exe_dir.join("resources").join("scripts").join("scanner-backend.ps1");
            if candidate2.exists() {
                return exe_dir.join("resources").join("scripts");
            }
            let candidate3 = exe_dir.join("_up_").join("scripts").join("scanner-backend.ps1");
            if candidate3.exists() {
                return candidate3.parent().unwrap().to_path_buf();
            }
        }
    }
    // Check cwd
    let dev_path = cwd.join("src-tauri").join("scripts").join("scanner-backend.ps1");
    if dev_path.exists() {
        return cwd.join("src-tauri").join("scripts");
    }
    // Fallback to hardcoded project path
    PathBuf::from(r"D:\projects\maru-tauri-projects\apps\maru-scanner\src-tauri\scripts")
}

fn to_base64_data_uri(path_str: &str, mime: &str) -> Option<String> {
    let p = Path::new(path_str);
    if !p.exists() {
        return None;
    }
    match std::fs::read(p) {
        Ok(bytes) => {
            let b64 = base64_encode(&bytes);
            Some(format!("data:{};base64,{}", mime, b64))
        }
        Err(_) => None,
    }
}

// Lightweight standard base64 encoder without pulling external crates
fn base64_encode(input: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((input.len() + 2) / 3 * 4);
    let mut chunks = input.chunks_exact(3);
    for chunk in &mut chunks {
        let n = ((chunk[0] as u32) << 16) | ((chunk[1] as u32) << 8) | (chunk[2] as u32);
        out.push(CHARSET[((n >> 18) & 63) as usize] as char);
        out.push(CHARSET[((n >> 12) & 63) as usize] as char);
        out.push(CHARSET[((n >> 6) & 63) as usize] as char);
        out.push(CHARSET[(n & 63) as usize] as char);
    }
    let rem = chunks.remainder();
    if rem.len() == 1 {
        let n = (rem[0] as u32) << 16;
        out.push(CHARSET[((n >> 18) & 63) as usize] as char);
        out.push(CHARSET[((n >> 12) & 63) as usize] as char);
        out.push('=');
        out.push('=');
    } else if rem.len() == 2 {
        let n = ((rem[0] as u32) << 16) | ((rem[1] as u32) << 8);
        out.push(CHARSET[((n >> 18) & 63) as usize] as char);
        out.push(CHARSET[((n >> 12) & 63) as usize] as char);
        out.push(CHARSET[((n >> 6) & 63) as usize] as char);
        out.push('=');
    }
    out
}

#[tauri::command]
async fn list_scanners() -> Result<Vec<ScannerDeviceInfo>, String> {
    tokio::task::spawn_blocking(move || {
        let script = get_scripts_dir().join("scanner-backend.ps1");
        let mut cmd = std::process::Command::new("powershell");
        cmd.args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &script.to_string_lossy(),
            "-Action",
            "list",
        ]);
        hide_command_window(&mut cmd);

        let output = cmd.output().map_err(|e| format!("Failed to run WIA scanner probe: {e}"))?;
        let stdout = String::from_utf8_lossy(&output.stdout);

        for line in stdout.lines() {
            if let Some(rest) = line.strip_prefix("RESULT:") {
                let parsed: Vec<ScannerDeviceInfo> = serde_json::from_str(rest)
                    .map_err(|e| format!("Failed to parse scanner list JSON: {e}"))?;
                return Ok(parsed);
            }
        }
        Err(format!("No scanner result payload returned. Output: {stdout}"))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn start_scan(options: ScanOptions) -> Result<ScanPageResult, String> {
    tokio::task::spawn_blocking(move || {
        let script = get_scripts_dir().join("scanner-backend.ps1");
        let mut cmd = std::process::Command::new("powershell");
        cmd.args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &script.to_string_lossy(),
            "-Action",
            "scan",
            "-Source",
            &options.source,
            "-ColorMode",
            &options.color_mode,
            "-Dpi",
            &options.dpi.to_string(),
            "-Format",
            &options.format,
            "-Precrop",
            &options.precrop,
        ]);

        if let Some(id) = &options.device_id {
            if !id.trim().is_empty() {
                cmd.args(["-DeviceId", id]);
            }
        }
        if let Some(name) = &options.device_name {
            if !name.trim().is_empty() {
                cmd.args(["-DeviceName", name]);
            }
        }
        if let Some(out_dir) = &options.out_dir {
            if !out_dir.trim().is_empty() {
                cmd.args(["-OutDir", out_dir]);
            }
        }
        if let Some(prefix) = &options.file_name_prefix {
            if !prefix.trim().is_empty() {
                cmd.args(["-FileNamePrefix", prefix]);
            }
        }
        if let Some(cw) = options.custom_width_inches {
            cmd.args(["-CustomWidthInches", &cw.to_string()]);
        }
        if let Some(ch) = options.custom_height_inches {
            cmd.args(["-CustomHeightInches", &ch.to_string()]);
        }
        if options.show_dialog.unwrap_or(false) {
            cmd.arg("-ShowDialog");
        }

        hide_command_window(&mut cmd);

        let output = cmd.output().map_err(|e| format!("Scan command failed: {e}"))?;
        let stdout = String::from_utf8_lossy(&output.stdout);

        for line in stdout.lines() {
            if let Some(rest) = line.strip_prefix("RESULT:") {
                let mut res: ScanPageResult = serde_json::from_str(rest)
                    .map_err(|e| format!("Could not parse scan result JSON: {e}"))?;
                if res.ok {
                    if let Some(prev) = &res.preview_path {
                        res.preview_base64 = to_base64_data_uri(prev, "image/jpeg");
                    }
                    if let Some(thumb) = &res.thumb_path {
                        res.thumb_base64 = to_base64_data_uri(thumb, "image/jpeg");
                    }
                    if let Some(batch) = &mut res.pages {
                        for page in batch.iter_mut() {
                            if let Some(prev) = &page.preview_path {
                                page.preview_base64 = to_base64_data_uri(prev, "image/jpeg");
                            }
                            if let Some(thumb) = &page.thumb_path {
                                page.thumb_base64 = to_base64_data_uri(thumb, "image/jpeg");
                            }
                        }
                    }
                }
                return Ok(res);
            }
        }

        Err(format!("Scan process produced no JSON result. Output: {stdout}"))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn read_image_base64(path: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let p = Path::new(&path);
        if !p.exists() {
            return Err("File not found.".to_string());
        }
        let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("png").to_lowercase();
        let mime = match ext.as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "bmp" => "image/bmp",
            _ => "image/png",
        };
        to_base64_data_uri(&path, mime).ok_or_else(|| "Failed to encode image to base64.".to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_scan_archive(
    archive_path: String,
    manifest_json: String,
    page_files: Vec<String>,
    ocr_text: Option<String>,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let temp_dir = std::env::temp_dir().join(format!("maru_scan_{}", uuid::Uuid::new_v4()));
        let pages_dir = temp_dir.join("pages");
        std::fs::create_dir_all(&pages_dir).map_err(|e| e.to_string())?;

        // Write manifest.json
        let manifest_file = temp_dir.join("manifest.json");
        std::fs::write(&manifest_file, &manifest_json).map_err(|e| e.to_string())?;

        // Write full_text.txt
        if let Some(ocr) = ocr_text {
            let ocr_file = temp_dir.join("full_text.txt");
            let _ = std::fs::write(ocr_file, ocr);
        }

        // Copy page files
        for (idx, src_str) in page_files.iter().enumerate() {
            let src = Path::new(src_str);
            if src.exists() {
                let ext = src.extension().and_then(|s| s.to_str()).unwrap_or("png");
                let dest = pages_dir.join(format!("page_{:02}.{}", idx + 1, ext));
                let _ = std::fs::copy(src, dest);
            }
        }

        // Invoke scanner-backend.ps1 -Action create-archive
        let script = get_scripts_dir().join("scanner-backend.ps1");
        let mut cmd = std::process::Command::new("powershell");
        cmd.args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &script.to_string_lossy(),
            "-Action",
            "create-archive",
            "-ArchiveFile",
            &archive_path,
            "-SourceFolder",
            &temp_dir.to_string_lossy(),
        ]);
        hide_command_window(&mut cmd);

        let output = cmd.output().map_err(|e| format!("Failed to create archive: {e}"))?;
        let stdout = String::from_utf8_lossy(&output.stdout);

        // Clean up temp
        let _ = std::fs::remove_dir_all(temp_dir);

        for line in stdout.lines() {
            if let Some(rest) = line.strip_prefix("RESULT:") {
                let v: serde_json::Value = serde_json::from_str(rest).map_err(|e| e.to_string())?;
                if v.get("ok").and_then(|b| b.as_bool()).unwrap_or(false) {
                    return Ok(archive_path);
                } else {
                    let err = v.get("error").and_then(|s| s.as_str()).unwrap_or("Unknown archive error");
                    return Err(err.to_string());
                }
            }
        }

        Err(format!("Failed to build .scan archive: {stdout}"))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn load_scan_archive(archive_path: String) -> Result<ArchiveLoadResult, String> {
    tokio::task::spawn_blocking(move || {
        let temp_dir = std::env::temp_dir().join(format!("maru_scan_read_{}", uuid::Uuid::new_v4()));
        let script = get_scripts_dir().join("scanner-backend.ps1");
        let mut cmd = std::process::Command::new("powershell");
        cmd.args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &script.to_string_lossy(),
            "-Action",
            "extract-archive",
            "-ArchiveFile",
            &archive_path,
            "-DestFolder",
            &temp_dir.to_string_lossy(),
        ]);
        hide_command_window(&mut cmd);

        let output = cmd.output().map_err(|e| format!("Failed to extract archive: {e}"))?;
        let stdout = String::from_utf8_lossy(&output.stdout);

        let mut manifest_str = String::new();
        for line in stdout.lines() {
            if let Some(rest) = line.strip_prefix("RESULT:") {
                let v: serde_json::Value = serde_json::from_str(rest).map_err(|e| e.to_string())?;
                if !v.get("ok").and_then(|b| b.as_bool()).unwrap_or(false) {
                    let err = v.get("error").and_then(|s| s.as_str()).unwrap_or("Extract error");
                    return Err(err.to_string());
                }
                if let Some(m) = v.get("manifest").and_then(|s| s.as_str()) {
                    manifest_str = m.to_string();
                }
                break;
            }
        }

        let pages_dir = temp_dir.join("pages");
        let mut pages = Vec::new();
        if pages_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&pages_dir) {
                let mut sorted_entries: Vec<_> = entries.filter_map(|e| e.ok()).collect();
                sorted_entries.sort_by_key(|e| e.file_name());

                for (idx, entry) in sorted_entries.iter().enumerate() {
                    let path = entry.path();
                    let file_name = entry.file_name().to_string_lossy().to_string();
                    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("png");
                    let mime = if ext == "jpg" || ext == "jpeg" { "image/jpeg" } else { "image/png" };
                    if let Some(b64) = to_base64_data_uri(&path.to_string_lossy(), mime) {
                        pages.push(ArchivePage {
                            file_name,
                            page_number: (idx + 1) as u32,
                            width: 2480,
                            height: 3508,
                            dpi: 300,
                            preview_base64: b64.clone(),
                            thumb_base64: b64,
                            ocr_text: None,
                        });
                    }
                }
            }
        }

        Ok(ArchiveLoadResult {
            ok: true,
            manifest_raw: if manifest_str.is_empty() { None } else { Some(manifest_str) },
            pages,
            error: None,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn choose_directory() -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(|| {
        let mut cmd = std::process::Command::new("powershell");
        cmd.args([
            "-NoProfile",
            "-Command",
            "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.ShowNewFolderButton = $true; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output ('FOLDER:' + $f.SelectedPath) }",
        ]);
        hide_command_window(&mut cmd);
        let output = cmd.output().map_err(|e| e.to_string())?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if let Some(path) = line.strip_prefix("FOLDER:") {
                let trimmed = path.trim().to_string();
                if !trimmed.is_empty() {
                    return Ok(Some(trimmed));
                }
            }
        }
        Ok(None)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn get_cli_open_file() -> Option<String> {
    for arg in std::env::args().skip(1) {
        let p = std::path::Path::new(&arg);
        if p.exists() {
            let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
            if ext == "scan" || ext == "zip" {
                return Some(arg);
            }
        }
    }
    None
}

#[tauri::command]
async fn choose_scan_file() -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(|| {
        let mut cmd = std::process::Command::new("powershell");
        cmd.args([
            "-NoProfile",
            "-Command",
            "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'Maru Scan Files (*.scan)|*.scan|All Files (*.*)|*.*'; $f.Title = 'Open Maru Scan Archive'; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output ('SCANFILE:' + $f.FileName) }",
        ]);
        hide_command_window(&mut cmd);
        let output = cmd.output().map_err(|e| e.to_string())?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if let Some(path) = line.strip_prefix("SCANFILE:") {
                let trimmed = path.trim().to_string();
                if !trimmed.is_empty() {
                    return Ok(Some(trimmed));
                }
            }
        }
        Ok(None)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn register_scan_association() -> Result<bool, String> {
    tokio::task::spawn_blocking(|| {
        if let Ok(exe_path) = std::env::current_exe() {
            let exe_str = exe_path.to_string_lossy().to_string();
            let mut cmd = std::process::Command::new("powershell");
            let script = format!(
                r#"
                $progId = 'Maru.Scanner.ScanFile'
                $ext = '.scan'
                $exe = '"{0}" "%1"'
                New-Item -Path 'HKCU:\Software\Classes\.scan' -Value $progId -Force | Out-Null
                New-Item -Path "HKCU:\Software\Classes\$progId\shell\open\command" -Value $exe -Force | Out-Null
                New-ItemProperty -Path "HKCU:\Software\Classes\$progId" -Name 'FriendlyTypeName' -Value 'Maru Scanner Document Archive' -Force | Out-Null
                "#,
                exe_str.replace("'", "''")
            );
            cmd.args(["-NoProfile", "-Command", &script]);
            hide_command_window(&mut cmd);
            let _ = cmd.output();
            return Ok(true);
        }
        Ok(false)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    let target = if p.is_file() {
        p.parent().unwrap_or(p)
    } else {
        p
    };
    #[cfg(target_os = "windows")]
    {
        let mut cmd = std::process::Command::new("explorer");
        cmd.arg(target);
        hide_command_window(&mut cmd);
        let _ = cmd.spawn();
    }
    Ok(())
}

#[tauri::command]
async fn win_minimize(window: tauri::WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn win_maximize(window: tauri::WebviewWindow) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn win_close(window: tauri::WebviewWindow) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
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
    let mon_size = target_mon.size();
    let win_size = window.outer_size().unwrap_or(tauri::PhysicalSize::new(1280, 840));

    let new_x = mon_pos.x + ((mon_size.width as i32 - win_size.width as i32) / 2).max(50);
    let new_y = mon_pos.y + ((mon_size.height as i32 - win_size.height as i32) / 2).max(50);

    let _ = window.set_position(tauri::PhysicalPosition::new(new_x, new_y));
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_scanners,
            start_scan,
            read_image_base64,
            save_scan_archive,
            load_scan_archive,
            choose_directory,
            choose_scan_file,
            get_cli_open_file,
            register_scan_association,
            open_folder,
            win_minimize,
            win_maximize,
            win_close,
            move_to_next_monitor
        ])
        .run(tauri::generate_context!())
        .expect("error while running Maru Scanner");
}
