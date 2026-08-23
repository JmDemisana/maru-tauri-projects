import React, { useState } from "react";
import { Radio, User, CheckCircle2 } from "lucide-react";

interface ReceiverScreenProps {
  lastfmUsername: string;
}

export const ReceiverScreen: React.FC<ReceiverScreenProps> = ({ lastfmUsername }) => {
  const [receiverEnabled, setReceiverEnabled] = useState(false);
  const [targetUsername, setTargetUsername] = useState(lastfmUsername || "JmDemisana");

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
      {/* Master Tile: Remote Receiver */}
      <div
        className="glass-card"
        style={{
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: receiverEnabled
            ? "1px solid rgba(232, 93, 159, 0.6)"
            : "1px solid rgba(255, 255, 255, 0.094)",
        }}
      >
        <div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#f4f4f9fa" }}>
            REMOTE RECEIVER
          </div>
          <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)", marginTop: "2px" }}>
            Monitor scrobbles on other devices via Last.fm profile and display them on your PC.
          </div>
        </div>

        <input
          type="checkbox"
          checked={receiverEnabled}
          onChange={(e) => setReceiverEnabled(e.target.checked)}
          style={{ width: "20px", height: "20px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
        />
      </div>

      {receiverEnabled && (
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "1px" }}>
            TARGET PROFILE
          </div>
          <input
            type="text"
            value={targetUsername}
            onChange={(e) => setTargetUsername(e.target.value)}
            placeholder="LAST.FM USERNAME"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.094)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#f4f4f9fa",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>
      )}
    </div>
  );
};
