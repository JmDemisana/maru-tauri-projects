import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlayCircle, User, Sliders, RefreshCw, Check, Monitor, Power } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface SettingsScreenProps {
  username: string;
  onSaveUsername: (newUsername: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ username, onSaveUsername }) => {
  const [preferredPlatform, setPreferredPlatform] = useState(() => {
    return localStorage.getItem("maudio_preferred_platform") || "Apple Music";
  });
  const [directSongLaunch, setDirectSongLaunch] = useState(() => {
    return localStorage.getItem("maudio_direct_launch") === "true";
  });
  const [minimizeToTray, setMinimizeToTray] = useState(() => {
    return localStorage.getItem("maudio_minimize_to_tray") !== "false";
  });
  const [autoStart, setAutoStart] = useState<boolean>(false);

  const [userInput, setUserInput] = useState(username || "");
  const [savedUserMsg, setSavedUserMsg] = useState(false);

  const platforms = ["Apple Music", "Spotify", "YouTube Music", "Tidal"];

  useEffect(() => {
    invoke<boolean>("get_auto_start")
      .then((res) => setAutoStart(!!res))
      .catch(() => {});
  }, []);

  const handleSelectPlatform = (p: string) => {
    setPreferredPlatform(p);
    localStorage.setItem("maudio_preferred_platform", p);
  };

  const handleToggleDirectLaunch = (val: boolean) => {
    setDirectSongLaunch(val);
    localStorage.setItem("maudio_direct_launch", val.toString());
  };

  const handleToggleMinimizeToTray = (val: boolean) => {
    setMinimizeToTray(val);
    localStorage.setItem("maudio_minimize_to_tray", val.toString());
  };

  const handleToggleAutoStart = async (val: boolean) => {
    setAutoStart(val);
    try {
      await invoke("set_auto_start", { enable: val });
    } catch (e) {
      console.error("Failed to toggle autostart:", e);
    }
  };

  const handleSaveUsername = () => {
    if (userInput.trim()) {
      onSaveUsername(userInput.trim());
      localStorage.setItem("maudio_username", userInput.trim());
      setSavedUserMsg(true);
      setTimeout(() => setSavedUserMsg(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
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
      {/* 1. WINDOWS SYSTEM & STARTUP */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px" }}>
        <Monitor size={15} color="var(--maru-accent-pink)" />
        <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
          WINDOWS SYSTEM &amp; STARTUP
        </span>
      </div>

      <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Start on boot */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#f4f4f9fa" }}>
              Start with Windows (Minimized to System Tray)
            </div>
            <div style={{ fontSize: "11.5px", color: "rgba(235, 235, 245, 0.72)", marginTop: "2px" }}>
              Automatically launches MAudio upon PC boot in the background to scrobble PC audio silently.
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoStart}
            onChange={(e) => handleToggleAutoStart(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
          />
        </div>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />

        {/* Minimize to Tray */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#f4f4f9fa" }}>
              Minimize to System Tray on Close
            </div>
            <div style={{ fontSize: "11.5px", color: "rgba(235, 235, 245, 0.72)", marginTop: "2px" }}>
              Closing or minimizing the window keeps MAudio active in the tray rather than terminating.
            </div>
          </div>
          <input
            type="checkbox"
            checked={minimizeToTray}
            onChange={(e) => handleToggleMinimizeToTray(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
          />
        </div>
      </div>

      {/* 2. PLAYER & LAUNCH BEHAVIOR */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px", marginTop: "4px" }}>
        <PlayCircle size={15} color="var(--maru-accent-pink)" />
        <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
          STREAMING SERVICE &amp; PLAYBACK
        </span>
      </div>

      <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)" }}>
          Preferred music platform for track links:
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px" }}>
          {platforms.map((p) => {
            const isSelected = preferredPlatform === p;
            return (
              <motion.button
                key={p}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectPlatform(p)}
                style={{
                  height: "44px",
                  borderRadius: "14px",
                  background: isSelected ? "rgba(232, 93, 159, 0.25)" : "rgba(255, 255, 255, 0.08)",
                  border: isSelected
                    ? "1.5px solid var(--maru-accent-pink)"
                    : "1px solid rgba(255, 255, 255, 0.094)",
                  color: "#f4f4f9fa",
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "background 140ms ease, border 140ms ease",
                }}
              >
                {p}
              </motion.button>
            );
          })}
        </div>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.094)", margin: "4px 0" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#f4f4f9fa" }}>
              Direct Streaming Launch
            </div>
            <div style={{ fontSize: "11.5px", color: "rgba(235, 235, 245, 0.72)", marginTop: "2px" }}>
              Clicking a song launches your streaming player directly instead of showing details.
            </div>
          </div>
          <input
            type="checkbox"
            checked={directSongLaunch}
            onChange={(e) => handleToggleDirectLaunch(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
          />
        </div>
      </div>

      {/* 3. LAST.FM PROFILE */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px", marginTop: "4px" }}>
        <User size={15} color="var(--maru-accent-pink)" />
        <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
          LAST.FM USER PROFILE
        </span>
      </div>

      <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)" }}>
          Active Last.fm username for recommendations and charts:
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Username (e.g. your Last.fm username)"
            style={{
              flex: 1,
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.094)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#f4f4f9fa",
              fontSize: "13px",
              outline: "none",
            }}
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSaveUsername}
            style={{
              padding: "0 20px",
              borderRadius: "10px",
              background: "var(--maru-accent-pink)",
              border: "none",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {savedUserMsg ? <Check size={16} /> : null}
            <span>{savedUserMsg ? "SAVED!" : "SAVE"}</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
