import React, { useState } from "react";
import { User, Sliders, Info, Check, Save } from "lucide-react";

interface SettingsScreenProps {
  username: string;
  onSaveUsername: (newUsername: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ username, onSaveUsername }) => {
  const [inputUser, setInputUser] = useState(username);
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
        padding: "16px 14px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Last.fm Account Card */}
      <div className="glass-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", fontWeight: 700 }}>
          <User size={16} color="var(--maru-accent-pink)" />
          <span>Last.fm Account</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", fontWeight: 600 }}>
            LAST.FM USERNAME
          </label>
          <input
            type="text"
            value={inputUser}
            onChange={(e) => setInputUser(e.target.value)}
            placeholder="Enter Last.fm username"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "10px",
              padding: "10px 12px",
              color: "#fafcff",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        <button
          onClick={handleSave}
          style={{
            background: "linear-gradient(135deg, var(--maru-accent-pink), #e0437b)",
            border: "none",
            borderRadius: "10px",
            padding: "10px 14px",
            color: "#ffffff",
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            boxShadow: "0 0 14px rgba(255, 113, 162, 0.4)",
            transition: "all 140ms ease",
          }}
        >
          {savedToast ? <Check size={16} /> : <Save size={16} />}
          <span>{savedToast ? "Saved Successfully!" : "Save Credentials"}</span>
        </button>
      </div>

      {/* Scrobbler Preferences */}
      <div className="glass-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", fontWeight: 700 }}>
          <Sliders size={16} color="var(--maru-accent-blue)" />
          <span>Scrobble Engine</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>Auto-Scrobble System Media</div>
            <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.45)" }}>
              Send plays from Spotify, Apple Music & browsers
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoScrobble}
            onChange={(e) => setAutoScrobble(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>Scrobble Point</div>
            <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.45)" }}>
              Percent of song played before submitting
            </div>
          </div>
          <select
            value={scrobbleThreshold}
            onChange={(e) => setScrobbleThreshold(e.target.value)}
            style={{
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#fafcff",
              borderRadius: "8px",
              padding: "4px 8px",
              fontSize: "12px",
              outline: "none",
            }}
          >
            <option value="50%">50%</option>
            <option value="75%">75%</option>
            <option value="100%">100%</option>
          </select>
        </div>
      </div>

      {/* App Information Card */}
      <div className="glass-card-subtle" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#fafcff" }}>
          <Info size={14} color="var(--maru-accent-purple)" />
          <span>MAudio for Windows</span>
        </div>
        <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.45)", lineHeight: 1.4 }}>
          Tauri desktop companion for background GSMTC scrobbling, live lyrics watcher, and lossless Marucast receiver.
        </div>
      </div>
    </div>
  );
};
