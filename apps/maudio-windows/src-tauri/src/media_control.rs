use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaState {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub app_name: Option<String>,
    pub is_playing: bool,
    pub position_ms: Option<u64>,
    pub duration_ms: Option<u64>,
    pub artwork_base64: Option<String>,
}

impl Default for MediaState {
    fn default() -> Self {
        Self {
            title: None,
            artist: None,
            album: None,
            app_name: None,
            is_playing: false,
            position_ms: None,
            duration_ms: None,
            artwork_base64: None,
        }
    }
}

#[cfg(target_os = "windows")]
pub mod windows_impl {
    use super::MediaState;
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    };
    use windows::Storage::Streams::{DataReader, InputStreamOptions};

    pub async fn get_current_media_state() -> Result<MediaState, String> {
        let manager_op = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
            .map_err(|e| e.to_string())?;
        let manager = manager_op.get().map_err(|e| e.to_string())?;

        let session = match manager.GetCurrentSession() {
            Ok(s) => s,
            Err(_) => return Ok(MediaState::default()),
        };

        let app_id = session.SourceAppUserModelId().map(|h| h.to_string()).ok();

        let is_playing = session
            .GetPlaybackInfo()
            .map(|info| info.PlaybackStatus() == Ok(GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing))
            .unwrap_or(false);

        let timeline = session.GetTimelineProperties().ok();
        let (position_ms, duration_ms) = if let Some(t) = timeline {
            let pos = t.Position().map(|ts| ts.Duration as u64 / 10_000).ok();
            let dur = t.EndTime().map(|ts| ts.Duration as u64 / 10_000).ok();
            (pos, dur)
        } else {
            (None, None)
        };

        let props_op = session
            .TryGetMediaPropertiesAsync()
            .map_err(|e| e.to_string())?;
        let props = props_op.get().map_err(|e| e.to_string())?;

        let title = props.Title().map(|h| h.to_string()).ok().filter(|s| !s.is_empty());
        let artist = props.Artist().map(|h| h.to_string()).ok().filter(|s| !s.is_empty());
        let album = props.AlbumTitle().map(|h| h.to_string()).ok().filter(|s| !s.is_empty());

        let mut artwork_base64 = None;
        if let Ok(thumb_ref) = props.Thumbnail() {
            if let Ok(stream_op) = thumb_ref.OpenReadAsync() {
                if let Ok(stream) = stream_op.get() {
                    if let Ok(size) = stream.Size() {
                        if size > 0 && size < 10_000_000 {
                            if let Ok(reader) = DataReader::CreateDataReader(&stream) {
                                let _ = reader.SetInputStreamOptions(InputStreamOptions::None);
                                if let Ok(load_op) = reader.LoadAsync(size as u32) {
                                    if load_op.get().is_ok() {
                                        let mut bytes = vec![0u8; size as usize];
                                        if reader.ReadBytes(&mut bytes).is_ok() {
                                            use base64::Engine;
                                            let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
                                            artwork_base64 = Some(format!("data:image/jpeg;base64,{}", encoded));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(MediaState {
            title,
            artist,
            album,
            app_name: app_id,
            is_playing,
            position_ms,
            duration_ms,
            artwork_base64,
        })
    }

    pub async fn control_playback(command: &str) -> Result<bool, String> {
        let manager_op = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
            .map_err(|e| e.to_string())?;
        let manager = manager_op.get().map_err(|e| e.to_string())?;

        let session = match manager.GetCurrentSession() {
            Ok(s) => s,
            Err(_) => return Ok(false),
        };

        match command {
            "play" => {
                let op = session.TryPlayAsync().map_err(|e| e.to_string())?;
                op.get().map_err(|e| e.to_string())
            }
            "pause" => {
                let op = session.TryPauseAsync().map_err(|e| e.to_string())?;
                op.get().map_err(|e| e.to_string())
            }
            "playpause" | "toggle" => {
                let op = session.TryTogglePlayPauseAsync().map_err(|e| e.to_string())?;
                op.get().map_err(|e| e.to_string())
            }
            "next" | "skip_next" => {
                let op = session.TrySkipNextAsync().map_err(|e| e.to_string())?;
                op.get().map_err(|e| e.to_string())
            }
            "previous" | "skip_previous" => {
                let op = session.TrySkipPreviousAsync().map_err(|e| e.to_string())?;
                op.get().map_err(|e| e.to_string())
            }
            _ => Ok(false),
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub mod windows_impl {
    use super::MediaState;

    pub async fn get_current_media_state() -> Result<MediaState, String> {
        Ok(MediaState::default())
    }

    pub async fn control_playback(_command: &str) -> Result<bool, String> {
        Ok(false)
    }
}
