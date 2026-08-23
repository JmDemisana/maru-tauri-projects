import React, { useState, useEffect } from "react";
import { MediaState } from "../types";
import { EqualizerHUD } from "../components/EqualizerHUD";
import { invoke } from "@tauri-apps/api/core";
import { Play, Pause, SkipBack, SkipForward, Radio, Disc3, ShieldCheck, CheckCircle2, Sliders } from "lucide-react";

export const ScrobblingScreen: React.FC = () => {
  const [mediaState, setMediaState] = useState<MediaState>({
    title: null,
    artist: null,
    album: null,
    app_name: null,
    is_playing: false,
    position_ms: null,
    duration_ms: null,
    artwork_base64: null,
  });
  const [scrobbleEnabled, setScrobbleEnabled] = useState(true);
  const [scrobblePercentage, setScrobblePercentage] = useState(50);

  const pollMedia = async () => {
    try {
      const state = await invoke<MediaState>("get_media_state");
      if (state) {
        setMediaState(state);
      }
    } catch (e) {
      console.warn("Failed to query GSMTC media state:", e);
    }
  };

  useEffect(() => {
    pollMedia();
    const timer = setInterval(pollMedia, 1500);
    return () => clearInterval(timer);
  }, []);

  const handleControl = async (command: string) => {
    try {
      await invoke("send_media_control", { command });
      setTimeout(pollMedia, 200);
    } catch (e) {
      console.error("Failed to send media control:", e);
    }
  };

  const formatTime = (ms: number | null) => {
    if (!ms) return "0:00";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPct =
    mediaState.position_ms && mediaState.duration_ms && mediaState.duration_ms > 0
      ? Math.min(100, Math.max(0, (mediaState.position_ms / mediaState.duration_ms) * 100))
      : 0;

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 32px 40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1300px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Top Banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#fafcff" }}>Windows Media Scrobbler HUD</h2>
          <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)", marginTop: "2px" }}>
            Real-time Windows GSMTC listener, equalizer analyzer, and auto-scrobbler
          </p>
        </div>

        <div
          className="glass-card-subtle"
          style={{
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: mediaState.is_playing ? "#4ade80" : "rgba(255,255,255,0.3)",
              boxShadow: mediaState.is_playing ? "0 0 10px #4ade80" : "none",
            }}
          />
          <span>{mediaState.is_playing ? "PLAYING" : "IDLE"}</span>
          <EqualizerHUD isPlaying={mediaState.is_playing} />
        </div>
      </div>

      {/* Two-Column Workspace Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "28px", alignItems: "start" }}>
        {/* Left Column: Player Card with Album Art & Controls */}
        <div
          className="glass-card"
          style={{
            padding: "32px 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
            background: "linear-gradient(135deg, rgba(22, 27, 46, 0.8) 0%, rgba(15, 19, 34, 0.95) 100%)",
            border: "1.5px solid rgba(255, 113, 162, 0.2)",
          }}
        >
          {/* Album Artwork & Aura Glow */}
          <div
            style={{
              position: "relative",
              width: "280px",
              height: "280px",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "-12px",
                borderRadius: "32px",
                background: mediaState.is_playing
                  ? "radial-gradient(circle, rgba(255, 113, 162, 0.45) 0%, rgba(112, 165, 255, 0.2) 60%, transparent 80%)"
                  : "radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)",
                filter: "blur(18px)",
                transition: "all 500ms ease",
              }}
            />

            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: "24px",
                overflow: "hidden",
                border: "2px solid rgba(255, 255, 255, 0.14)",
                boxShadow: "0 16px 36px rgba(0, 0, 0, 0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0f1424",
              }}
            >
              {mediaState.artwork_base64 ? (
                <img
                  src={mediaState.artwork_base64}
                  alt="Cover Art"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                    color: "rgba(255, 255, 255, 0.3)",
                  }}
                >
                  <Disc3 size={64} className={mediaState.is_playing ? "animate-spin" : ""} />
                  <span style={{ fontSize: "13px", fontWeight: 700 }}>Windows Media Stream</span>
                </div>
              )}
            </div>
          </div>

          {/* Track Info */}
          <div style={{ width: "100%", textAlign: "center", padding: "0 12px" }}>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 900,
                color: "#fafcff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {mediaState.title || "No Media Playing"}
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "var(--maru-accent-pink)",
                marginTop: "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {mediaState.artist || "Play a track in Spotify, Apple Music, or Browser"}
            </div>
            {mediaState.album && (
              <div
                style={{
                  fontSize: "12.5px",
                  color: "rgba(255, 255, 255, 0.45)",
                  marginTop: "3px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {mediaState.album}
              </div>
            )}
          </div>

          {/* Progress & Duration Slider */}
          <div style={{ width: "100%", padding: "0 10px" }}>
            <div
              style={{
                width: "100%",
                height: "6px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.08)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  borderRadius: "999px",
                  background: "linear-gradient(90deg, var(--maru-accent-pink), var(--maru-accent-blue))",
                  boxShadow: "0 0 10px rgba(255, 113, 162, 0.7)",
                  transition: "width 300ms linear",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "8px",
                fontSize: "11.5px",
                color: "rgba(255, 255, 255, 0.4)",
                fontWeight: 700,
              }}
            >
              <span>{formatTime(mediaState.position_ms)}</span>
              <span>{formatTime(mediaState.duration_ms)}</span>
            </div>
          </div>

          {/* Transport Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <button
              onClick={() => handleControl("previous")}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#fafcff",
                cursor: "pointer",
                padding: "12px",
                borderRadius: "50%",
              }}
            >
              <SkipBack size={22} />
            </button>

            <button
              onClick={() => handleControl("playpause")}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--maru-accent-pink), #e0437b)",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(255, 113, 162, 0.55)",
              }}
            >
              {mediaState.is_playing ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: "3px" }} />}
            </button>

            <button
              onClick={() => handleControl("next")}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#fafcff",
                cursor: "pointer",
                padding: "12px",
                borderRadius: "50%",
              }}
            >
              <SkipForward size={22} />
            </button>
          </div>
        </div>

        {/* Right Column: Scrobbler Controls & Preferences */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Master Scrobbler Switch Card */}
          <div className="glass-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#fafcff" }}>
                  Last.fm Scrobbler Engine
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.45)", marginTop: "2px" }}>
                  Automatically scrobbles tracks from active Windows apps
                </div>
              </div>

              <input
                type="checkbox"
                checked={scrobbleEnabled}
                onChange={(e) => setScrobbleEnabled(e.target.checked)}
                style={{ width: "20px", height: "20px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
              />
            </div>

            {/* Scrobble Threshold Percentage */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>Scrobble Point Threshold</span>
                <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--maru-accent-pink)" }}>
                  {scrobblePercentage}%
                </span>
              </div>
              <input
                type="range"
                min={25}
                max={100}
                step={5}
                value={scrobblePercentage}
                onChange={(e) => setScrobblePercentage(parseInt(e.target.value, 10))}
                style={{ width: "100%", accentColor: "var(--maru-accent-pink)" }}
              />
            </div>
          </div>

          {/* Whitelisted Music Apps */}
          <div className="glass-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ fontSize: "14.5px", fontWeight: 800, color: "#fafcff" }}>
              Supported Windows Players
            </div>
            {[
              { name: "Spotify Desktop", desc: "Native Win32 desktop app" },
              { name: "Apple Music for Windows", desc: "Native WinUI 3 store app" },
              { name: "Chrome, Edge & Firefox", desc: "YouTube, Bandcamp, SoundCloud web players" },
              { name: "Foobar2000, AIMP, MusicBee", desc: "Local audio players with SMTC integration" },
            ].map((app, i) => (
              <div
                key={i}
                className="glass-card-subtle"
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>{app.name}</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{app.desc}</div>
                </div>
                <CheckCircle2 size={16} color="var(--maru-success)" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
