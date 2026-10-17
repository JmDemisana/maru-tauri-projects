#![cfg(target_os = "windows")]

use std::time::Duration;

const PIPE_NAME: &str = "\\\\.\\pipe\\MTTVirtualDisplayPipe";
const DEVICE_ID: &str = "Root\\MttVDD";

/// Check if VDD driver is installed by looking for the device in Device Manager.
pub fn is_driver_installed() -> bool {
    std::process::Command::new("pnputil")
        .args(["/enum-devices", "/class", "Display"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains(DEVICE_ID))
        .unwrap_or(false)
}

/// Install VDD via winget (silent). Returns Ok(output) or Err.
pub fn install_driver() -> Result<String, String> {
    let output = std::process::Command::new("winget")
        .args([
            "install", "-e", "--id", "VirtualDrivers.Virtual-Display-Driver",
            "--accept-source-agreements", "--accept-package-agreements",
        ])
        .output()
        .map_err(|e| format!("Failed to run winget: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(format!(
            "winget install failed (exit {}): {}",
            output.status,
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}

/// Send a command to the VDD named pipe and return the response.
fn pipe_command(command: &str) -> Result<String, String> {
    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::Storage::FileSystem::{CreateFileW, ReadFile, WriteFile, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL};
    use windows_sys::Win32::System::Pipes::SetNamedPipeHandleState;

    unsafe {
        let pipe_path: Vec<u16> = format!("{}\0", PIPE_NAME).encode_utf16().collect();
        let pipe_handle = CreateFileW(
            pipe_path.as_ptr(),
            0x80000000 | 0x40000000, // GENERIC_READ | GENERIC_WRITE
            0,
            std::ptr::null_mut(),
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL,
            std::ptr::null_mut(),
        );

        if pipe_handle == INVALID_HANDLE_VALUE {
            return Err(format!(
                "Failed to open VDD pipe. Error: {}",
                std::io::Error::last_os_error()
            ));
        }

        let mut mode: u32 = 0;
        let _ = SetNamedPipeHandleState(
            pipe_handle,
            &mut mode,
            std::ptr::null(),
            std::ptr::null(),
        );

        let cmd_bytes = command.as_bytes();
        let mut bytes_written: u32 = 0;
        let write_result = WriteFile(
            pipe_handle,
            cmd_bytes.as_ptr() as _,
            cmd_bytes.len() as u32,
            &mut bytes_written,
            std::ptr::null_mut(),
        );

        if write_result == 0 {
            let _ = CloseHandle(pipe_handle);
            return Err(format!("WriteFile failed: {}", std::io::Error::last_os_error()));
        }

        let mut buffer = [0u8; 1024];
        let mut bytes_read: u32 = 0;
        let read_result = ReadFile(
            pipe_handle,
            buffer.as_mut_ptr() as _,
            buffer.len() as u32,
            &mut bytes_read,
            std::ptr::null_mut(),
        );

        let _ = CloseHandle(pipe_handle);

        if read_result == 0 {
            return Err(format!("ReadFile failed: {}", std::io::Error::last_os_error()));
        }

        let response = String::from_utf8_lossy(&buffer[..bytes_read as usize]).to_string();
        Ok(response.trim().to_string())
    }
}

/// Ping the driver to check if it's alive.
pub fn ping() -> bool {
    pipe_command("PING")
        .map(|r| r == "PONG")
        .unwrap_or(false)
}

/// Create N virtual displays.
pub fn set_display_count(count: u32) -> Result<(), String> {
    let resp = pipe_command(&format!("SETDISPLAYCOUNT {}", count))?;
    if resp.contains("OK") || resp.is_empty() {
        Ok(())
    } else {
        Err(format!("VDD SETDISPLAYCOUNT response: {}", resp))
    }
}

/// Create exactly one virtual display for Marucast streaming.
pub fn create_virtual_display() -> Result<(), String> {
    set_display_count(1)
}

/// Destroy all virtual displays.
pub fn destroy_virtual_display() -> Result<(), String> {
    set_display_count(0)
}

/// Ensure driver is installed, then create one virtual display.
/// Returns the display info (left, top, width, height) of the new display.
pub fn ensure_and_create() -> Result<(i32, i32, i32, i32), String> {
    if !is_driver_installed() {
        eprintln!("[VDD] Driver not installed, installing...");
        install_driver()?;
        // Give driver time to register
        std::thread::sleep(Duration::from_secs(3));
    }

    if !ping() {
        return Err("VDD driver installed but not responding to pipe commands".to_string());
    }

    create_virtual_display()?;

    // Wait for Windows to register the new display
    std::thread::sleep(Duration::from_millis(500));

    // Find the new display
    let displays = crate::virtual_display::get_all_displays();
    let virtual_display = displays
        .iter()
        .find(|d| !d.is_primary)
        .ok_or_else(|| "Virtual display created but not detected by Windows".to_string())?;

    Ok((
        virtual_display.left,
        virtual_display.top,
        virtual_display.width,
        virtual_display.height,
    ))
}
