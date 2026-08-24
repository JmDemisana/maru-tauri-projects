use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, Stream};

enum DspCommand {
    Start { app_name: String },
    Stop,
}

#[derive(Clone)]
pub struct DspEngine {
    pub is_active: Arc<AtomicBool>,
    pub vocal_gain: Arc<AtomicU32>,
    pub inst_gain: Arc<AtomicU32>,
    pub bass_gain: Arc<AtomicU32>,
    pub spectrum_peaks: Arc<Mutex<[f32; 16]>>,
    cmd_tx: Sender<DspCommand>,
}

// Ensure Send and Sync for Tauri State
unsafe impl Send for DspEngine {}
unsafe impl Sync for DspEngine {}

impl DspEngine {
    pub fn new() -> Self {
        let is_active = Arc::new(AtomicBool::new(false));
        let vocal_gain = Arc::new(AtomicU32::new(10));
        let inst_gain = Arc::new(AtomicU32::new(100));
        let bass_gain = Arc::new(AtomicU32::new(100));
        let spectrum_peaks = Arc::new(Mutex::new([0.0; 16]));

        let (tx, rx) = channel::<DspCommand>();

        let thread_active = Arc::clone(&is_active);
        let thread_vocal = Arc::clone(&vocal_gain);
        let thread_inst = Arc::clone(&inst_gain);
        let thread_bass = Arc::clone(&bass_gain);
        let thread_spectrum = Arc::clone(&spectrum_peaks);

        // Dedicated OS Audio Thread for WASAPI Stream
        std::thread::spawn(move || {
            let mut active_stream: Option<Stream> = None;
            let mut current_muted_app: Option<String> = None;

            while let Ok(cmd) = rx.recv() {
                match cmd {
                    DspCommand::Start { app_name } => {
                        // 1. Mute target app session in Windows Volume Mixer
                        #[cfg(target_os = "windows")]
                        {
                            let _ = mute_app_by_name(&app_name, true);
                            current_muted_app = Some(app_name);
                        }

                        // 2. Start WASAPI Audio Stream
                        if active_stream.is_none() {
                            if let Ok(stream) = create_dsp_stream(
                                &thread_vocal,
                                &thread_inst,
                                &thread_bass,
                                &thread_spectrum,
                            ) {
                                if stream.play().is_ok() {
                                    active_stream = Some(stream);
                                    thread_active.store(true, Ordering::Relaxed);
                                }
                            }
                        }
                    }
                    DspCommand::Stop => {
                        // 1. Unmute target app session
                        #[cfg(target_os = "windows")]
                        {
                            if let Some(ref app) = current_muted_app {
                                let _ = mute_app_by_name(app, false);
                            }
                            current_muted_app = None;
                        }

                        // 2. Stop WASAPI stream
                        active_stream = None;
                        thread_active.store(false, Ordering::Relaxed);
                    }
                }
            }
        });

        Self {
            is_active,
            vocal_gain,
            inst_gain,
            bass_gain,
            spectrum_peaks,
            cmd_tx: tx,
        }
    }

    pub fn set_stem_levels(&self, vocal: u32, inst: u32, bass: u32) {
        self.vocal_gain.store(vocal, Ordering::Relaxed);
        self.inst_gain.store(inst, Ordering::Relaxed);
        self.bass_gain.store(bass, Ordering::Relaxed);
    }

    pub fn get_peaks(&self) -> [f32; 16] {
        if let Ok(peaks) = self.spectrum_peaks.lock() {
            *peaks
        } else {
            [0.0; 16]
        }
    }

    pub fn start(&self, app_name: String) -> Result<bool, String> {
        self.cmd_tx
            .send(DspCommand::Start { app_name })
            .map_err(|e| e.to_string())?;
        Ok(true)
    }

    pub fn stop(&self) -> Result<bool, String> {
        self.cmd_tx
            .send(DspCommand::Stop)
            .map_err(|e| e.to_string())?;
        Ok(true)
    }
}

fn create_dsp_stream(
    vocal_gain: &Arc<AtomicU32>,
    inst_gain: &Arc<AtomicU32>,
    bass_gain: &Arc<AtomicU32>,
    spectrum: &Arc<Mutex<[f32; 16]>>,
) -> Result<Stream, String> {
    let host = cpal::default_host();
    let device = host
        .default_output_device()
        .ok_or_else(|| "No default audio output device found".to_string())?;

    let config = device
        .default_output_config()
        .map_err(|e| format!("Failed to get default output config: {}", e))?;

    let sample_format = config.sample_format();
    let channels = config.channels() as usize;

    let v_gain = Arc::clone(vocal_gain);
    let i_gain = Arc::clone(inst_gain);
    let b_gain = Arc::clone(bass_gain);
    let spec = Arc::clone(spectrum);

    let err_fn = |err| eprintln!("Audio DSP Stream Error: {}", err);

    match sample_format {
        SampleFormat::F32 => {
            let stream_config: cpal::StreamConfig = config.into();
            device.build_output_stream(
                &stream_config,
                move |data: &mut [f32], _| {
                    process_audio_f32(data, channels, &v_gain, &i_gain, &b_gain, &spec);
                },
                err_fn,
                None,
            )
        }
        _ => Err(cpal::BuildStreamError::StreamConfigNotSupported),
    }
    .map_err(|e| format!("Failed to build DSP stream: {}", e))
}

fn process_audio_f32(
    data: &mut [f32],
    channels: usize,
    vocal_gain: &AtomicU32,
    inst_gain: &AtomicU32,
    bass_gain: &AtomicU32,
    spectrum: &Mutex<[f32; 16]>,
) {
    if channels < 2 {
        return;
    }

    let v_gain = vocal_gain.load(Ordering::Relaxed) as f32 / 100.0;
    let i_gain = inst_gain.load(Ordering::Relaxed) as f32 / 100.0;
    let _b_gain = bass_gain.load(Ordering::Relaxed) as f32 / 100.0;

    let mut local_peaks = [0.0f32; 16];

    for (frame_idx, frame) in data.chunks_exact_mut(channels).enumerate() {
        let left = frame[0];
        let right = frame[1];

        // Center = Lead Vocals (L + R) * 0.5
        let center = (left + right) * 0.5;
        // Side = Stereo Instrumental Difference (L - R) * 0.5
        let side = (left - right) * 0.5;

        // Apply Phase-Cancellation & Stem Gains
        let out_left = (side * i_gain) + (center * v_gain);
        let out_right = (-side * i_gain) + (center * v_gain);

        frame[0] = out_left.clamp(-1.0, 1.0);
        frame[1] = out_right.clamp(-1.0, 1.0);

        // Sample peak for visualizer (16 bands)
        let band = frame_idx % 16;
        let mag = (out_left.abs() + out_right.abs()) * 0.5;
        if mag > local_peaks[band] {
            local_peaks[band] = mag;
        }
    }

    if let Ok(mut peaks) = spectrum.try_lock() {
        for i in 0..16 {
            peaks[i] = peaks[i] * 0.8 + local_peaks[i] * 0.2;
        }
    }
}

#[cfg(target_os = "windows")]
fn mute_app_by_name(app_pattern: &str, mute: bool) -> Result<bool, String> {
    use windows::core::Interface;
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};
    use windows::Win32::Media::Audio::*;

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let enumerator: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
            .map_err(|e| format!("IMMDeviceEnumerator failed: {}", e))?;

        let default_device = enumerator
            .GetDefaultAudioEndpoint(eRender, eMultimedia)
            .map_err(|e| format!("GetDefaultAudioEndpoint failed: {}", e))?;

        let session_manager: IAudioSessionManager2 = default_device
            .Activate(CLSCTX_ALL, None)
            .map_err(|e| format!("IAudioSessionManager2 failed: {}", e))?;

        let session_enum = session_manager
            .GetSessionEnumerator()
            .map_err(|e| format!("GetSessionEnumerator failed: {}", e))?;

        let count = session_enum.GetCount().map_err(|e| format!("GetCount failed: {}", e))?;
        let pat = app_pattern.to_lowercase();

        let mut matched = false;
        for i in 0..count {
            if let Ok(session) = session_enum.GetSession(i) {
                if let Ok(session2) = session.cast::<IAudioSessionControl2>() {
                    if let Ok(id_h) = session2.GetSessionIdentifier() {
                        let id_str = id_h.to_string().unwrap_or_default().to_lowercase();
                        if id_str.contains(&pat) && !id_str.contains("maudio") {
                            if let Ok(vol) = session.cast::<ISimpleAudioVolume>() {
                                let _ = vol.SetMute(mute, std::ptr::null());
                                matched = true;
                            }
                        }
                    }
                }
            }
        }
        Ok(matched)
    }
}
