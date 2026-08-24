use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, Stream};

pub struct DspEngine {
    pub is_active: Arc<AtomicBool>,
    pub vocal_gain: Arc<AtomicU32>,
    pub inst_gain: Arc<AtomicU32>,
    pub bass_gain: Arc<AtomicU32>,
    pub spectrum_peaks: Arc<Mutex<[f32; 16]>>,
    stream: Option<Stream>,
}

impl DspEngine {
    pub fn new() -> Self {
        Self {
            is_active: Arc::new(AtomicBool::new(false)),
            vocal_gain: Arc::new(AtomicU32::new(10)),
            inst_gain: Arc::new(AtomicU32::new(100)),
            bass_gain: Arc::new(AtomicU32::new(100)),
            spectrum_peaks: Arc::new(Mutex::new([0.0; 16])),
            stream: None,
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

    pub fn start(&mut self) -> Result<bool, String> {
        if self.is_active.load(Ordering::Relaxed) {
            return Ok(true);
        }

        let host = cpal::default_host();
        let device = host
            .default_output_device()
            .ok_or_else(|| "No default audio output device found".to_string())?;

        let config = device
            .default_output_config()
            .map_err(|e| format!("Failed to get default output config: {}", e))?;

        let sample_format = config.sample_format();
        let channels = config.channels() as usize;

        let is_active = Arc::clone(&self.is_active);
        let vocal_gain = Arc::clone(&self.vocal_gain);
        let inst_gain = Arc::clone(&self.inst_gain);
        let bass_gain = Arc::clone(&self.bass_gain);
        let spectrum = Arc::clone(&self.spectrum_peaks);

        let err_fn = |err| eprintln!("Audio DSP Stream Error: {}", err);

        let stream = match sample_format {
            SampleFormat::F32 => {
                let stream_config: cpal::StreamConfig = config.into();
                device.build_output_stream(
                    &stream_config,
                    move |data: &mut [f32], _| {
                        process_audio_f32(data, channels, &vocal_gain, &inst_gain, &bass_gain, &spectrum);
                    },
                    err_fn,
                    None,
                )
            }
            _ => return Err("Unsupported sample format".to_string()),
        }.map_err(|e| format!("Failed to build DSP output stream: {}", e))?;

        stream.play().map_err(|e| format!("Failed to play DSP stream: {}", e))?;

        self.stream = Some(stream);
        self.is_active.store(true, Ordering::Relaxed);
        Ok(true)
    }

    pub fn stop(&mut self) {
        self.is_active.store(false, Ordering::Relaxed);
        self.stream = None;
    }
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
