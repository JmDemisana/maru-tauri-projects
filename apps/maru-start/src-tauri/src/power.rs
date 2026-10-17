use std::process::Command;

#[tauri::command]
pub fn execute_power_action(action: String) -> Result<(), String> {
    match action.to_lowercase().as_str() {
        "hibernate" => {
            // Respects Senpai's preference: always keep hibernation working!
            Command::new("shutdown")
                .args(["/h"])
                .spawn()
                .map_err(|e| format!("Failed to hibernate: {e}"))?;
        }
        "sleep" => {
            Command::new("rundll32.exe")
                .args(["powrprof.dll,SetSuspendState", "0,1,0"])
                .spawn()
                .map_err(|e| format!("Failed to sleep: {e}"))?;
        }
        "lock" => {
            Command::new("rundll32.exe")
                .args(["user32.dll,LockWorkStation"])
                .spawn()
                .map_err(|e| format!("Failed to lock: {e}"))?;
        }
        "restart" => {
            Command::new("shutdown")
                .args(["/r", "/t", "0"])
                .spawn()
                .map_err(|e| format!("Failed to restart: {e}"))?;
        }
        "shutdown" => {
            Command::new("shutdown")
                .args(["/s", "/t", "0"])
                .spawn()
                .map_err(|e| format!("Failed to shut down: {e}"))?;
        }
        "switch-user" | "switchuser" => {
            Command::new("rundll32.exe")
                .args(["user32.dll,LockWorkStation"])
                .spawn()
                .map_err(|e| format!("Failed to switch user: {e}"))?;
        }
        "logout" | "log-out" | "signout" | "sign-out" | "logoff" | "log-off" => {
            Command::new("shutdown")
                .args(["/l"])
                .spawn()
                .map_err(|e| format!("Failed to log out: {e}"))?;
        }
        _ => return Err(format!("Unknown power action: {action}")),
    }
    Ok(())
}
