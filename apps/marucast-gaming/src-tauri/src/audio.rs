#![cfg(target_os = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

static MUTED: AtomicBool = AtomicBool::new(false);
static PREV_LEVEL: Mutex<f32> = Mutex::new(1.0);

fn with_audio_endpoint<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume) -> R,
{
    unsafe {
        use windows::Win32::Media::Audio::*;
        use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
        use windows::Win32::System::Com::*;

        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|e| format!("CoCreateInstance failed: {}", e))?;
        let device = enumerator
            .GetDefaultAudioEndpoint(eRender, eMultimedia)
            .map_err(|e| format!("GetDefaultAudioEndpoint failed: {}", e))?;
        let volume: IAudioEndpointVolume = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| format!("Activate IAudioEndpointVolume failed: {}", e))?;
        Ok(f(&volume))
    }
}

pub fn get_current_volume() -> f32 {
    with_audio_endpoint(|v| unsafe { v.GetMasterVolumeLevelScalar().unwrap_or(1.0) }).unwrap_or(1.0)
}

pub fn set_volume(level: f32) -> bool {
    with_audio_endpoint(|v| unsafe { v.SetMasterVolumeLevelScalar(level, std::ptr::null()) })
        .is_ok()
}

pub fn mute_pc_audio() -> bool {
    if MUTED.swap(true, Ordering::Relaxed) {
        return true;
    }
    let prev = get_current_volume();
    *PREV_LEVEL.lock().unwrap() = prev;
    set_volume(0.0)
}

pub fn unmute_pc_audio() -> bool {
    if !MUTED.swap(false, Ordering::Relaxed) {
        return true;
    }
    let prev = *PREV_LEVEL.lock().unwrap();
    set_volume(prev.max(0.01))
}

pub fn is_muted() -> bool {
    MUTED.load(Ordering::Relaxed)
}

pub fn start_loopback_capture() -> Arc<LoopbackCapture> {
    Arc::new(LoopbackCapture::new())
}

pub struct LoopbackCapture {
    running: AtomicBool,
    buffer: Arc<Mutex<Vec<f32>>>,
}

impl LoopbackCapture {
    fn new() -> Self {
        Self {
            running: AtomicBool::new(false),
            buffer: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn start(self: &Arc<Self>) {
        if self.running.swap(true, Ordering::Relaxed) {
            return;
        }
        let running = Arc::clone(self);
        let buffer = Arc::clone(&self.buffer);

        std::thread::spawn(move || unsafe {
            use windows::Win32::Media::Audio::*;
            use windows::Win32::System::Com::*;

            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

            let enumerator: IMMDeviceEnumerator = match CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) {
                Ok(e) => e,
                Err(_) => return,
            };
            let device = match enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia) {
                Ok(d) => d,
                Err(_) => return,
            };
            let client: IAudioClient = match device.Activate(CLSCTX_ALL, None) {
                Ok(c) => c,
                Err(_) => return,
            };

            let mix_format = match client.GetMixFormat() {
                Ok(f) if !f.is_null() => f,
                _ => return,
            };
            let format = &*mix_format;
            let channels = format.nChannels as u32;
            let sample_rate = format.nSamplesPerSec;

            let buffer_duration: i64 = 1_000_000; // 100ms in 100ns units
            if client.Initialize(
                AUDCLNT_SHAREMODE_SHARED,
                AUDCLNT_STREAMFLAGS_LOOPBACK,
                buffer_duration,
                0,
                mix_format,
                Some(std::ptr::null()),
            ).is_err() {
                return;
            }

            let capture_client: IAudioCaptureClient = match client.GetService() {
                Ok(c) => c,
                Err(_) => return,
            };

            let _ = client.Start();

            while running.running.load(Ordering::Relaxed) {
                let mut data_ptr: *mut u8 = std::ptr::null_mut();
                let mut frames_read: u32 = 0;
                let mut flags: u32 = 0;

                let result = capture_client.GetBuffer(
                    &mut data_ptr,
                    &mut frames_read,
                    &mut flags,
                    Some(std::ptr::null_mut()),
                    Some(std::ptr::null_mut()),
                );

                if result.is_err() || data_ptr.is_null() || frames_read == 0 {
                    let _ = capture_client.ReleaseBuffer(0);
                    std::thread::sleep(std::time::Duration::from_millis(5));
                    continue;
                }

                let actual_samples = (frames_read * channels as u32) as usize;
                let src = std::slice::from_raw_parts(data_ptr as *const f32, actual_samples);
                let mut buf = buffer.lock().unwrap();
                buf.extend_from_slice(src);
                let max_samples = (sample_rate as usize * channels as usize) / 2;
                if buf.len() > max_samples {
                    let drain = buf.len() - max_samples;
                    buf.drain(..drain);
                }
                drop(buf);

                let _ = capture_client.ReleaseBuffer(frames_read);
            }

            let _ = client.Stop();
        });
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::Relaxed);
    }

    pub fn drain_samples(&self, max_samples: usize) -> Vec<f32> {
        let mut buf = self.buffer.lock().unwrap();
        let take = buf.len().min(max_samples);
        buf.drain(..take).collect()
    }

    pub fn sample_rate(&self) -> u32 {
        48000
    }

    pub fn channels(&self) -> u16 {
        2
    }
}
