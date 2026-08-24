use serde::{Deserialize, Serialize};
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
fn hide_command_window(command: &mut Command) -> &mut Command {
    command.creation_flags(CREATE_NO_WINDOW)
}

#[cfg(not(target_os = "windows"))]
fn hide_command_window(command: &mut Command) -> &mut Command {
    command
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdbDevice {
    pub serial: String,
    pub model: String,
    pub is_wireless: bool,
    pub state: String,
    pub android_version: String,
    pub sdk_version: i32,
    pub supports_multi_audio: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AndroidApp {
    pub package_name: String,
    pub activity_name: String,
    pub label: String,
    pub is_game: bool,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecentTask {
    pub package_name: String,
    pub label: String,
    pub task_id: String,
}

/// Converts package names into real, polished, human-friendly titles
pub fn get_friendly_app_name(package_name: &str) -> String {
    let clean_pkg = package_name
        .trim_matches(|c| c == '{' || c == '}' || c == '"' || c == '\'' || char::is_whitespace(c))
        .to_lowercase();

    // 1. Comprehensive Dictionary for Popular & System Apps
    match clean_pkg.as_str() {
        "com.facebook.katana" => return "Facebook".to_string(),
        "com.facebook.orca" => return "Messenger".to_string(),
        "com.facebook.pages.app" => return "Meta Business Suite".to_string(),
        "com.google.android.apps.bard" => return "Gemini".to_string(),
        "com.android.vending" => return "Google Play Store".to_string(),
        "com.sec.android.app.sbrowser" => return "Samsung Internet".to_string(),
        "com.sec.android.gallery3d" => return "Gallery".to_string(),
        "com.sec.android.app.myfiles" => return "My Files".to_string(),
        "com.sec.android.app.camera" => return "Camera".to_string(),
        "com.sec.android.daemonapp" => return "Samsung Weather".to_string(),
        "com.sec.android.app.clockpackage" => return "Clock".to_string(),
        "com.sec.android.app.popupcalculator" => return "Calculator".to_string(),
        "com.sec.android.app.voicenote" => return "Voice Recorder".to_string(),
        "com.samsung.android.calendar" => return "Calendar".to_string(),
        "com.samsung.android.app.notes" => return "Samsung Notes".to_string(),
        "com.samsung.android.dialer" | "com.samsung.android.incallui" => return "Phone".to_string(),
        "com.samsung.android.messaging" => return "Messages".to_string(),
        "com.samsung.android.app.contacts" => return "Contacts".to_string(),
        "com.samsung.android.lool" => return "Device Care".to_string(),
        "com.samsung.android.game.gamehome" => return "Gaming Hub".to_string(),
        "com.apple.android.music" => return "Apple Music".to_string(),
        "com.openai.chatgpt" => return "ChatGPT".to_string(),
        "io.maru.lastnotif" => return "MAudio".to_string(),
        "anddea.youtube" | "com.google.android.youtube" => return "YouTube".to_string(),
        "com.google.android.apps.youtube.music" => return "YouTube Music".to_string(),
        "app.revanced.android.photos" | "com.google.android.apps.photos" => return "Google Photos".to_string(),
        "com.google.android.apps.maps" => return "Google Maps".to_string(),
        "com.spotify.music" => return "Spotify".to_string(),
        "com.discord" => return "Discord".to_string(),
        "org.telegram.messenger" => return "Telegram".to_string(),
        "com.valvesoftware.android.steam.community" => return "Steam".to_string(),
        "com.android.settings" => return "Settings".to_string(),
        "com.android.chrome" => return "Google Chrome".to_string(),
        // Popular Philippine & Global Mobile Apps
        "com.bpi.ng.app" => return "BPI Mobile".to_string(),
        "com.globe.gcash.android" => return "GCash".to_string(),
        "com.shazam.android" => return "Shazam".to_string(),
        "com.github.android" => return "GitHub".to_string(),
        "tv.twitch.android.app" => return "Twitch".to_string(),
        "com.otaku.app" => return "Otaku".to_string(),
        "egov.app" => return "eGov PH".to_string(),
        "com.digibites.accubattery" => return "AccuBattery".to_string(),
        // Games & Gaming Tools
        "com.steelcratevg.keeptalkingandnobodyexplodes" => return "Keep Talking & Nobody Explodes".to_string(),
        "com.ea.game.pvz2_rfl" => return "PvZ 2: Reflourished".to_string(),
        "net.mobigame.zombietsunami" => return "Zombie Tsunami".to_string(),
        "com.and.games505.terrariapaid" => return "Terraria".to_string(),
        "com.app.gamerpower" => return "GamerPower".to_string(),
        "com.google.android.play.games" => return "Google Play Games".to_string(),
        "com.epicgames.portal" => return "Epic Games".to_string(),
        "org.nbxgame.ruler" => return "Ruler".to_string(),
        "com.betafish.adblockbrowser" => return "Adblock Browser".to_string(),
        "com.google.android.apps.adm" => return "Find My Device".to_string(),
        "vocal.remover.karaoke.instrumental.app" => return "Vocal Remover".to_string(),
        "com.touchfield.appbackuprestore" => return "App Backup & Restore".to_string(),
        "net.tsapps.appsales" => return "AppSales".to_string(),
        "com.samsung.android.ardrawing" => return "AR Drawing".to_string(),
        "com.azarlive.android" => return "Azar".to_string(),
        "org.videolan.vlc" => return "VLC".to_string(),
        _ => {}
    }

    // 2. Generic Noise Filter & Meaningful Segment Extraction
    let segments: Vec<&str> = clean_pkg.split('.').collect();
    let ignore_words = [
        "com", "org", "net", "io", "app", "apps", "android", "ui", "client", "mobile",
        "main", "community", "games", "game", "paid", "free", "lite", "pro", "official",
        "global", "sea", "th", "vn", "ph", "ng", "sec", "samsung", "google", "activity"
    ];

    // Find first segment from right that isn't an ignored word
    let mut candidate = "";
    for seg in segments.iter().rev() {
        if !ignore_words.contains(seg) && seg.len() > 1 {
            candidate = seg;
            break;
        }
    }

    if candidate.is_empty() {
        candidate = segments.last().unwrap_or(&clean_pkg.as_str());
    }

    // 3. Clean up compound and snake/kebab case
    let cleaned = candidate
        .replace('_', " ")
        .replace('-', " ")
        .replace("keeptalkingandnobodyexplodes", "Keep Talking & Nobody Explodes")
        .replace("zombietsunami", "Zombie Tsunami")
        .replace("honeyplayplus", "HoneyPlay+")
        .replace("adblockbrowser", "Adblock Browser")
        .replace("gamerpower", "GamerPower")
        .replace("accubattery", "AccuBattery")
        .replace("appbackuprestore", "App Backup & Restore")
        .replace("ardrawing", "AR Drawing")
        .replace("audioconnect", "Audio Connect");

    // Title Case
    cleaned
        .split_whitespace()
        .map(|word| {
            let mut c = word.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            }
        })
        .collect::<Vec<String>>()
        .join(" ")
}

/// Executes an adb command with specified arguments
pub fn run_adb(args: &[&str]) -> Result<String, String> {
    let mut command = Command::new("adb");
    let output = hide_command_window(command.args(args))
        .output()
        .map_err(|e| format!("Failed to execute adb: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() && stdout.trim().is_empty() {
        return Err(stderr.trim().to_string());
    }

    Ok(stdout)
}



/// Force stops an app / background task on device
pub fn force_stop_app(device: &str, package_name: &str) -> Result<(), String> {
    let clean_pkg = package_name.trim_matches(|c| c == '{' || c == '}' || c == '"' || c == '\'' || char::is_whitespace(c));
    run_adb(&["-s", device, "shell", "am", "force-stop", clean_pkg])?;
    Ok(())
}

/// Uninstalls an app from the device via ADB
pub fn uninstall_app(device: &str, package_name: &str) -> Result<String, String> {
    let clean_pkg = package_name.trim_matches(|c| c == '{' || c == '}' || c == '"' || c == '\'' || char::is_whitespace(c));
    let output = run_adb(&["-s", device, "uninstall", clean_pkg])?;
    if output.contains("Success") {
        Ok("App uninstalled successfully".to_string())
    } else {
        Err(output.trim().to_string())
    }
}

/// Discovers connected ADB devices (USB & Wireless)
pub fn get_connected_devices() -> Result<Vec<AdbDevice>, String> {
    let output = run_adb(&["devices", "-l"])?;
    let mut devices = Vec::new();

    for line in output.lines().skip(1) {
        let line = line.trim();
        if line.is_empty() || line.starts_with('*') {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let serial = parts[0].to_string();
            let state = parts[1].to_string();

            let mut model = "Android Device".to_string();
            for part in &parts[2..] {
                if let Some(m) = part.strip_prefix("model:") {
                    model = m.replace('_', " ");
                }
            }

            let is_wireless = serial.contains(':') || serial.contains("._adb-tls");

            // Query Android & SDK version
            let android_version = run_adb(&["-s", &serial, "shell", "getprop", "ro.build.version.release"])
                .unwrap_or_else(|_| "14".to_string())
                .trim()
                .to_string();

            let sdk_version = run_adb(&["-s", &serial, "shell", "getprop", "ro.build.version.sdk"])
                .unwrap_or_else(|_| "34".to_string())
                .trim()
                .parse::<i32>()
                .unwrap_or(34);

            let supports_multi_audio = sdk_version >= 33;

            devices.push(AdbDevice {
                serial,
                model,
                is_wireless,
                state,
                android_version,
                sdk_version,
                supports_multi_audio,
            });
        }
    }

    Ok(devices)
}

/// Connects to a Wireless ADB device (IP:Port)
pub fn connect_wireless(ip_port: &str) -> Result<String, String> {
    let output = run_adb(&["connect", ip_port])?;
    if output.contains("connected to") || output.contains("already connected") {
        Ok(output.trim().to_string())
    } else {
        Err(output.trim().to_string())
    }
}

/// Pairs a device with pairing code (IP:Port + 6-digit Code)
pub fn pair_wireless(ip_port: &str, code: &str) -> Result<String, String> {
    let output = run_adb(&["pair", ip_port, code])?;
    if output.contains("Successfully paired") {
        Ok(output.trim().to_string())
    } else {
        Err(output.trim().to_string())
    }
}

/// Queries installed 3rd-party user apps and games
pub fn get_installed_apps(device: &str) -> Result<Vec<AndroidApp>, String> {
    let target = if device.is_empty() {
        let devs = get_connected_devices()?;
        if let Some(d) = devs.first() {
            d.serial.clone()
        } else {
            return Err("No ADB device connected".to_string());
        }
    } else {
        device.to_string()
    };

    let query_out = run_adb(&[
        "-s",
        &target,
        "shell",
        "cmd",
        "package",
        "query-activities",
        "--brief",
        "-a",
        "android.intent.action.MAIN",
        "-c",
        "android.intent.category.LAUNCHER",
    ])
    .unwrap_or_default();

    let mut apps = Vec::new();

    for line in query_out.lines() {
        let line = line.trim();
        if line.contains('/') && !line.starts_with("Activity") && !line.starts_with("main") {
            let parts: Vec<&str> = line.split('/').collect();
            if parts.len() == 2 {
                let raw_pkg = parts[0];
                let activity_name = parts[1].to_string();
                let package_name = raw_pkg
                    .trim_matches(|c| c == '{' || c == '}' || c == '"' || c == '\'' || char::is_whitespace(c))
                    .to_string();

                let label = get_friendly_app_name(&package_name);

                let is_game = package_name.contains("game")
                    || package_name.contains("unity")
                    || package_name.contains("pjsekai")
                    || package_name.contains("bangdream")
                    || package_name.contains("bandori")
                    || package_name.contains("d4dj")
                    || package_name.contains("arcaea")
                    || package_name.contains("cytus")
                    || package_name.contains("genshin")
                    || package_name.contains("starrail")
                    || package_name.contains("nikke")
                    || package_name.contains("terraria")
                    || package_name.contains("zombietsunami")
                    || package_name.contains("pvz2")
                    || package_name.contains("bluearchive");

                let category = if is_game {
                    "Games".to_string()
                } else if package_name.contains("music")
                    || package_name.contains("spotify")
                    || package_name.contains("youtube")
                    || package_name.contains("audio")
                {
                    "Media".to_string()
                } else {
                    "Apps".to_string()
                };

                if !package_name.starts_with("com.android.internal")
                    && !package_name.starts_with("com.google.android.inputmethod")
                {
                    apps.push(AndroidApp {
                        package_name,
                        activity_name,
                        label,
                        is_game,
                        category,
                    });
                }
            }
        }
    }

    apps.sort_by(|a, b| {
        if a.is_game != b.is_game {
            b.is_game.cmp(&a.is_game)
        } else {
            a.label.cmp(&b.label)
        }
    });

    apps.dedup_by(|a, b| a.package_name == b.package_name);
    Ok(apps)
}

/// Queries recent running tasks with clean names
pub fn get_recent_tasks(device: &str) -> Result<Vec<RecentTask>, String> {
    let target = if device.is_empty() {
        let devs = get_connected_devices()?;
        if let Some(d) = devs.first() {
            d.serial.clone()
        } else {
            return Err("No ADB device connected".to_string());
        }
    } else {
        device.to_string()
    };

    let output = run_adb(&["-s", &target, "shell", "dumpsys", "activity", "recents"]).unwrap_or_default();
    let mut tasks = Vec::new();

    for line in output.lines() {
        if line.contains("realActivity=") || line.contains("origActivity=") {
            if let Some(idx) = line.find("realActivity=") {
                let sub = &line[idx + 13..];
                if let Some(end) = sub.find(|c: char| c.is_whitespace() || c == '}') {
                    let activity = &sub[..end];
                    let raw_pkg = activity.split('/').next().unwrap_or(activity);
                    let pkg = raw_pkg.trim_matches(|c| c == '{' || c == '}' || c == '"' || c == '\'' || char::is_whitespace(c));

                    // Filter out internal system launchers and background daemons
                    if pkg.is_empty()
                        || pkg.contains("launcher")
                        || pkg.contains("SecDesktopLauncher")
                        || pkg.contains("systemui")
                        || pkg.contains("daemonapp")
                    {
                        continue;
                    }

                    let label = get_friendly_app_name(pkg);
                    
                    tasks.push(RecentTask {
                        package_name: pkg.to_string(),
                        label,
                        task_id: "Recent".to_string(),
                    });
                }
            }
        }
    }

    tasks.dedup_by(|a, b| a.package_name == b.package_name);
    Ok(tasks)
}
