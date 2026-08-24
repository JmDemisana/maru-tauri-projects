import React from "react";
import { motion } from "framer-motion";
import { MediaState } from "../types";
import { Play, Pause, SkipBack, SkipForward, Disc3, Cast, CloudUpload, Volume2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface DesktopPlayerBarProps {
  mediaState: MediaState;
  onClickDetails: () => void;
}

export const DesktopPlayerBar: React.FC<DesktopPlayerBarProps> = ({
  mediaState,
  onClickDetails,
}) => {
  const handleControl = async (e: React.MouseEvent, cmd: string) => {
    e.stopPropagation();
    try {
      await invoke("send_media_control", { command: cmd });
    } catch (err) {
      console.error(err);
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
        height: "64px",
        minHeight: "64px",
        background: "rgba(18, 13, 31, 0.95)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        zIndex: 50,
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {/* 1. Left: Track Info & Artwork */}
      <div
        onClick={onClickDetails}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          width: "280px",
          cursor: mediaState.title ? "pointer" : "default",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "8px",
            background: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
          }}
        >
          {mediaState.artwork_base64 ? (
            <img src={mediaState.artwork_base64} alt="Art" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Disc3 size={24} color="var(--maru-accent-pink)" className={mediaState.is_playing ? "animate-spin" : ""} />
          )}
        </div>

        <div style={{ overflow: "hidden", flex: 1 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#f4f4f9fa",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {mediaState.title || "No Track Playing"}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--maru-accent-pink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginTop: "1px",
            }}
          >
            {mediaState.artist || (mediaState.app_name ? `Active (${mediaState.app_name})` : "Idle session")}
          </div>
        </div>
      </div>

      {/* 2. Center: Controls & Timeline */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          flex: 1,
          maxWidth: "480px",
        }}
      >
        {/* Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => handleControl(e, "previous")}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(235, 235, 245, 0.7)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SkipBack size={18} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={(e) => handleControl(e, "toggle")}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "var(--maru-accent-pink)",
              border: "none",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(232, 93, 159, 0.4)",
            }}
          >
            {mediaState.is_playing ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: "2px" }} />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => handleControl(e, "next")}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(235, 235, 245, 0.7)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SkipForward size={18} />
          </motion.button>
        </div>

        {/* Progress Bar & Timestamps */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
          <span style={{ fontSize: "10px", color: "rgba(235, 235, 245, 0.45)", width: "32px", textAlign: "right" }}>
            {formatTime(mediaState.position_ms)}
          </span>

          <div
            style={{
              flex: 1,
              height: "4px",
              background: "rgba(255, 255, 255, 0.12)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--maru-accent-pink), var(--maru-accent-blue))",
                transition: "width 0.4s ease",
              }}
            />
          </div>

          <span style={{ fontSize: "10px", color: "rgba(235, 235, 245, 0.45)", width: "32px" }}>
            {formatTime(mediaState.duration_ms)}
          </span>
        </div>
      </div>

      {/* 3. Right: Equalizer Visualizer & Badges */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "280px", justifyContent: "flex-end" }}>
        {mediaState.is_playing && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "16px" }}>
            {[14, 8, 16, 10].map((h, i) => (
              <span
                key={i}
                style={{
                  width: "3px",
                  height: `${h}px`,
                  backgroundColor: "var(--maru-accent-pink)",
                  borderRadius: "1.5px",
                  animation: `eqBounce 0.8s ease-in-out infinite alternate ${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}

        <div
          style={{
            fontSize: "10px",
            fontWeight: 800,
            padding: "4px 10px",
            borderRadius: "20px",
            background: mediaState.is_playing ? "rgba(74, 222, 128, 0.15)" : "rgba(255, 255, 255, 0.06)",
            color: mediaState.is_playing ? "#4ade80" : "rgba(235, 235, 245, 0.5)",
            border: mediaState.is_playing ? "1px solid rgba(74, 222, 128, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {mediaState.is_playing ? "WINDOWS GSMTC" : "IDLE"}
        </div>
      </div>
    </div>
  );
};
