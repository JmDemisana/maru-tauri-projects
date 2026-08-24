import React, { useState, useEffect } from "react";
import { Cast, Volume2, CheckCircle2, RotateCw, Mic, Music, Sparkles, Sliders, Radio } from "lucide-react";

export const MarucastScreen: React.FC = () => {
  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const [pin, setPin] = useState("842 109");
  const [inputPin, setInputPin] = useState("");
  const [countdown, setCountdown] = useState(120);
  const [isConnected, setIsConnected] = useState(false);
  const [latencyOffset, setLatencyOffset] = useState(0);
  const [karaokeMode, setKaraokeMode] = useState(false);
  const [audioSourceIsMic, setAudioSourceIsMic] = useState(false);

  // Generate random 6-digit PIN
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
      {/* 1. Master Tile: MARUCAST */}
      <div
        className="glass-card"
        style={{
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: isConnected
            ? "1px solid rgba(232, 93, 159, 0.6)"
            : "1px solid rgba(255, 255, 255, 0.094)",
        }}
      >
        <div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#f4f4f9fa" }}>
            {isBroadcaster ? "MARUCAST BROADCASTER" : "MARUCAST RECEIVER"}
          </div>
          <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)", marginTop: "2px" }}>
            Stream lossless system audio, track metadata, and live lyrics over local Wi-Fi.
          </div>
        </div>

        <input
          type="checkbox"
          checked={isConnected}
          onChange={(e) => setIsConnected(e.target.checked)}
          style={{ width: "20px", height: "20px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
        />
      </div>

      {/* Mode Selector Pill: RECEIVER vs BROADCASTER */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "4px",
          borderRadius: "24px",
          background: "rgba(24, 18, 43, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.094)",
        }}
      >
        <button
          onClick={() => setIsBroadcaster(false)}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: "24px",
            background: !isBroadcaster ? "rgba(232, 93, 159, 0.25)" : "transparent",
            border: !isBroadcaster ? "1px solid var(--maru-accent-pink)" : "1px solid transparent",
            color: !isBroadcaster ? "var(--maru-accent-pink)" : "rgba(235, 235, 245, 0.72)",
            fontSize: "11px",
            fontWeight: !isBroadcaster ? 800 : 500,
            cursor: "pointer",
          }}
        >
          RECEIVER (THIS PC AS SPEAKER)
        </button>
        <button
          onClick={() => setIsBroadcaster(true)}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: "24px",
            background: isBroadcaster ? "rgba(96, 226, 255, 0.25)" : "transparent",
            border: isBroadcaster ? "1px solid var(--maru-accent-blue)" : "1px solid transparent",
            color: isBroadcaster ? "var(--maru-accent-blue)" : "rgba(235, 235, 245, 0.72)",
            fontSize: "11px",
            fontWeight: isBroadcaster ? 800 : 500,
            cursor: "pointer",
          }}
        >
          BROADCASTER (CAST TO PHONE/TV)
        </button>
      </div>

      {/* Receiver Mode: PIN Display */}
      {!isBroadcaster && (
        <div
          className="glass-card"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "14px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "1px" }}>
            PAIRING PIN FOR MOBILE APP
          </div>

          <div
            style={{
              fontSize: "36px",
              fontWeight: 900,
              letterSpacing: "6px",
              fontFamily: "monospace",
              color: "#f4f4f9fa",
              padding: "12px 28px",
              borderRadius: "14px",
              background: "rgba(0, 0, 0, 0.4)",
              border: "1.5px solid rgba(232, 93, 159, 0.5)",
              boxShadow: "0 0 24px rgba(232, 93, 159, 0.2)",
            }}
          >
            {pin}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "rgba(235, 235, 245, 0.6)" }}>
            <RotateCw size={13} className="animate-spin" />
            <span>Refreshes in {countdown}s</span>
          </div>
        </div>
      )}

      {/* Broadcaster Mode: PIN Input */}
      {isBroadcaster && (
        <div
          className="glass-card"
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--maru-accent-blue)", letterSpacing: "1px" }}>
            ENTER RECEIVER PIN
          </div>

          <input
            type="text"
            value={inputPin}
            onChange={(e) => setInputPin(e.target.value)}
            placeholder="Enter 6-digit PIN (e.g. 842109)"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "#f4f4f9fa",
              fontSize: "16px",
              fontFamily: "monospace",
              letterSpacing: "2px",
              outline: "none",
            }}
          />

          <button
            onClick={() => setIsConnected(true)}
            style={{
              padding: "12px",
              borderRadius: "24px",
              background: "var(--maru-accent-blue)",
              border: "none",
              color: "#050507",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            CONNECT STREAM
          </button>
        </div>
      )}

      {/* Latency & Tuning Section */}
      <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "1px" }}>
          LATENCY COMPENSATION
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          {[-500, -100, 0, 100, 500].map((offset) => {
            const isSelected = latencyOffset === offset;
            return (
              <button
                key={offset}
                onClick={() => setLatencyOffset(offset)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "10px",
                  background: isSelected ? "rgba(232, 93, 159, 0.25)" : "rgba(255, 255, 255, 0.08)",
                  border: isSelected ? "1px solid var(--maru-accent-pink)" : "1px solid rgba(255, 255, 255, 0.08)",
                  color: isSelected ? "var(--maru-accent-pink)" : "rgba(235, 235, 245, 0.72)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {offset > 0 ? `+${offset}ms` : `${offset}ms`}
              </button>
            );
          })}
        </div>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.094)", margin: "4px 0" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#f4f4f9fa" }}>
              Karaoke Vocal Suppression
            </div>
            <div style={{ fontSize: "11px", color: "rgba(235, 235, 245, 0.6)" }}>
              Attenuates center-channel lead vocals in real time.
            </div>
          </div>
          <input
            type="checkbox"
            checked={karaokeMode}
            onChange={(e) => setKaraokeMode(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
          />
        </div>
      </div>
    </div>
  );
};
