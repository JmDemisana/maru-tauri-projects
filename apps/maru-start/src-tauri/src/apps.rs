use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub category: String,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum SearchResultItem {
    #[serde(rename = "app")]
    App {
        item: AppItem,
        score: i32,
    },
    #[serde(rename = "math")]
    Math {
        expression: String,
        result: String,
    },
    #[serde(rename = "action")]
    Action {
        id: String,
        title: String,
        subtitle: String,
        icon_name: String,
    },
    #[serde(rename = "terminal")]
    Terminal {
        command: String,
    },
}

pub fn scan_start_menu_shortcuts() -> Vec<AppItem> {
    let mut apps_map: HashMap<String, AppItem> = HashMap::new();

    let mut search_paths: Vec<PathBuf> = Vec::new();
    // System common start menu
    search_paths.push(PathBuf::from(r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs"));

    // User specific start menu
    if let Ok(appdata) = std::env::var("APPDATA") {
        let user_start = PathBuf::from(appdata).join(r"Microsoft\Windows\Start Menu\Programs");
        search_paths.push(user_start);
    }

    for base_dir in search_paths {
        if !base_dir.exists() {
            continue;
        }
        scan_dir_recursive(&base_dir, &base_dir, &mut apps_map);
    }

    // Scan all UWP / Packaged Windows Store Apps (Microsoft Store, Apple Music, etc.)
    scan_uwp_apps(&mut apps_map);

    let mut result: Vec<AppItem> = apps_map.into_values().collect();
    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    result
}

fn scan_uwp_apps(map: &mut HashMap<String, AppItem>) {
    use std::os::windows::process::CommandExt;
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-StartApps | Where-Object AppID -like '*!*' | ConvertTo-Csv -NoTypeInformation",
        ])
        .creation_flags(0x08000000)
        .output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines().skip(1) {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            let mut parts = Vec::new();
            for part in line.split(',') {
                let trimmed = part.trim().trim_matches('"');
                parts.push(trimmed);
            }
            if parts.len() >= 2 {
                let name = parts[0].to_string();
                let app_id = parts[1].to_string();
                let lower_name = name.to_lowercase();

                if lower_name.contains("uninstall") || app_id.starts_with("http") {
                    continue;
                }

                if map.contains_key(&lower_name) {
                    continue;
                }

                let launch_path = format!("shell:AppsFolder\\{}", app_id);
                let id = format!("uwp:{}:{}", name, app_id);
                let icon = extract_icon_base64(&launch_path);

                map.insert(
                    lower_name,
                    AppItem {
                        id,
                        name,
                        path: launch_path,
                        category: "Store & UWP".to_string(),
                        icon,
                    },
                );
            }
        }
    }
}

fn scan_dir_recursive(root: &Path, current_dir: &Path, map: &mut HashMap<String, AppItem>) {
    let Ok(entries) = fs::read_dir(current_dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            scan_dir_recursive(root, &path, map);
        } else if let Some(ext) = path.extension() {
            if ext.eq_ignore_ascii_case("lnk") {
                let stem = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                let lower_stem = stem.to_lowercase();

                // Skip uninstaller and documentation shortcuts
                if lower_stem.contains("uninstall") || lower_stem.contains("read me") || lower_stem.contains("help") {
                    continue;
                }

                // Determine category based on parent folder name if not root
                let category = if let Some(parent) = path.parent() {
                    if parent != root {
                        parent.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "General".to_string())
                    } else {
                        "General".to_string()
                    }
                } else {
                    "General".to_string()
                };

                let path_str = path.to_string_lossy().to_string();
                let id = format!("{}:{}", stem, path_str);

                let icon = extract_icon_base64(&path_str);

                map.insert(
                    lower_stem,
                    AppItem {
                        id,
                        name: stem,
                        path: path_str,
                        category,
                        icon,
                    },
                );
            }
        }
    }
}

#[cfg(target_os = "windows")]
pub fn extract_icon_base64(path: &str) -> Option<String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Graphics::Gdi::*;
    use windows_sys::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_SYSICONINDEX, SHGFI_LARGEICON};
    use windows_sys::Win32::UI::Controls::{ImageList_GetIcon, ILD_NORMAL, HIMAGELIST};
    use windows_sys::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, ICONINFO, HICON};

    unsafe {
        let wide_path: Vec<u16> = OsStr::new(path).encode_wide().chain(Some(0)).collect();

        // 1. Try to extract high-res icon using SHGetImageList (SHIL_EXTRALARGE = 2, SHIL_JUMBO = 4)
        let mut h_icon: HICON = std::ptr::null_mut();

        // First get system icon index
        let mut sfi: SHFILEINFOW = std::mem::zeroed();
        let mut himl_res: usize = 0;

        // If path is a shell namespace item (e.g. shell:AppsFolder\AppleInc.AppleMusicWin_...)
        if path.starts_with("shell:") || path.contains('!') {
            let shell32 = windows_sys::Win32::System::LibraryLoader::LoadLibraryW(
                to_wide_null("shell32.dll").as_ptr(),
            );
            if !shell32.is_null() {
                let proc = windows_sys::Win32::System::LibraryLoader::GetProcAddress(
                    shell32,
                    b"SHParseDisplayName\0".as_ptr(),
                );
                if let Some(sh_parse) = proc {
                    type SHParseDisplayNameFn = unsafe extern "system" fn(
                        *const u16,
                        *mut std::ffi::c_void,
                        *mut *mut std::ffi::c_void,
                        u32,
                        *mut u32,
                    ) -> i32;
                    let func: SHParseDisplayNameFn = std::mem::transmute(sh_parse);
                    let mut pidl: *mut std::ffi::c_void = std::ptr::null_mut();
                    if func(wide_path.as_ptr(), std::ptr::null_mut(), &mut pidl, 0, std::ptr::null_mut()) == 0 && !pidl.is_null() {
                        const SHGFI_PIDL: u32 = 0x00000008;
                        himl_res = SHGetFileInfoW(
                            pidl as *const u16,
                            0,
                            &mut sfi as *mut _,
                            std::mem::size_of::<SHFILEINFOW>() as u32,
                            SHGFI_PIDL | SHGFI_SYSICONINDEX | SHGFI_LARGEICON,
                        );

                        let ole32 = windows_sys::Win32::System::LibraryLoader::LoadLibraryW(
                            to_wide_null("ole32.dll").as_ptr(),
                        );
                        if !ole32.is_null() {
                            let cotask = windows_sys::Win32::System::LibraryLoader::GetProcAddress(
                                ole32,
                                b"CoTaskMemFree\0".as_ptr(),
                            );
                            if let Some(free_fn) = cotask {
                                type CoTaskMemFreeFn = unsafe extern "system" fn(*mut std::ffi::c_void);
                                let free: CoTaskMemFreeFn = std::mem::transmute(free_fn);
                                free(pidl);
                            }
                        }
                    }
                }
            }
        }

        if himl_res == 0 {
            himl_res = SHGetFileInfoW(
                wide_path.as_ptr(),
                0,
                &mut sfi as *mut _,
                std::mem::size_of::<SHFILEINFOW>() as u32,
                SHGFI_SYSICONINDEX | SHGFI_LARGEICON,
            );
        }

        if himl_res != 0 {
            // Try loading SHGetImageList from shell32.dll for hi-res 48px/256px icon
            let shell32 = windows_sys::Win32::System::LibraryLoader::LoadLibraryW(
                to_wide_null("shell32.dll").as_ptr(),
            );
            if !shell32.is_null() {
                let proc = windows_sys::Win32::System::LibraryLoader::GetProcAddress(
                    shell32,
                    b"SHGetImageList\0".as_ptr(),
                );
                if let Some(sh_get_image_list) = proc {
                    type SHGetImageListFn = unsafe extern "system" fn(
                        i32,
                        *const windows_sys::core::GUID,
                        *mut *mut std::ffi::c_void,
                    ) -> i32;
                    let func: SHGetImageListFn = std::mem::transmute(sh_get_image_list);
                    let iid_iimagelist = windows_sys::core::GUID {
                        data1: 0x46EB5926,
                        data2: 0x582E,
                        data3: 0x4017,
                        data4: [0x9F, 0xDF, 0xE8, 0x99, 0xDE, 0x50, 0xAC, 0x0F],
                    };
                    let mut himl_large: *mut std::ffi::c_void = std::ptr::null_mut();
                    // 1. Try SHIL_JUMBO (4 = 256x256) for crystal clear high-resolution icons
                    if func(4, &iid_iimagelist, &mut himl_large) == 0 && !himl_large.is_null() {
                        h_icon = ImageList_GetIcon(himl_large as HIMAGELIST, sfi.iIcon, ILD_NORMAL);
                    }
                    // 2. Fallback to SHIL_EXTRALARGE (2 = 48x48) if jumbo not present
                    if h_icon.is_null() && func(2, &iid_iimagelist, &mut himl_large) == 0 && !himl_large.is_null() {
                        h_icon = ImageList_GetIcon(himl_large as HIMAGELIST, sfi.iIcon, ILD_NORMAL);
                    }
                }
            }

            // Fallback to standard large icon if hi-res list failed
            if h_icon.is_null() {
                h_icon = ImageList_GetIcon(himl_res as HIMAGELIST, sfi.iIcon, ILD_NORMAL);
            }
        }

        if h_icon.is_null() {
            return None;
        }

        let mut icon_info: ICONINFO = std::mem::zeroed();
        if GetIconInfo(h_icon, &mut icon_info as *mut _) == 0 {
            DestroyIcon(h_icon);
            return None;
        }

        let hdc = CreateCompatibleDC(std::ptr::null_mut());
        let mut bi: BITMAPINFOHEADER = std::mem::zeroed();
        bi.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;

        GetDIBits(
            hdc,
            icon_info.hbmColor,
            0,
            0,
            std::ptr::null_mut(),
            &mut bi as *mut _ as *mut BITMAPINFO,
            DIB_RGB_COLORS,
        );

        let width = bi.biWidth;
        let height = bi.biHeight.abs();
        if width <= 0 || height <= 0 {
            DeleteDC(hdc);
            DeleteObject(icon_info.hbmColor as _);
            DeleteObject(icon_info.hbmMask as _);
            DestroyIcon(h_icon);
            return None;
        }

        bi.biBitCount = 32;
        bi.biCompression = BI_RGB;
        bi.biHeight = -height; // Top-down DIB
        let pixel_count = (width * height) as usize;
        let mut color_pixels = vec![0u8; pixel_count * 4];

        GetDIBits(
            hdc,
            icon_info.hbmColor,
            0,
            height as u32,
            color_pixels.as_mut_ptr() as *mut _,
            &mut bi as *mut _ as *mut BITMAPINFO,
            DIB_RGB_COLORS,
        );

        // Also retrieve 1-bit transparency mask in case icon is 24-bit with separate 1-bit mask
        let mut mask_bi: BITMAPINFOHEADER = std::mem::zeroed();
        mask_bi.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        mask_bi.biWidth = width;
        mask_bi.biHeight = -height;
        mask_bi.biPlanes = 1;
        mask_bi.biBitCount = 1;
        mask_bi.biCompression = BI_RGB;

        let mask_row_bytes = ((width + 31) / 32 * 4) as usize;
        let mut mask_pixels = vec![0u8; mask_row_bytes * height as usize];

        if !icon_info.hbmMask.is_null() {
            GetDIBits(
                hdc,
                icon_info.hbmMask,
                0,
                height as u32,
                mask_pixels.as_mut_ptr() as *mut _,
                &mut mask_bi as *mut _ as *mut BITMAPINFO,
                DIB_RGB_COLORS,
            );
        }

        DeleteDC(hdc);
        DeleteObject(icon_info.hbmColor as _);
        DeleteObject(icon_info.hbmMask as _);
        DestroyIcon(h_icon);

        // Check if color pixels have genuine alpha (>0)
        let has_real_alpha = color_pixels.chunks_exact(4).any(|c| c[3] > 0);

        // Convert BGRA to RGBA with true transparency
        let mut rgba_pixels = vec![0u8; pixel_count * 4];
        for y in 0..height as usize {
            for x in 0..width as usize {
                let idx = (y * width as usize + x) * 4;
                let b = color_pixels[idx];
                let g = color_pixels[idx + 1];
                let r = color_pixels[idx + 2];
                let mut a = color_pixels[idx + 3];

                if !has_real_alpha {
                    // Inspect 1-bit mask: bit == 1 means transparent, bit == 0 means opaque!
                    let mask_byte_idx = y * mask_row_bytes + (x / 8);
                    let mask_bit = (mask_pixels.get(mask_byte_idx).copied().unwrap_or(0) >> (7 - (x % 8))) & 1;
                    a = if mask_bit == 1 { 0 } else { 255 };
                }

                rgba_pixels[idx] = r;
                rgba_pixels[idx + 1] = g;
                rgba_pixels[idx + 2] = b;
                rgba_pixels[idx + 3] = a;
            }
        }

        // Encode to true transparent PNG using image crate
        let img = image::RgbaImage::from_raw(width as u32, height as u32, rgba_pixels)?;
        let mut png_bytes = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut png_bytes);
        if img.write_to(&mut cursor, image::ImageFormat::Png).is_err() {
            return None;
        }

        use base64::Engine;
        let b64 = base64::engine::general_purpose::STANDARD.encode(&png_bytes);
        Some(format!("data:image/png;base64,{b64}"))
    }
}

#[cfg(not(target_os = "windows"))]
pub fn extract_icon_base64(_path: &str) -> Option<String> {
    None
}

#[tauri::command]
pub fn get_app_icon(path: String) -> Option<String> {
    if Path::new(&path).exists() {
        extract_icon_base64(&path)
    } else {
        let sys32 = PathBuf::from(r"C:\Windows\System32").join(&path);
        if sys32.exists() {
            return extract_icon_base64(&sys32.to_string_lossy());
        }
        let win = PathBuf::from(r"C:\Windows").join(&path);
        if win.exists() {
            return extract_icon_base64(&win.to_string_lossy());
        }
        extract_icon_base64(&path)
    }
}

static APPS_CACHE: std::sync::OnceLock<Vec<AppItem>> = std::sync::OnceLock::new();

#[tauri::command]
pub fn get_installed_apps() -> Vec<AppItem> {
    APPS_CACHE.get_or_init(|| scan_start_menu_shortcuts()).clone()
}

use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use windows_sys::Win32::UI::Shell::ShellExecuteW;
use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

fn to_wide_null(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(Some(0)).collect()
}

#[tauri::command]
pub fn launch_app_path(path: String) -> Result<(), String> {
    if path.starts_with("shell:AppsFolder\\") || path.contains('!') {
        use std::os::windows::process::CommandExt;
        Command::new("explorer.exe")
            .arg(&path)
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| format!("Failed to launch UWP app '{path}': {e}"))?;
        return Ok(());
    }

    let wide_path = to_wide_null(&path);
    unsafe {
        let res = ShellExecuteW(
            std::ptr::null_mut(),
            std::ptr::null(),
            wide_path.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        );
        if (res as isize) <= 32 {
            use std::os::windows::process::CommandExt;
            Command::new("cmd")
                .args(["/c", "start", "", &path])
                .creation_flags(0x08000000)
                .spawn()
                .map_err(|e| format!("Failed to launch '{path}': {e}"))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn launch_app_admin(path: String) -> Result<(), String> {
    let wide_path = to_wide_null(&path);
    let wide_runas = to_wide_null("runas");
    unsafe {
        let res = ShellExecuteW(
            std::ptr::null_mut(),
            wide_runas.as_ptr(),
            wide_path.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        );
        if (res as isize) <= 32 {
            return Err("Failed to launch as administrator".into());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn open_file_location(path: String) -> Result<(), String> {
    Command::new("explorer")
        .args([format!("/select,\"{path}\"")])
        .spawn()
        .map_err(|e| format!("Failed to open location: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn launch_terminal_cmd(command: String) -> Result<(), String> {
    // Open Windows Terminal or PowerShell running command
    Command::new("wt.exe")
        .args(["powershell", "-NoExit", "-Command", &command])
        .spawn()
        .or_else(|_| {
            Command::new("powershell.exe")
                .args(["-NoExit", "-Command", &command])
                .spawn()
        })
        .map_err(|e| format!("Failed to launch terminal command: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn search_start_items(query: String, all_apps: Vec<AppItem>) -> Vec<SearchResultItem> {
    let q = query.trim();
    if q.is_empty() {
        return Vec::new();
    }

    let mut results: Vec<SearchResultItem> = Vec::new();
    let q_lower = q.to_lowercase();
    let q_trimmed = q.trim();

    // 1. Direct URL check: "github.com", "https://...", "youtube.com"
    if q_lower.starts_with("http://")
        || q_lower.starts_with("https://")
        || (q_lower.contains('.') && !q_lower.contains(' ') && (q_lower.ends_with(".com") || q_lower.ends_with(".org") || q_lower.ends_with(".net") || q_lower.ends_with(".io") || q_lower.ends_with(".dev") || q_lower.ends_with(".ph") || q_lower.ends_with(".app")))
    {
        let target_url = if q_lower.starts_with("http://") || q_lower.starts_with("https://") {
            q_trimmed.to_string()
        } else {
            format!("https://{q_trimmed}")
        };
        results.push(SearchResultItem::Action {
            id: format!("url:{target_url}"),
            title: format!("Open {q_trimmed}"),
            subtitle: "Open website in default web browser".to_string(),
            icon_name: "Globe".to_string(),
        });
    }

    // 2. Terminal prefix check: "> ping 1.1.1.1" or "> code"
    if let Some(cmd) = q.strip_prefix('>') {
        let clean_cmd = cmd.trim();
        if !clean_cmd.is_empty() {
            results.push(SearchResultItem::Terminal {
                command: clean_cmd.to_string(),
            });
        }
    }

    // 3. Math & Inline Calculations (including special Maru easter egg: 9 + 10 = 21)
    if let Some(math_res) = evaluate_math_expression(q) {
        results.push(SearchResultItem::Math {
            expression: q.to_string(),
            result: math_res,
        });
    }

    // 4. Quick System Power Actions
    if "hibernate".starts_with(&q_lower) || q_lower == "hib" {
        results.push(SearchResultItem::Action {
            id: "hibernate".to_string(),
            title: "Hibernate PC".to_string(),
            subtitle: "Save state to disk and shut down (Senpai's favorite 💤)".to_string(),
            icon_name: "Moon".to_string(),
        });
    }
    if "lock".starts_with(&q_lower) {
        results.push(SearchResultItem::Action {
            id: "lock".to_string(),
            title: "Lock Workstation".to_string(),
            subtitle: "Lock current user session".to_string(),
            icon_name: "Lock".to_string(),
        });
    }
    if "restart".starts_with(&q_lower) || "reboot".starts_with(&q_lower) {
        results.push(SearchResultItem::Action {
            id: "restart".to_string(),
            title: "Restart Computer".to_string(),
            subtitle: "Close all apps and restart Windows".to_string(),
            icon_name: "RotateCcw".to_string(),
        });
    }
    if "shutdown".starts_with(&q_lower) || "turn off".starts_with(&q_lower) {
        results.push(SearchResultItem::Action {
            id: "shutdown".to_string(),
            title: "Shut Down".to_string(),
            subtitle: "Turn off PC completely".to_string(),
            icon_name: "Power".to_string(),
        });
    }
    if "sleep".starts_with(&q_lower) {
        results.push(SearchResultItem::Action {
            id: "sleep".to_string(),
            title: "Sleep".to_string(),
            subtitle: "Low-power suspend, instant resume".to_string(),
            icon_name: "BedDouble".to_string(),
        });
    }
    if "signout".starts_with(&q_lower)
        || "sign out".starts_with(&q_lower)
        || "logoff".starts_with(&q_lower)
        || "log off".starts_with(&q_lower)
    {
        results.push(SearchResultItem::Action {
            id: "signout".to_string(),
            title: "Sign Out".to_string(),
            subtitle: "Close session and sign out current user".to_string(),
            icon_name: "LogOut".to_string(),
        });
    }

    // 5. Windows 10 Settings & System Tools Search
    let settings_items: &[(&str, &str, &str, &str)] = &[
        ("Bluetooth & Other Devices", "ms-settings:bluetooth", "Manage Bluetooth and paired devices", "bluetooth, wireless, pair, devices, mouse, keyboard, airpods, buds"),
        ("Wi-Fi & Network Settings", "ms-settings:network-wifi", "Connect to Wi-Fi and network adapters", "wifi, wi-fi, internet, network, wlan, hotspot, ethernet"),
        ("Display & Brightness", "ms-settings:display", "Change brightness, resolution, and multi-monitor layout", "display, monitor, screen, brightness, resolution, hdr, scale"),
        ("Sound Settings", "ms-settings:sound", "Manage output speakers and input microphone", "sound, audio, volume, speakers, headphones, mic, microphone"),
        ("Windows Update", "ms-settings:windowsupdate", "Check for updates and security patches", "update, updates, patch, windows update, upgrade, check updates"),
        ("Installed Apps", "ms-settings:appsfeatures", "View, repair, and uninstall applications", "apps, uninstall, remove programs, features, installed apps"),
        ("Power & Sleep", "ms-settings:powersleep", "Screen timeout and sleep duration", "battery, power, sleep, energy, timeout, screen off"),
        ("Storage & Clean Up", "ms-settings:storagesense", "View drive usage and free up space", "storage, disk, drive, space, clean, temporary files, c drive"),
        ("Personalization & Background", "ms-settings:personalization-background", "Change wallpaper, accent colors, and dark mode", "wallpaper, background, theme, colors, dark mode, personalization"),
        ("Notifications & Focus Assist", "ms-settings:notifications", "Configure notification banners and quiet hours", "notifications, alerts, focus assist, popups, dnd"),
        ("Printers & Scanners", "ms-settings:printers", "Add and configure printers", "printer, print, scanner, fax"),
        ("Date & Time", "ms-settings:dateandtime", "Set time zone and clock sync", "time, date, clock, timezone, calendar"),
        ("Taskbar Settings", "ms-settings:taskbar", "Configure taskbar alignment, icons, behavior", "taskbar, taskbar settings, start"),
    ];

    for (title, uri, subtitle, keywords) in settings_items {
        if title.to_lowercase().contains(&q_lower) || keywords.contains(&q_lower) {
            results.push(SearchResultItem::Action {
                id: format!("settings:{uri}"),
                title: title.to_string(),
                subtitle: subtitle.to_string(),
                icon_name: "Settings".to_string(),
            });
        }
    }

    // 6. Windows Shell Folders Search
    let shell_folders: &[(&str, &str, &str, &str)] = &[
        ("Downloads", "shell:Downloads", "Open your Downloads folder", "downloads, dl"),
        ("Documents", "shell:Personal", "Open your Documents folder", "documents, docs, files"),
        ("Pictures", "shell:My Pictures", "Open your Pictures folder", "pictures, photos, images"),
        ("Videos", "shell:My Video", "Open your Videos folder", "videos, movies, clips"),
        ("Music", "shell:My Music", "Open your Music folder", "music, songs, tracks"),
        ("Desktop", "shell:Desktop", "Open your Desktop folder", "desktop, dt"),
    ];

    for (title, path, subtitle, keywords) in shell_folders {
        if title.to_lowercase().contains(&q_lower) || keywords.contains(&q_lower) {
            results.push(SearchResultItem::Action {
                id: format!("folder:{path}"),
                title: format!("{title} Folder"),
                subtitle: subtitle.to_string(),
                icon_name: "Folder".to_string(),
            });
        }
    }

    // 7. App Search with Acronyms, Executable Aliases & Fuzzy Matching
    let alias_rules: &[(&str, &[&str])] = &[
        ("cmd", &["command prompt", "cmd", "terminal", "console"]),
        ("wt", &["windows terminal", "terminal", "wt"]),
        ("powershell", &["windows powershell", "powershell", "terminal"]),
        ("calc", &["calculator", "calc"]),
        ("code", &["visual studio code", "vs code", "vscode", "code"]),
        ("edge", &["microsoft edge", "edge", "browser"]),
        ("chrome", &["google chrome", "chrome", "browser"]),
        ("explorer", &["file explorer", "explorer", "files", "folder"]),
        ("taskmgr", &["task manager", "taskmgr", "processes", "performance"]),
        ("regedit", &["registry editor", "regedit"]),
        ("paint", &["paint", "mspaint"]),
        ("notepad", &["notepad", "notes", "text"]),
        ("control", &["control panel"]),
        ("discord", &["discord", "chat"]),
        ("spotify", &["spotify", "music", "songs"]),
        ("notion", &["notion", "notes", "docs"]),
        ("matlab", &["matlab"]),
        ("autocad", &["autocad", "cad"]),
        ("android", &["android studio", "studio"]),
        ("7zip", &["7-zip", "7z", "zip", "archive", "7zip"]),
        ("maudio", &["maudio", "maudio desktop", "music"]),
        ("piano", &["monika piano", "monika piano maker", "piano"]),
    ];

    let mut scored_apps: Vec<(AppItem, i32)> = Vec::new();
    for app in all_apps {
        let name_lower = app.name.to_lowercase();
        let path_lower = app.path.to_lowercase();

        // Check if query matches an alias rule for this app
        let mut alias_bonus = 0;
        for (keyword, targets) in alias_rules {
            if q_lower == *keyword || q_lower.starts_with(keyword) {
                if targets.iter().any(|t| name_lower.contains(t) || path_lower.contains(t)) {
                    alias_bonus = 1200;
                    break;
                }
            }
        }

        if alias_bonus > 0 {
            scored_apps.push((app, alias_bonus));
        } else if let Some(score) = score_match(&name_lower, &q_lower) {
            scored_apps.push((app, score));
        } else if path_lower.contains(&q_lower) {
            scored_apps.push((app, 150));
        }
    }

    // Highest score first
    scored_apps.sort_by(|a, b| b.1.cmp(&a.1));

    for (app, score) in scored_apps.into_iter().take(12) {
        results.push(SearchResultItem::App { item: app, score });
    }

    // 8. Always offer Web Search fallback
    if !q_trimmed.is_empty() {
        results.push(SearchResultItem::Action {
            id: format!("web:{q_trimmed}"),
            title: format!("Search the web for \"{q_trimmed}\""),
            subtitle: "See results in default browser".to_string(),
            icon_name: "Globe".to_string(),
        });
    }

    results
}

fn score_match(target: &str, query: &str) -> Option<i32> {
    if target == query {
        return Some(1000);
    }
    if target.starts_with(query) {
        return Some(500 + (100 - target.len().min(100) as i32));
    }
    if let Some(pos) = target.find(query) {
        // Bonus if matches start of a word
        let is_word_boundary = pos == 0 || target.chars().nth(pos - 1).map(|c| c.is_whitespace() || c == '-').unwrap_or(false);
        let bonus = if is_word_boundary { 300 } else { 100 };
        return Some(bonus - pos as i32);
    }

    // Character fuzzy subsequence match (skip for 1-char queries: too noisy)
    if query.len() < 2 {
        return None;
    }
    let mut q_chars = query.chars().peekable();
    let mut score = 0;
    let mut consecutive = 0;
    let mut best_run = 0;
    for c in target.chars() {
        if let Some(&qc) = q_chars.peek() {
            if c == qc {
                q_chars.next();
                consecutive += 1;
                best_run = best_run.max(consecutive);
                score += 10 + consecutive * 2;
            } else {
                consecutive = 0;
                score -= 1;
            }
        }
    }
    if q_chars.peek().is_none() {
        // Require at least one consecutive pair for multi-char fuzzy hits
        if query.len() >= 3 && best_run < 2 {
            return None;
        }
        Some(score)
    } else {
        None
    }
}

fn evaluate_math_expression(input: &str) -> Option<String> {
    // Special quirk rule: "What's 9 + 10?" = 21
    let squished = input.replace(' ', "").to_lowercase();
    if squished == "9+10" || squished == "10+9" {
        return Some("21".to_string());
    }

    // Normalize common aliases: x/X, ×, ÷, , decimal commas are NOT handled (locale risk)
    let mut clean = input
        .replace('×', "*")
        .replace('÷', "/")
        .replace('x', "*")
        .replace('X', "*");
    clean.retain(|c| !c.is_whitespace());
    let clean_lower = clean.to_lowercase();
    if clean_lower == "9+10" || clean_lower == "10+9" {
        return Some("21".to_string());
    }

    // Check if input contains at least one operator and only valid math characters
    let has_operator = clean.contains('+')
        || clean.contains('-')
        || clean.contains('*')
        || clean.contains('/')
        || clean.contains('^')
        || clean.contains('%')
        || clean.contains('(');
    if !has_operator {
        return None;
    }

    let is_valid_chars = clean.chars().all(|c| {
        c.is_ascii_digit()
            || c == '.'
            || c == '+'
            || c == '-'
            || c == '*'
            || c == '/'
            || c == '^'
            || c == '%'
            || c == '('
            || c == ')'
    });
    if !is_valid_chars {
        return None;
    }

    // Recursive-descent evaluation with precedence: +,- < *,/,% < ^ (right-assoc) < unary, parens
    let mut parser = MathParser {
        chars: clean.chars().collect(),
        pos: 0,
    };
    let v = parser.parse_expr()?;
    if parser.pos != parser.chars.len() || !v.is_finite() {
        return None;
    }
    Some(if v.fract() == 0.0 && v.abs() < 1e15 {
        format!("{:.0}", v)
    } else {
        format!("{:.4}", v).trim_end_matches('0').trim_end_matches('.').to_string()
    })
}

struct MathParser {
    chars: Vec<char>,
    pos: usize,
}

impl MathParser {
    fn peek(&self) -> Option<char> {
        self.chars.get(self.pos).copied()
    }

    fn eat(&mut self, c: char) -> bool {
        if self.peek() == Some(c) {
            self.pos += 1;
            true
        } else {
            false
        }
    }

    // expr = term (('+' | '-') term)*
    fn parse_expr(&mut self) -> Option<f64> {
        let mut v = self.parse_term()?;
        loop {
            if self.eat('+') {
                v += self.parse_term()?;
            } else if self.eat('-') {
                v -= self.parse_term()?;
            } else {
                break;
            }
        }
        Some(v)
    }

    // term = power (('*' | '/' | '%') power)*
    fn parse_term(&mut self) -> Option<f64> {
        let mut v = self.parse_power()?;
        loop {
            if self.eat('*') {
                v *= self.parse_power()?;
            } else if self.eat('/') {
                let rhs = self.parse_power()?;
                if rhs == 0.0 {
                    return None;
                }
                v /= rhs;
            } else if self.eat('%') {
                let rhs = self.parse_power()?;
                if rhs == 0.0 {
                    return None;
                }
                v %= rhs;
            } else {
                break;
            }
        }
        Some(v)
    }

    // power = unary ('^' power)?  (right associative)
    fn parse_power(&mut self) -> Option<f64> {
        let base = self.parse_unary()?;
        if self.eat('^') {
            let exp = self.parse_power()?;
            Some(base.powf(exp))
        } else {
            Some(base)
        }
    }

    // unary = ('+' | '-')* primary
    fn parse_unary(&mut self) -> Option<f64> {
        let mut neg = false;
        loop {
            if self.eat('+') {
                continue;
            } else if self.eat('-') {
                neg = !neg;
            } else {
                break;
            }
        }
        let v = self.parse_primary()?;
        Some(if neg { -v } else { v })
    }

    // primary = number | '(' expr ')'  (trailing % = percent, e.g. 50% -> 0.5)
    fn parse_primary(&mut self) -> Option<f64> {
        if self.eat('(') {
            let v = self.parse_expr()?;
            if !self.eat(')') {
                return None;
            }
            let mut v = v;
            while self.eat('%') {
                v /= 100.0;
            }
            return Some(v);
        }
        let start = self.pos;
        let mut has_digit = false;
        let mut has_dot = false;
        while let Some(c) = self.peek() {
            if c.is_ascii_digit() {
                has_digit = true;
                self.pos += 1;
            } else if c == '.' && !has_dot {
                has_dot = true;
                self.pos += 1;
            } else {
                break;
            }
        }
        if !has_digit {
            return None;
        }
        let num: f64 = self.chars[start..self.pos].iter().collect::<String>().parse().ok()?;
        let mut v = num;
        while self.eat('%') {
            v /= 100.0;
        }
        Some(v)
    }
}

#[tauri::command]
pub fn get_desktop_wallpaper() -> Option<String> {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let wallpaper_path = PathBuf::from(appdata).join(r"Microsoft\Windows\Themes\TranscodedWallpaper");
        if wallpaper_path.exists() {
            if let Ok(bytes) = fs::read(&wallpaper_path) {
                use base64::Engine;
                let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                let mime = if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
                    "image/png"
                } else {
                    "image/jpeg"
                };
                return Some(format!("data:{mime};base64,{b64}"));
            }
        }
    }
    None
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UserAccountInfo {
    pub username: String,
    pub display_name: String,
    pub picture_base64: Option<String>,
}

#[tauri::command]
pub fn get_user_account_info() -> UserAccountInfo {
    let username = std::env::var("USERNAME").unwrap_or_else(|_| "User".to_string());
    let mut display_name = username.clone();

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        if let Ok(output) = Command::new("net")
            .args(["user", &username])
            .creation_flags(0x08000000)
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("Full Name") {
                    let parts: Vec<&str> = trimmed.splitn(2, "Full Name").collect();
                    if parts.len() == 2 {
                        let name = parts[1].trim();
                        if !name.is_empty() {
                            display_name = name.to_string();
                            break;
                        }
                    }
                }
            }
        }
    }

    let mut picture_base64: Option<String> = None;
    #[cfg(target_os = "windows")]
    {
        use base64::Engine;
        // 1. Check Public AccountPictures directory (contains official Windows account picture)
        let public_acc = PathBuf::from(r"C:\Users\Public\AccountPictures");
        if public_acc.exists() {
            if let Ok(entries) = fs::read_dir(&public_acc) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.is_dir() {
                        if let Ok(sub_entries) = fs::read_dir(&p) {
                            for sub in sub_entries.flatten() {
                                let sub_p = sub.path();
                                let filename = sub_p.file_name().unwrap_or_default().to_string_lossy();
                                if filename.contains("Image192") || filename.contains("Image96") || filename.contains("Image448") {
                                    if let Ok(bytes) = fs::read(&sub_p) {
                                        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                                        picture_base64 = Some(format!("data:image/jpeg;base64,{b64}"));
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    if picture_base64.is_some() {
                        break;
                    }
                }
            }
        }

        // 2. Fallback to AppData AccountPictures if any
        if picture_base64.is_none() {
            if let Ok(appdata) = std::env::var("APPDATA") {
                let user_acc = PathBuf::from(appdata).join(r"Microsoft\Windows\AccountPictures");
                if user_acc.exists() {
                    if let Ok(entries) = fs::read_dir(&user_acc) {
                        for entry in entries.flatten() {
                            let p = entry.path();
                            if p.is_file() {
                                if let Ok(bytes) = fs::read(&p) {
                                    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                                    picture_base64 = Some(format!("data:image/jpeg;base64,{b64}"));
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Fallback to default Windows 10 user avatar
        if picture_base64.is_none() {
            let default_pic = PathBuf::from(r"C:\ProgramData\Microsoft\User Account Pictures\user-192.png");
            if default_pic.exists() {
                if let Ok(bytes) = fs::read(&default_pic) {
                    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                    picture_base64 = Some(format!("data:image/png;base64,{b64}"));
                }
            }
        }
    }

    UserAccountInfo {
        username,
        display_name,
        picture_base64,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentEmail {
    pub sender: String,
    pub subject: String,
    pub time: String,
    pub unread_count: u32,
}

#[tauri::command]
pub async fn get_recent_emails() -> Result<Vec<RecentEmail>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let script = r#"
            try {
                $outlook = New-Object -ComObject Outlook.Application
                $mapi = $outlook.GetNamespace("MAPI")
                $inbox = $mapi.GetDefaultFolder(6)
                $unread = $inbox.UnReadItemCount
                $items = $inbox.Items | Sort-Object ReceivedTime -Descending | Select-Object -First 5
                $list = @()
                foreach ($item in $items) {
                    $timeStr = if ($item.ReceivedTime) { $item.ReceivedTime.ToString("h:mm tt") } else { "" }
                    $list += [PSCustomObject]@{
                        sender = [string]$item.SenderName
                        subject = [string]$item.Subject
                        time = $timeStr
                        unread = [int]$unread
                    }
                }
                $list | ConvertTo-Json -Compress
            } catch {
                "[]"
            }
        "#;

        let output = Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| e.to_string())?;

        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if text.is_empty() || text == "[]" {
            return Ok(Vec::new());
        }

        #[derive(Deserialize)]
        struct RawEmail {
            sender: Option<String>,
            subject: Option<String>,
            time: Option<String>,
            unread: Option<u32>,
        }

        let parsed: Vec<RawEmail> = serde_json::from_str(&text)
            .or_else(|_| serde_json::from_str::<RawEmail>(&text).map(|one| vec![one]))
            .unwrap_or_default();

        let unread_total = parsed.first().and_then(|e| e.unread).unwrap_or(0);

        let emails = parsed
            .into_iter()
            .map(|r| RecentEmail {
                sender: r.sender.unwrap_or_else(|| "Outlook".to_string()),
                subject: r.subject.unwrap_or_else(|| "(No Subject)".to_string()),
                time: r.time.unwrap_or_default(),
                unread_count: unread_total,
            })
            .collect();

        Ok(emails)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(Vec::new())
    }
}


