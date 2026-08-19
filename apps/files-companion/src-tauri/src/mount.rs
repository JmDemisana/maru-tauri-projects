use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[link(name = "kernel32")]
extern "system" {
    fn GetLogicalDrives() -> u32;
}

pub fn get_available_drive_letters() -> Vec<char> {
    let mask = unsafe { GetLogicalDrives() };
    let mut available = Vec::new();
    for i in 0..26 {
        // bit 0 is A, bit 25 is Z
        if (mask & (1 << i)) == 0 {
            let letter = (b'A' + i) as char;
            available.push(letter);
        }
    }
    available
}

pub fn find_best_drive_letter() -> Option<char> {
    let available = get_available_drive_letters();
    // Prefer 'M' for Maru if available
    if available.contains(&'M') {
        return Some('M');
    }
    // Otherwise pick the highest available letter from Z down to D
    for &c in &['Z', 'Y', 'X', 'W', 'V', 'U', 'T', 'S', 'R', 'Q', 'P', 'O', 'N', 'L', 'K', 'J', 'I', 'H', 'G', 'F', 'E', 'D'] {
        if available.contains(&c) {
            return Some(c);
        }
    }
    None
}

pub fn mount_drive(drive_letter: char, port: u16) -> Result<(), String> {
    let drive_str = format!("{}:", drive_letter);

    // Ensure the Windows WebDAV client service (WebClient) is running.
    let mut svc_cmd = Command::new("net");
    #[cfg(windows)]
    svc_cmd.creation_flags(CREATE_NO_WINDOW);
    let _ = svc_cmd.args(&["start", "webclient"]).output();

    // Clean up any existing stale/ghost WebDAV drive mappings
    cleanup_stale_webdav_drives();

    let candidates = [
        format!("\\\\127.0.0.1@{}\\\\DavWWWRoot", port),
        format!("\\\\localhost@{}\\\\DavWWWRoot", port),
        format!("http://127.0.0.1:{}/", port),
    ];

    let mut last_err = String::new();

    for candidate in &candidates {
        let mut cmd3 = Command::new("net");
        #[cfg(windows)]
        cmd3.creation_flags(CREATE_NO_WINDOW);
        let output = cmd3
            .args(&["use", &drive_str, candidate, "/persistent:no"])
            .output();

        if let Ok(out) = output {
            if out.status.success() {
                set_drive_label(drive_letter, port, "Maru Companion Drive");
                return Ok(());
            } else {
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                last_err = format!("{} {}", stderr, stdout);
            }
        }
    }

    Err(format!("net use error: {}", last_err.trim()))
}

pub fn unmount_drive(drive_letter: char) -> Result<(), String> {
    let drive_str = format!("{}:", drive_letter);
    let mut cmd = Command::new("net");
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd
        .args(&["use", &drive_str, "/delete", "/y"])
        .output()
        .map_err(|e| format!("Failed to execute net use delete command: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        // Treat "not found" and error 85 (already in use/already gone) as success
        if err_msg.contains("could not be found")
            || err_msg.contains("2250")
            || err_msg.contains("85")
        {
            Ok(())
        } else {
            Err(format!("net use delete error: {}", err_msg))
        }
    }
}

pub fn is_drive_mounted(drive_letter: char) -> bool {
    let drive_str = format!("{}:", drive_letter);
    let mut cmd = Command::new("net");
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    if let Ok(out) = cmd.arg("use").output() {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            if line.contains(&drive_str) {
                return true;
            }
        }
    }
    false
}

pub fn cleanup_stale_webdav_drives() {
    let mut cmd = Command::new("net");
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    if let Ok(out) = cmd.arg("use").output() {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            if line.contains("DavWWWRoot") || line.contains("127.0.0.1") || line.contains("localhost") {
                for word in line.split_whitespace() {
                    if word.len() == 2 && word.ends_with(':') {
                        if let Some(c) = word.chars().next() {
                            let _ = unmount_drive(c);
                        }
                    }
                }
            }
        }
    }
}

fn set_drive_label(drive_letter: char, port: u16, label: &str) {
    let script = format!(
        "(New-Object -ComObject Shell.Application).NameSpace('{}:\\').Self.Name = '{}'; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\MountPoints2\\##127.0.0.1@{}#DavWWWRoot' -Name '_LabelFromReg' -Value '{}' -ErrorAction SilentlyContinue",
        drive_letter, label, port, label
    );
    let mut cmd = Command::new("powershell");
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let _ = cmd.args(&["-NoProfile", "-Command", &script]).output();
}

pub fn register_deep_link_protocol() {
    #[cfg(windows)]
    {
        if let Ok(exe_path) = std::env::current_exe() {
            let exe_str = exe_path.to_string_lossy();
            let hkcu = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
            if let Ok((classes, _)) = hkcu.create_subkey("Software\\Classes\\files-companion") {
                let _ = classes.set_value("", &"URL:Files Companion Protocol");
                let _ = classes.set_value("URL Protocol", &"");
                if let Ok((cmd_key, _)) = classes.create_subkey("shell\\open\\command") {
                    let cmd_str = format!("\"{}\" \"%1\"", exe_str);
                    let _ = cmd_key.set_value("", &cmd_str);
                }
            }
        }
    }
}
