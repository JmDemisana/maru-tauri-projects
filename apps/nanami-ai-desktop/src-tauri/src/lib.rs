use serde::{Deserialize, Serialize};

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
struct FileOpResult {
    ok: bool,
    content: Option<String>,
    entries: Option<Vec<String>>,
    error: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CommandResult {
    ok: bool,
    stdout: String,
    stderr: String,
    exit_code: i32,
    error: Option<String>,
}

fn err_result(message: String) -> FileOpResult {
    FileOpResult {
        ok: false,
        content: None,
        entries: None,
        error: Some(message),
    }
}

#[tauri::command]
fn nami_get_cwd() -> String {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| ".".to_string())
}

#[tauri::command]
fn nami_read_file(path: String) -> FileOpResult {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return err_result("That path is empty, baka.".to_string());
    }
    let p = std::path::Path::new(trimmed);
    if !p.exists() {
        return err_result("File not found.".to_string());
    }
    if p.is_dir() {
        return err_result("That path is a folder, not a file.".to_string());
    }
    // Keep Nami from eating the whole potato PC: cap reads at ~200 KB.
    match std::fs::metadata(p) {
        Ok(meta) if meta.len() > 200 * 1024 => {
            return err_result("File is too big to read (>200 KB).".to_string())
        }
        _ => {}
    }
    match std::fs::read_to_string(p) {
        Ok(content) => FileOpResult {
            ok: true,
            content: Some(content),
            entries: None,
            error: None,
        },
        Err(e) => err_result(format!("Could not read file: {e}")),
    }
}

#[tauri::command]
fn nami_write_file(path: String, content: String) -> FileOpResult {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return err_result("That path is empty, baka.".to_string());
    }
    let p = std::path::Path::new(trimmed);
    if let Some(parent) = p.parent() {
        if !parent.as_os_str().is_empty() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                return err_result(format!("Could not create parent folder: {e}"));
            }
        }
    }
    match std::fs::write(p, &content) {
        Ok(()) => FileOpResult {
            ok: true,
            content: None,
            entries: None,
            error: None,
        },
        Err(e) => err_result(format!("Could not write file: {e}")),
    }
}

#[tauri::command]
fn nami_replace_in_file(path: String, target: String, replacement: String) -> FileOpResult {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return err_result("That path is empty, baka.".to_string());
    }
    let p = std::path::Path::new(trimmed);
    if !p.exists() {
        return err_result("File does not exist.".to_string());
    }
    let content = match std::fs::read_to_string(p) {
        Ok(c) => c,
        Err(e) => return err_result(format!("Could not read file: {e}")),
    };
    if !content.contains(&target) {
        return err_result("Target block not found in file.".to_string());
    }
    let new_content = content.replacen(&target, &replacement, 1);
    match std::fs::write(p, &new_content) {
        Ok(()) => FileOpResult {
            ok: true,
            content: None,
            entries: None,
            error: None,
        },
        Err(e) => err_result(format!("Could not write file: {e}")),
    }
}

#[tauri::command]
fn nami_list_directory(path: String) -> FileOpResult {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return err_result("That path is empty, baka.".to_string());
    }
    let p = std::path::Path::new(trimmed);
    if !p.exists() {
        return err_result("Folder not found.".to_string());
    }
    if !p.is_dir() {
        return err_result("That path is not a folder.".to_string());
    }
    match std::fs::read_dir(p) {
        Ok(entries) => {
            let mut names: Vec<String> = entries
                .filter_map(|e| e.ok())
                .map(|e| {
                    let name = e.file_name().to_string_lossy().to_string();
                    if e.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                        format!("{name}/")
                    } else {
                        name
                    }
                })
                .collect();
            names.sort();
            // Cap listings so giant folders don't flood Nami's context.
            names.truncate(300);
            FileOpResult {
                ok: true,
                content: None,
                entries: Some(names),
                error: None,
            }
        }
        Err(e) => err_result(format!("Could not list folder: {e}")),
    }
}

/// Find a PowerShell to run commands with, on any OS.
/// Windows ships `powershell`. macOS/Linux need PowerShell Core (`pwsh`).
fn find_shell() -> Result<&'static str, String> {
    if cfg!(target_os = "windows") {
        return Ok("powershell");
    }
    if command_exists("pwsh") {
        return Ok("pwsh");
    }
    Err("No PowerShell found on this machine, baka! Install PowerShell Core (pwsh) from https://aka.ms/powershell and try again.".to_string())
}

fn command_exists(bin: &str) -> bool {
    let probe = if cfg!(target_os = "windows") {
        let mut cmd = std::process::Command::new("where");
        cmd.arg(bin);
        hide_command_window(&mut cmd);
        cmd.output()
    } else {
        std::process::Command::new("sh")
            .args(["-c", &format!("command -v {bin}")])
            .output()
    };
    probe.map(|o| o.status.success()).unwrap_or(false)
}

#[tauri::command]
fn nami_get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
fn nami_get_shell() -> String {
    find_shell().map(str::to_string).unwrap_or_else(|e| e)
}

#[tauri::command]
async fn nami_run_command(command: String, cwd: Option<String>) -> CommandResult {
    let trimmed = command.trim().to_string();
    if trimmed.is_empty() {
        return CommandResult {
            ok: false,
            stdout: String::new(),
            stderr: String::new(),
            exit_code: -1,
            error: Some("Empty command.".to_string()),
        };
    }
    let shell = match find_shell() {
        Ok(s) => s,
        Err(e) => {
            return CommandResult {
                ok: false,
                stdout: String::new(),
                stderr: String::new(),
                exit_code: -1,
                error: Some(e),
            }
        }
    };
    // Hard 60s leash so a hung process can't dangle forever.
    let cwd_clone = cwd;
    let run = tokio::task::spawn_blocking(move || {
        // `powershell` and `pwsh` share the same CLI flags.
        let mut cmd = std::process::Command::new(shell);
        cmd.args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", &trimmed]);
        hide_command_window(&mut cmd);
        if let Some(dir) = cwd_clone {
            if !dir.trim().is_empty() {
                cmd.current_dir(dir);
            }
        }
        cmd.output()
    });
    match tokio::time::timeout(std::time::Duration::from_secs(60), run).await {
        Ok(Ok(Ok(out))) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            let exit_code = out.status.code().unwrap_or(-1);
            CommandResult {
                ok: out.status.success(),
                stdout,
                stderr,
                exit_code,
                error: if out.status.success() {
                    None
                } else {
                    Some("Command exited with a non-zero status.".to_string())
                },
            }
        }
        Ok(Ok(Err(e))) => CommandResult {
            ok: false,
            stdout: String::new(),
            stderr: String::new(),
            exit_code: -1,
            error: Some(format!("Failed to run command task: {e}")),
        },
        Ok(Err(e)) => CommandResult {
            ok: false,
            stdout: String::new(),
            stderr: String::new(),
            exit_code: -1,
            error: Some(format!("Command task failed: {e}")),
        },
        Err(_) => CommandResult {
            ok: false,
            stdout: String::new(),
            stderr: String::new(),
            exit_code: -1,
            error: Some("Command timed out after 60s.".to_string()),
        },
    }
}

#[tauri::command]
async fn win_minimize(window: tauri::WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn win_close(window: tauri::WebviewWindow) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            nami_get_cwd,
            nami_get_platform,
            nami_get_shell,
            nami_read_file,
            nami_write_file,
            nami_replace_in_file,
            nami_list_directory,
            nami_run_command,
            win_minimize,
            win_close
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nanami AI desktop");
}
