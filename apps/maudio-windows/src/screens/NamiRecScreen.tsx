import React, { useState } from "react";
import { Disc, Play, Pause, Sparkles, RefreshCw, Calendar, Music } from "lucide-react";

interface NamiRecScreenProps {
  username: string;
}

export const NamiRecScreen: React.FC<NamiRecScreenProps> = ({ username }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("August 2026");

  const monthlyPicks = [
    { title: "Lavie", artist: "THREEE feat. Kagamine Len", plays: 84, date: "Aug 12" },
    { title: "Kira Kira", artist: "Pastel*Palettes", plays: 62, date: "Aug 8" },
    { title: "Echo", artist: "Crusher-P feat. GUMI", plays: 57, date: "Aug 3" },
    { title: "World is Mine", artist: "supercell feat. Hatsune Miku", plays: 49, date: "Aug 1" },
  ];

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 32px 40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1000px",
        margin: "0 auto",
        width: "100%",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#fafcff" }}>NamiRec Studio</h2>
          <p style={{ fontSize: "13px", color: "var(--maru-accent-pink)", marginTop: "2px" }}>
            Monthly audio retrospectives and cassette memory tapes
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", padding: "6px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 700 }}>
          <Calendar size={14} color="var(--maru-accent-blue)" />
          <span>{selectedMonth}</span>
        </div>
      </div>

      {/* Cassette Tape Deck Card */}
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "28px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          background: "linear-gradient(135deg, #1c2236 0%, #0f1424 100%)",
          border: "2px solid rgba(255, 113, 162, 0.3)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6)",
          borderRadius: "20px",
        }}
      >
        {/* Cassette Tape Face */}
        <div
          style={{
            width: "100%",
            height: "160px",
            background: "#080b14",
            borderRadius: "14px",
            border: "1.5px solid rgba(255, 255, 255, 0.12)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "12px 18px",
            boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.8)",
          }}
        >
          {/* Tape Label Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "1px" }}>
              NAMI TAPE • 90 MIN
            </span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
              SIDE A
            </span>
          </div>

          {/* Cassette Center Spools Window */}
          <div
            style={{
              width: "100%",
              height: "64px",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              padding: "0 40px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            {/* Left Spool */}
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "3px dashed var(--maru-accent-pink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: isPlaying ? "spin 3s linear infinite" : "none",
              }}
            >
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ffffff" }} />
            </div>

            {/* Tape bridge */}
            <div style={{ height: "4px", flex: 1, margin: "0 12px", background: "rgba(255,255,255,0.15)", borderRadius: "2px" }} />

            {/* Right Spool */}
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "3px dashed var(--maru-accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: isPlaying ? "spin 3s linear infinite" : "none",
              }}
            >
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ffffff" }} />
            </div>
          </div>

          {/* Tape Label Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
            <span>{username}'s Month in Review</span>
            <span style={{ color: "var(--maru-accent-blue)", fontWeight: 700 }}>HIGH BIAS</span>
          </div>
        </div>

        {/* Cassette Deck Transport Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              padding: "10px 24px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, var(--maru-accent-pink), #e0437b)",
              border: "none",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(255, 113, 162, 0.5)",
            }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span>{isPlaying ? "Pause Tape" : "Play Memory Reel"}</span>
          </button>
        </div>
      </div>

      {/* Track Listing Breakdown */}
      <div style={{ width: "100%", maxWidth: "700px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#fafcff", marginBottom: "4px" }}>
          Featured Tracks on this Tape
        </div>
        {monthlyPicks.map((t, idx) => (
          <div
            key={idx}
            className="glass-card-subtle"
            style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--maru-accent-pink)" }}>
                {idx + 1}.
              </span>
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#fafcff" }}>{t.title}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "1px" }}>{t.artist}</div>
              </div>
            </div>
            <div style={{ fontSize: "12px", color: "var(--maru-accent-blue)", fontWeight: 700 }}>
              {t.plays} plays
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
