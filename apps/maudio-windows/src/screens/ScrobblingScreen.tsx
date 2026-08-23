import React, { useState, useEffect } from "react";
import { MediaState } from "../types";
import { EqualizerHUD } from "../components/EqualizerHUD";
import { invoke } from "@tauri-apps/api/core";
import { Play, Pause, SkipBack, SkipForward, Radio, Disc3, ShieldCheck } from "lucide-react";

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
        padding: "16px 14px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        alignItems: "center",
      }}
    >
      {/* Top Scrobble Status Header */}
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 2px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: mediaState.is_playing ? "#4ade80" : "rgba(255,255,255,0.3)",
              boxShadow: mediaState.is_playing ? "0 0 10px #4ade80" : "none",
            }}
          />
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.4px" }}>
            {mediaState.is_playing ? "ACTIVE WINDOWS MEDIA" : "READY FOR PLAYBACK"}
          </span>
        </div>

        <EqualizerHUD isPlaying={mediaState.is_playing} />
      </div>

      {/* Album Artwork & Aura Card */}
      <div
        style={{
          position: "relative",
          width: "240px",
          height: "240px",
          marginTop: "10px",
        }}
      >
        {/* Breathing aura background */}
        <div
          style={{
            position: "absolute",
            inset: "-8px",
            borderRadius: "28px",
            background: mediaState.is_playing
              ? "radial-gradient(circle, rgba(255, 113, 162, 0.4) 0%, rgba(112, 165, 255, 0.2) 60%, transparent 80%)"
              : "radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)",
            filter: "blur(14px)",
            transition: "all 500ms ease",
          }}
        />

        <div
          className="glass-card"
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: "24px",
            overflow: "hidden",
            border: "1.5px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
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
                gap: "10px",
                color: "rgba(255, 255, 255, 0.25)",
              }}
            >
              <Disc3 size={56} className={mediaState.is_playing ? "animate-spin" : ""} />
              <span style={{ fontSize: "12px", fontWeight: 600 }}>Windows Media Stream</span>
            </div>
          )}
        </div>
      </div>

      {/* Track Metadata Info */}
      <div style={{ width: "100%", textAlign: "center", padding: "0 10px" }}>
        <div
          style={{
            fontSize: "17px",
            fontWeight: 800,
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
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--maru-accent-pink)",
            marginTop: "4px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {mediaState.artist || "Play a song in Spotify, Apple Music, or Browser"}
        </div>
        {mediaState.album && (
          <div
            style={{
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.45)",
              marginTop: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {mediaState.album}
          </div>
        )}
      </div>

      {/* Progress & Timestamps */}
      <div style={{ width: "100%", padding: "0 6px" }}>
        <div
          style={{
            width: "100%",
            height: "5px",
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
              boxShadow: "0 0 8px rgba(255, 113, 162, 0.6)",
              transition: "width 300ms linear",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "6px",
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.4)",
            fontWeight: 600,
          }}
        >
          <span>{formatTime(mediaState.position_ms)}</span>
          <span>{formatTime(mediaState.duration_ms)}</span>
        </div>
      </div>

      {/* Transport Controls */}
      <div
        className="glass-card"
        style={{
          width: "100%",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
        }}
      >
        <button
          onClick={() => handleControl("previous")}
          style={{
            background: "transparent",
            border: "none",
            color: "#fafcff",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "50%",
          }}
        >
          <SkipBack size={20} />
        </button>

        <button
          onClick={() => handleControl("playpause")}
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--maru-accent-pink), #e0437b)",
            border: "none",
            color: "#ffffff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(255, 113, 162, 0.5)",
          }}
        >
          {mediaState.is_playing ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: "2px" }} />}
        </button>

        <button
          onClick={() => handleControl("next")}
          style={{
            background: "transparent",
            border: "none",
            color: "#fafcff",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "50%",
          }}
        >
          <SkipForward size={20} />
        </button>
      </div>

      {/* Auto-Scrobble Service Badge */}
      <div
        className="glass-card-subtle"
        style={{
          width: "100%",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "12px",
        }}
      >
        <ShieldCheck size={16} color="var(--maru-success)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: "#fafcff" }}>Windows GSMTC Scrobbler</div>
          <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.45)" }}>
            Listening for system media events
          </div>
        </div>
        <Radio size={14} color="var(--maru-accent-blue)" />
      </div>
    </div>
  );
};
