import React, { useState } from "react";
import { User, Sliders, Info, Check, Save, Music, Radio, ShieldCheck } from "lucide-react";

interface SettingsScreenProps {
  username: string;
  onSaveUsername: (newUsername: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ username, onSaveUsername }) => {
  const [inputUser, setInputUser] = useState(username);
  const [sessionKey, setSessionKey] = useState("");
  const [preferredPlatform, setPreferredPlatform] = useState("Apple Music");
  const [directSongLaunch, setDirectSongLaunch] = useState(true);
  const [scrobbleThreshold, setScrobbleThreshold] = useState("50%");
  const [autoScrobble, setAutoScrobble] = useState(true);
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    onSaveUsername(inputUser.trim() || "Maru-Chan");
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

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
      }}
    >
      <div>
        <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#fafcff" }}>MAudio Preferences & Accounts</h2>
        <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)", marginTop: "2px" }}>
          Configure Last.fm scrobbling, preferred music streaming platform, and system integrations
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Last.fm Account Card */}
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 800 }}>
            <User size={18} color="var(--maru-accent-pink)" />
            <span>Last.fm Credentials</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700 }}>
              USERNAME
            </label>
            <input
              type="text"
              value={inputUser}
              onChange={(e) => setInputUser(e.target.value)}
              placeholder="Enter Last.fm username"
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "#fafcff",
                fontSize: "13.5px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700 }}>
              SESSION KEY (OPTIONAL)
            </label>
            <input
              type="password"
              value={sessionKey}
              onChange={(e) => setSessionKey(e.target.value)}
              placeholder="Last.fm API Session Key"
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "10px",
                padding: "10px 14px",
                color: "#fafcff",
                fontSize: "13.5px",
                outline: "none",
              }}
            />
          </div>

          <button
            onClick={handleSave}
            style={{
              marginTop: "4px",
              background: "linear-gradient(135deg, var(--maru-accent-pink), #e0437b)",
              border: "none",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 0 16px rgba(255, 113, 162, 0.4)",
            }}
          >
            {savedToast ? <Check size={16} /> : <Save size={16} />}
            <span>{savedToast ? "Credentials Saved!" : "Save Account Settings"}</span>
          </button>
        </div>

        {/* Music Player & Playback Options */}
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 800 }}>
            <Music size={18} color="var(--maru-accent-blue)" />
            <span>Playback & Launch</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 700 }}>
              PREFERRED MUSIC PLATFORM
            </label>
            <select
              value={preferredPlatform}
              onChange={(e) => setPreferredPlatform(e.target.value)}
              style={{
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#fafcff",
                borderRadius: "10px",
                padding: "10px 12px",
                fontSize: "13.5px",
                outline: "none",
              }}
            >
              <option value="Apple Music">Apple Music</option>
              <option value="Spotify">Spotify</option>
              <option value="YouTube Music">YouTube Music</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "13.5px", fontWeight: 700 }}>Direct Song Launch</div>
              <div style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.45)" }}>
                Open song in preferred player immediately on click
              </div>
            </div>
            <input
              type="checkbox"
              checked={directSongLaunch}
              onChange={(e) => setDirectSongLaunch(e.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "13.5px", fontWeight: 700 }}>Auto-Scrobble Active Media</div>
              <div style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.45)" }}>
                Watch Windows GSMTC events in background
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoScrobble}
              onChange={(e) => setAutoScrobble(e.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
