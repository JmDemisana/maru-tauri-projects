import React, { useState } from "react";
import { Activity, ShieldCheck, CheckCircle2, Sliders, Music, Radio } from "lucide-react";
import { MediaState } from "../types";

interface LocalScreenProps {
  mediaState: MediaState;
}

export const LocalScreen: React.FC<LocalScreenProps> = ({ mediaState }) => {
  const [localEnabled, setLocalEnabled] = useState(true);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 24px 36px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        maxWidth: "1100px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* 1. Master Tile: Local Media Monitor */}
      <div
        className="glass-card"
        style={{
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: localEnabled
            ? "1px solid rgba(232, 93, 159, 0.6)"
            : "1px solid rgba(255, 255, 255, 0.094)",
        }}
      >
        <div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#f4f4f9fa" }}>
            LOCAL MEDIA MONITOR
          </div>
          <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)", marginTop: "2px" }}>
            Intercept active Windows media sessions and mirror them into MAudio alerts.
          </div>
        </div>

        <input
          type="checkbox"
          checked={localEnabled}
          onChange={(e) => setLocalEnabled(e.target.checked)}
          style={{ width: "20px", height: "20px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
        />
      </div>

      {/* 2. Active Session Card */}
      <div
        className="glass-card"
        style={{
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "12px",
            background: "rgba(255, 255, 255, 0.1)",
            overflow: "hidden",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {mediaState.artwork_base64 ? (
            <img src={mediaState.artwork_base64} alt="Art" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Activity size={28} color="var(--maru-accent-blue)" />
          )}
        </div>

        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "#f4f4f9fa" }}>
            {mediaState.title || "No Media Playing"}
          </div>
          <div style={{ fontSize: "12px", color: "var(--maru-accent-pink)", marginTop: "2px" }}>
            {mediaState.artist || "Idle session"}
          </div>
        </div>

        <div
          style={{
            fontSize: "10px",
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: "24px",
            background: mediaState.is_playing ? "rgba(74, 222, 128, 0.2)" : "rgba(255, 255, 255, 0.1)",
            color: mediaState.is_playing ? "#4ade80" : "rgba(235, 235, 245, 0.72)",
          }}
        >
          {mediaState.is_playing ? "MONITORING ACTIVE" : "SESSION IDLE"}
        </div>
      </div>
    </div>
  );
};
