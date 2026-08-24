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
        GlobalSystemMediaTransportControlsSession,
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    };
    use windows::Storage::Streams::{DataReader, InputStreamOptions};

    pub async fn get_current_media_state() -> Result<MediaState, String> {
        let manager_op = match GlobalSystemMediaTransportControlsSessionManager::RequestAsync() {
            Ok(op) => op,
            Err(e) => return Err(e.to_string()),
        };
        let manager = match manager_op.get() {
            Ok(m) => m,
            Err(e) => return Err(e.to_string()),
        };

        // Try getting current session, or fallback to first active playing session in GetSessions()
        let session: Option<GlobalSystemMediaTransportControlsSession> = if let Ok(s) = manager.GetCurrentSession() {
            Some(s)
        } else if let Ok(sessions) = manager.GetSessions() {
            let mut playing_session = None;
            let mut fallback_session = None;
            if let Ok(count) = sessions.Size() {
                for i in 0..count {
                    if let Ok(s) = sessions.GetAt(i) {
                        if let Ok(info) = s.GetPlaybackInfo() {
                            if info.PlaybackStatus() == Ok(GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing) {
                                playing_session = Some(s);
                                break;
                            }
                        }
                        if fallback_session.is_none() {
                            fallback_session = Some(s);
                        }
                    }
                }
            }
            playing_session.or(fallback_session)
        } else {
            None
        };

        let session = match session {
            Some(s) => s,
            None => return Ok(MediaState::default()),
        };

        fn clean_app_name(raw: &str) -> String {
            let lower = raw.to_lowercase();
            if lower.contains("applemusic") || lower.contains("apple.music") {
                "Apple Music".to_string()
            } else if lower.contains("spotify") {
                "Spotify".to_string()
            } else if lower.contains("youtube") {
                "YouTube Music".to_string()
            } else if lower.contains("tidal") {
                "Tidal".to_string()
            } else if lower.contains("vlc") {
                "VLC Media Player".to_string()
            } else if lower.contains("foobar") {
                "Foobar2000".to_string()
            } else if lower.contains("chrome") {
                "Google Chrome".to_string()
            } else if lower.contains("edge") || lower.contains("edg") {
                "Microsoft Edge".to_string()
            } else if lower.contains("firefox") {
                "Firefox".to_string()
            } else if lower.contains("brave") {
                "Brave".to_string()
            } else if lower.contains("opera") {
                "Opera".to_string()
            } else if lower.contains("musicbee") {
                "MusicBee".to_string()
            } else if lower.contains("itunes") {
                "iTunes".to_string()
            } else if lower.contains("aimp") {
                "AIMP".to_string()
            } else {
                let clean = raw.split('!').next().unwrap_or(raw);
                let clean = clean.split('_').next().unwrap_or(clean);
                clean.to_string()
            }
        }

        let raw_app_id = session.SourceAppUserModelId().map(|h| h.to_string()).ok();
        let app_id = raw_app_id.as_deref().map(clean_app_name);

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

        let props_op = match session.TryGetMediaPropertiesAsync() {
            Ok(op) => op,
            Err(_) => return Ok(MediaState::default()),
        };
        let props = match props_op.get() {
            Ok(p) => p,
            Err(_) => return Ok(MediaState::default()),
        };

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

        let session = if let Ok(s) = manager.GetCurrentSession() {
            Some(s)
        } else if let Ok(sessions) = manager.GetSessions() {
            if let Ok(count) = sessions.Size() {
                if count > 0 {
                    sessions.GetAt(0).ok()
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        };

        let session = match session {
            Some(s) => s,
            None => return Ok(false),
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
