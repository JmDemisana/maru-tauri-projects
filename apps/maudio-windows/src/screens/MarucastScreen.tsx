import React, { useState, useEffect } from "react";
import { Cast, Volume2, CheckCircle2, RotateCw, Mic, Sliders, Music, Sparkles } from "lucide-react";

export const MarucastScreen: React.FC = () => {
  const [pin, setPin] = useState("842 109");
  const [countdown, setCountdown] = useState(120);
  const [isConnected, setIsConnected] = useState(false);
  const [latencyOffset, setLatencyOffset] = useState(0);
  const [karaokeMode, setKaraokeMode] = useState(false);

  // Generate random 6-digit PIN formatted with a space
  const generateNewPin = () => {
    const p1 = Math.floor(100 + Math.random() * 900);
    const p2 = Math.floor(100 + Math.random() * 900);
    setPin(`${p1} ${p2}`);
    setCountdown(120);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          generateNewPin();
          return 120;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const sampleLyrics = [
    { time: "0:12", text: "Ready for the stage tonight" },
    { time: "0:18", text: "Dancing through the neon light" },
    { time: "0:24", text: "Feel the rhythm take control" },
    { time: "0:30", text: "Lossless audio for the soul", active: true },
    { time: "0:36", text: "Singing out in perfect sync" },
    { time: "0:42", text: "Faster than you even think" },
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
        maxWidth: "1300px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Top Banner */}
      <div
        className="glass-card"
        style={{
          width: "100%",
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(112, 165, 255, 0.08) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(167, 139, 250, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--maru-accent-purple)",
            }}
          >
            <Cast size={24} />
          </div>
          <div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: "#fafcff" }}>
              Marucast Receiver for Windows
            </div>
            <div style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.55)", marginTop: "2px" }}>
              Stream lossless audio & synchronized lyrics directly to your PC speakers from your phone
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Volume2 size={16} color="var(--maru-success)" />
          <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--maru-success)" }}>
            PC Speakers Ready
          </span>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "28px", alignItems: "start" }}>
        {/* Left Column: PIN Pairing & Broadcast Tuning */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* 6-Digit PIN Display Card */}
          <div
            className="glass-card"
            style={{
              padding: "36px 28px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              border: "1.5px solid rgba(167, 139, 250, 0.35)",
              boxShadow: "0 0 36px rgba(167, 139, 250, 0.18)",
              background: "linear-gradient(180deg, rgba(22, 27, 46, 0.85) 0%, rgba(15, 19, 34, 0.95) 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "999px",
                background: "rgba(167, 139, 250, 0.18)",
                color: "var(--maru-accent-purple)",
                fontSize: "12px",
                fontWeight: 800,
              }}
            >
              <RotateCw size={12} className="animate-spin" />
              <span>PIN refreshes in {countdown}s</span>
            </div>

            <div
              style={{
                fontSize: "48px",
                fontWeight: 900,
                letterSpacing: "8px",
                fontFamily: "monospace",
                color: "#fafcff",
                textShadow: "0 0 24px rgba(167, 139, 250, 0.7)",
                padding: "8px 0",
              }}
            >
              {pin}
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.6)",
                textAlign: "center",
                maxWidth: "340px",
                lineHeight: 1.5,
              }}
            >
              Open <strong style={{ color: "var(--maru-accent-pink)" }}>MAudio on your phone</strong>, go to Marucast, and enter this PIN to connect.
            </div>

            <button
              onClick={generateNewPin}
              style={{
                marginTop: "4px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "rgba(255, 255, 255, 0.8)",
                borderRadius: "999px",
                padding: "8px 18px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Generate Fresh PIN
            </button>
          </div>

          {/* Stream Tuning & Karaoke Controls */}
          <div className="glass-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ fontSize: "14.5px", fontWeight: 800, color: "#fafcff" }}>
              Broadcast Tuning Controls
            </div>

            {/* Karaoke Vocal Reducer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Mic size={18} color="var(--maru-accent-pink)" />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>Karaoke Vocal Reducer</div>
                  <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.45)" }}>
                    Center-channel phase vocal suppression
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={karaokeMode}
                onChange={(e) => setKaraokeMode(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
              />
            </div>

            {/* Latency Tuning Presets */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>Lyrics Timing Offset</span>
                <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--maru-accent-blue)" }}>
                  {latencyOffset > 0 ? `+${latencyOffset}ms` : `${latencyOffset}ms`}
                </span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {[-500, -100, 0, 100, 500].map((offset) => (
                  <button
                    key={offset}
                    onClick={() => setLatencyOffset(offset === 0 ? 0 : latencyOffset + offset)}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fafcff",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {offset === 0 ? "Reset" : offset > 0 ? `+${offset}` : offset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Synced Lyrics Canvas */}
        <div
          className="glass-card"
          style={{
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            minHeight: "440px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#fafcff" }}>
              Synchronized Lyrics Canvas
            </div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "999px",
                background: "rgba(112, 165, 255, 0.15)",
                color: "var(--maru-accent-blue)",
              }}
            >
              LIVE SYNC
            </div>
          </div>

          {/* Lyrics lines */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              padding: "16px 8px",
              overflowY: "auto",
              textAlign: "center",
            }}
          >
            {sampleLyrics.map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: line.active ? "20px" : "15px",
                  fontWeight: line.active ? 900 : 500,
                  color: line.active ? "var(--maru-accent-pink)" : "rgba(255, 255, 255, 0.35)",
                  textShadow: line.active ? "0 0 16px rgba(255, 113, 162, 0.6)" : "none",
                  transition: "all 300ms ease",
                  transform: line.active ? "scale(1.05)" : "scale(1)",
                }}
              >
                {line.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
