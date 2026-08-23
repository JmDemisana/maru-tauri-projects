import React, { useState } from "react";
import { PlayCircle, Type, Bell, Wrench, Send, RefreshCw } from "lucide-react";

interface SettingsScreenProps {
  username: string;
  onSaveUsername: (newUsername: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ username, onSaveUsername }) => {
  const [preferredPlatform, setPreferredPlatform] = useState("Apple Music");
  const [directSongLaunch, setDirectSongLaunch] = useState(false);
  const [mainFmt, setMainFmt] = useState("{song_name}");
  const [subFmt, setSubFmt] = useState("{artist}");
  const [notifySongUpdate, setNotifySongUpdate] = useState(true);
  const [intervalEnabled, setIntervalEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [testSent, setTestSent] = useState(false);

  const platforms = ["Apple Music", "Spotify", "YouTube Music", "Tidal"];

  const handleTestAlert = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 2000);
  };

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
      {/* 1. PLAYER & LAUNCH BEHAVIOR */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px" }}>
        <PlayCircle size={15} color="var(--maru-accent-pink)" />
        <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
          PLAYER &amp; LAUNCH BEHAVIOR
        </span>
      </div>

      <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)" }}>
          Preferred streaming service:
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
          {platforms.map((p) => {
            const isSelected = preferredPlatform === p;
            return (
              <button
                key={p}
                onClick={() => setPreferredPlatform(p)}
                style={{
                  height: "44px",
                  borderRadius: "14px",
                  background: isSelected ? "rgba(232, 93, 159, 0.25)" : "rgba(255, 255, 255, 0.1)",
                  border: isSelected
                    ? "1.5px solid var(--maru-accent-pink)"
                    : "1px solid rgba(255, 255, 255, 0.094)",
                  color: "#f4f4f9fa",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            );
          })}
        </div>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.094)", margin: "4px 0" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#f4f4f9fa" }}>
              Direct Player Launch
            </div>
            <div style={{ fontSize: "11.5px", color: "rgba(235, 235, 245, 0.72)", marginTop: "2px" }}>
              Tapping a song opens streaming player immediately instead of showing song details.
            </div>
          </div>
          <input
            type="checkbox"
            checked={directSongLaunch}
            onChange={(e) => setDirectSongLaunch(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
          />
        </div>
      </div>

      {/* 2. NOTIFICATION FORMAT */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px", marginTop: "4px" }}>
        <Type size={15} color="var(--maru-accent-pink)" />
        <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
          NOTIFICATION FORMAT
        </span>
      </div>

      <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", marginBottom: "4px" }}>
            MAIN LINE (TITLE)
          </div>
          <input
            type="text"
            value={mainFmt}
            onChange={(e) => setMainFmt(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.094)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#f4f4f9fa",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", marginBottom: "4px" }}>
            SUB LINE (BODY)
          </div>
          <input
            type="text"
            value={subFmt}
            onChange={(e) => setSubFmt(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.094)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#f4f4f9fa",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        <div style={{ fontSize: "10px", color: "rgba(235, 235, 245, 0.5)" }}>
          Placeholders: {"{title}, {song_name}, {artist}, {album}, {source}, {media_player}"}
        </div>
      </div>

      {/* 3. SYNC ALERTS & TRIGGERS */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px", marginTop: "4px" }}>
        <Bell size={15} color="var(--maru-accent-pink)" />
        <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
          SYNC ALERTS &amp; TRIGGERS
        </span>
      </div>

      <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "13.5px", color: "#f4f4f9fa" }}>Song Change Alerts</span>
          <input
            type="checkbox"
            checked={notifySongUpdate}
            onChange={(e) => setNotifySongUpdate(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
          />
        </div>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.094)" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "13.5px", color: "#f4f4f9fa" }}>Interval Sync Reminders</span>
          <input
            type="checkbox"
            checked={intervalEnabled}
            onChange={(e) => setIntervalEnabled(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
          />
        </div>

        {intervalEnabled && (
          <div style={{ paddingTop: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "rgba(235,235,245,0.72)", marginBottom: "6px" }}>
              <span>Alert every {intervalMinutes} minutes while playing</span>
              <span style={{ fontWeight: 800, color: "var(--maru-accent-blue)" }}>{intervalMinutes}m</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10))}
              style={{ width: "100%", accentColor: "var(--maru-accent-blue)" }}
            />
          </div>
        )}
      </div>

      {/* 4. ACTIONS & DIAGNOSTICS */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px", marginTop: "4px" }}>
        <Wrench size={15} color="var(--maru-accent-pink)" />
        <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
          ACTIONS &amp; DIAGNOSTICS
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <button
          onClick={handleTestAlert}
          style={{
            height: "44px",
            borderRadius: "10px",
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(232, 93, 159, 0.6)",
            color: "var(--maru-accent-pink)",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Send size={15} />
          <span>{testSent ? "ALERT TRIGGERED!" : "TEST ALERT"}</span>
        </button>

        <button
          onClick={() => {}}
          style={{
            height: "44px",
            borderRadius: "10px",
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(96, 226, 255, 0.6)",
            color: "var(--maru-accent-blue)",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <RefreshCw size={15} />
          <span>RESTART</span>
        </button>
      </div>
    </div>
  );
};
