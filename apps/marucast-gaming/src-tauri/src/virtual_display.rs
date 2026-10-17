use serde::{Deserialize, Serialize};

#[cfg(target_os = "windows")]
use windows_sys::Win32::{
    Foundation::{LPARAM, RECT},
    Graphics::Gdi::{EnumDisplayMonitors, GetMonitorInfoW, HDC, HMONITOR, MONITORINFOEXW},
};

#[cfg(target_os = "windows")]
const MONITORINFOF_PRIMARY: u32 = 1;


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayInfo {
    pub name: String,
    pub left: i32,
    pub top: i32,
    pub width: i32,
    pub height: i32,
    pub is_primary: bool,
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn monitor_enum_proc(
    hmonitor: HMONITOR,
    _hdc: HDC,
    _rect: *mut RECT,
    lparam: LPARAM,
) -> i32 {
    let monitors = &mut *(lparam as *mut Vec<DisplayInfo>);

    let mut mi: MONITORINFOEXW = std::mem::zeroed();
    mi.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;

    if GetMonitorInfoW(hmonitor, &mut mi as *mut _ as *mut _) != 0 {
        let name_len = mi
            .szDevice
            .iter()
            .position(|&c| c == 0)
            .unwrap_or(mi.szDevice.len());
        let name = String::from_utf16_lossy(&mi.szDevice[..name_len]);

        let width = mi.monitorInfo.rcMonitor.right - mi.monitorInfo.rcMonitor.left;
        let height = mi.monitorInfo.rcMonitor.bottom - mi.monitorInfo.rcMonitor.top;
        let is_primary = (mi.monitorInfo.dwFlags & MONITORINFOF_PRIMARY) != 0;

        monitors.push(DisplayInfo {
            name,
            left: mi.monitorInfo.rcMonitor.left,
            top: mi.monitorInfo.rcMonitor.top,
            width,
            height,
            is_primary,
        });
    }

    1 // Continue enumeration
}

pub fn get_all_displays() -> Vec<DisplayInfo> {
    let mut monitors = Vec::new();

    #[cfg(target_os = "windows")]
    unsafe {
        EnumDisplayMonitors(
            std::ptr::null_mut(),
            std::ptr::null(),
            Some(monitor_enum_proc),
            &mut monitors as *mut _ as isize,
        );
    }

    monitors
}

/// Finds the secondary (virtual or external) monitor to stream to the phone.
/// If only one monitor exists, returns None.
pub fn get_stream_target_display() -> Option<DisplayInfo> {
    let displays = get_all_displays();
    // Return first non-primary display
    displays.into_iter().find(|d| !d.is_primary)
}
