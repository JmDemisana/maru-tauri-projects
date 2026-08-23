import React, { useState, useEffect } from "react";
import { Cast, Volume2, CheckCircle2, RotateCw } from "lucide-react";

export const MarucastScreen: React.FC = () => {
  const [pin, setPin] = useState("842 109");
  const [countdown, setCountdown] = useState(120);
  const [isConnected, setIsConnected] = useState(false);

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

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 14px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        alignItems: "center",
      }}
    >
      {/* Top Banner */}
      <div
        className="glass-card"
        style={{
          width: "100%",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(112, 165, 255, 0.08) 100%)",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "rgba(167, 139, 250, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--maru-accent-purple)",
          }}
        >
          <Cast size={20} />
        </div>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#fafcff" }}>
            Marucast Receiver
          </div>
          <div style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.5)" }}>
            Stream music from your phone to PC speakers
          </div>
        </div>
      </div>

      {!isConnected ? (
        /* PIN Waiting Screen */
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "18px",
            marginTop: "12px",
          }}
        >
          {/* 6-Digit PIN Display Card */}
          <div
            className="glass-card"
            style={{
              width: "100%",
              padding: "28px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
              border: "1.5px solid rgba(167, 139, 250, 0.3)",
              boxShadow: "0 0 30px rgba(167, 139, 250, 0.15)",
              background: "linear-gradient(180deg, rgba(22, 27, 46, 0.8) 0%, rgba(15, 19, 34, 0.9) 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "999px",
                background: "rgba(167, 139, 250, 0.15)",
                color: "var(--maru-accent-purple)",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              <RotateCw size={11} className="animate-spin" />
              <span>PIN refreshes in {countdown}s</span>
            </div>

            <div
              style={{
                fontSize: "38px",
                fontWeight: 900,
                letterSpacing: "6px",
                fontFamily: "monospace",
                color: "#fafcff",
                textShadow: "0 0 20px rgba(167, 139, 250, 0.6)",
                padding: "8px 0",
              }}
            >
              {pin}
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.55)",
                textAlign: "center",
                maxWidth: "240px",
                lineHeight: 1.4,
              }}
            >
              Open <strong style={{ color: "var(--maru-accent-pink)" }}>MAudio on your phone</strong>, go to Marucast, and enter this PIN to connect.
            </div>

            <button
              onClick={generateNewPin}
              style={{
                marginTop: "4px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "rgba(255, 255, 255, 0.7)",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Get New PIN
            </button>
          </div>

          {/* Quick Info Checklist */}
          <div
            className="glass-card-subtle"
            style={{
              width: "100%",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "12px",
            }}
          >
            <div style={{ fontWeight: 700, color: "#fafcff", marginBottom: "2px" }}>
              Receiver Capabilities
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255, 255, 255, 0.7)" }}>
              <CheckCircle2 size={15} color="var(--maru-success)" />
              <span>Lossless Web Audio streaming to PC speakers</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255, 255, 255, 0.7)" }}>
              <CheckCircle2 size={15} color="var(--maru-success)" />
              <span>Real-time synchronized lyrics canvas</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255, 255, 255, 0.7)" }}>
              <CheckCircle2 size={15} color="var(--maru-success)" />
              <span>Zero-latency local Wi-Fi pairing</span>
            </div>
          </div>
        </div>
      ) : (
        /* Connected Live Receiver View */
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {/* Active Receiver Card */}
          <div
            className="glass-card"
            style={{
              width: "100%",
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              background: "linear-gradient(180deg, rgba(255, 113, 162, 0.1) 0%, rgba(15, 19, 34, 0.9) 100%)",
            }}
          >
            <div
              style={{
                width: "160px",
                height: "160px",
                borderRadius: "18px",
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                background: "#161b2e",
              }}
            >
              <img
                src="https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png"
                alt="Now Playing"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#fafcff" }}>
                Streaming from Phone
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--maru-accent-pink)", marginTop: "2px" }}>
                Connected via Wi-Fi Relay
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "var(--maru-success)",
                fontWeight: 600,
              }}
            >
              <Volume2 size={16} />
              <span>Playing on Desktop Speakers</span>
            </div>

            <button
              onClick={() => setIsConnected(false)}
              style={{
                marginTop: "8px",
                background: "rgba(255, 82, 82, 0.15)",
                border: "1px solid rgba(255, 82, 82, 0.3)",
                color: "var(--maru-danger)",
                borderRadius: "999px",
                padding: "8px 18px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Disconnect Receiver
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
