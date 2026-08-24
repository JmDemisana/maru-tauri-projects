import React, { useState, useEffect } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { LASTFM_API_KEY, LASTFM_SECRET, fetchSessionFromToken } from "../utils/lastfmApi";
import { User, Sliders, AppWindow, CheckCircle2, LogOut, ExternalLink, ShieldCheck, RefreshCw, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ScrobblingScreen: React.FC = () => {
  const [scrobbleEnabled, setScrobbleEnabled] = useState<boolean>(() => {
    return localStorage.getItem("maudio_scrobble_enabled") !== "false";
  });
  const [sessionKey, setSessionKey] = useState<string>(() => {
    return localStorage.getItem("maudio_session_key") || "";
  });
  const [username, setUsername] = useState<string>(() => {
    const sk = localStorage.getItem("maudio_session_key");
    if (!sk) return "";
    return localStorage.getItem("maudio_username") || "";
  });
  const [scrobblePercentage, setScrobblePercentage] = useState<number>(() => {
    return parseInt(localStorage.getItem("maudio_scrobble_pct") || "50", 10);
  });

  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualKeyInput, setManualKeyInput] = useState("");
  const [manualUserInput, setManualUserInput] = useState("");

  const [tokenInput, setTokenInput] = useState("");
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const allApps = [
    "Spotify",
    "Apple Music",
    "YouTube Music",
    "Tidal",
    "VLC media player",
    "Foobar2000",
    "Chrome",
    "Edge",
    "Firefox",
    "Brave",
    "Opera",
    "MusicBee",
    "iTunes",
    "AIMP",
  ];

  const [selectedApps, setSelectedApps] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("maudio_selected_apps");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [
      "Spotify",
      "Apple Music",
      "YouTube Music",
      "Tidal",
      "VLC media player",
      "Foobar2000",
      "Chrome",
      "Edge",
      "Firefox",
      "Brave",
      "Opera",
      "MusicBee",
      "iTunes",
      "AIMP",
    ];
  });

  useEffect(() => {
    localStorage.setItem("maudio_selected_apps", JSON.stringify(selectedApps));
  }, [selectedApps]);

  const handleToggleApp = (app: string) => {
    setSelectedApps((prev) => {
      const next = prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app];
      localStorage.setItem("maudio_selected_apps", JSON.stringify(next));
      return next;
    });
  };

  const handleSelectAllApps = () => {
    setSelectedApps(allApps);
    localStorage.setItem("maudio_selected_apps", JSON.stringify(allApps));
  };

  const handleDeselectAllApps = () => {
    setSelectedApps([]);
    localStorage.setItem("maudio_selected_apps", JSON.stringify([]));
  };

  const handleConnectBrowser = async () => {
    setAuthError(null);
    const authUrl = `https://www.last.fm/api/auth/?api_key=${LASTFM_API_KEY}&cb=https://maruchansquigle.vercel.app/lastnotif-auth.html`;
    try {
      await openUrl(authUrl);
    } catch (e) {
      console.warn("openUrl failed, falling back to window.open:", e);
      try {
        window.open(authUrl, "_blank");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleVerifyToken = async () => {
    const raw = tokenInput.trim();
    if (!raw) return;

    // Handle token or full URL pasted from callback
    let token = raw;
    if (raw.includes("token=")) {
      const match = raw.match(/token=([a-zA-Z0-9_\-]+)/);
      if (match && match[1]) {
        token = match[1];
      }
    }

    setIsVerifyingToken(true);
    setAuthError(null);

    try {
      const session = await fetchSessionFromToken(token);
      setSessionKey(session.key);
      setUsername(session.name);
      localStorage.setItem("maudio_session_key", session.key);
      localStorage.setItem("maudio_username", session.name);
      setTokenInput("");
    } catch (e: any) {
      setAuthError(e.message || "Failed to authorize session token");
    } finally {
      setIsVerifyingToken(false);
    }
  };

  const handleSaveManual = () => {
    if (manualKeyInput.trim()) {
      setSessionKey(manualKeyInput.trim());
      localStorage.setItem("maudio_session_key", manualKeyInput.trim());
    }
    if (manualUserInput.trim()) {
      setUsername(manualUserInput.trim());
      localStorage.setItem("maudio_username", manualUserInput.trim());
    }
    setShowManualDialog(false);
  };

  const handleDisconnect = () => {
    setSessionKey("");
    localStorage.removeItem("maudio_session_key");
  };

  useEffect(() => {
    localStorage.setItem("maudio_scrobble_enabled", scrobbleEnabled.toString());
  }, [scrobbleEnabled]);

  useEffect(() => {
    localStorage.setItem("maudio_scrobble_pct", scrobblePercentage.toString());
  }, [scrobblePercentage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px 28px 36px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        maxWidth: "1100px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* 1. Master Tile: LAST.FM SCROBBLING */}
      <div
        className="glass-card"
        style={{
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: scrobbleEnabled
            ? "1px solid rgba(232, 93, 159, 0.6)"
            : "1px solid rgba(255, 255, 255, 0.094)",
        }}
      >
        <div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#f4f4f9fa" }}>
            LAST.FM SCROBBLING
          </div>
          <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)", marginTop: "2px" }}>
            Automatically submit local media playback to your Last.fm profile.
          </div>
        </div>

        <input
          type="checkbox"
          checked={scrobbleEnabled}
          onChange={(e) => setScrobbleEnabled(e.target.checked)}
          style={{ width: "20px", height: "20px", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
        />
      </div>

      {scrobbleEnabled && (
        <>
          {/* 2. ACCOUNT SECTION */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px" }}>
            <User size={15} color="var(--maru-accent-pink)" />
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
              ACCOUNT
            </span>
          </div>

          {!sessionKey ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Browser Connect Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleConnectBrowser}
                style={{
                  padding: "14px 20px",
                  borderRadius: "12px",
                  background: "rgba(213, 16, 7, 0.15)",
                  border: "1.5px solid rgba(213, 16, 7, 0.7)",
                  color: "#f4f4f9fa",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                }}
              >
                <img src="/ic_lastfm_logo.png" alt="Last.fm" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
                <span>CONNECT VIA BROWSER</span>
                <ExternalLink size={16} />
              </motion.button>

              {/* Paste Token / Verify Box */}
              <div
                className="glass-card"
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  background: "rgba(24, 18, 43, 0.5)",
                }}
              >
                <div style={{ fontSize: "11.5px", color: "rgba(235, 235, 245, 0.72)" }}>
                  After approving in your browser, paste the authorization <strong>token</strong> or <strong>callback URL</strong> below:
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Paste token or URL (e.g. ?token=...)"
                    style={{
                      flex: 1,
                      background: "rgba(0, 0, 0, 0.35)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      padding: "8px 14px",
                      color: "#f4f4f9fa",
                      fontSize: "12.5px",
                      outline: "none",
                    }}
                  />

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleVerifyToken}
                    disabled={isVerifyingToken || !tokenInput.trim()}
                    style={{
                      padding: "0 18px",
                      borderRadius: "10px",
                      background: "var(--maru-accent-pink)",
                      border: "none",
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: "11.5px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      opacity: tokenInput.trim() ? 1 : 0.6,
                    }}
                  >
                    {isVerifyingToken ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
                    <span>{isVerifyingToken ? "VERIFYING..." : "AUTHORIZE"}</span>
                  </motion.button>
                </div>

                {authError && (
                  <div style={{ fontSize: "11px", color: "var(--maru-danger)", fontWeight: 600 }}>
                    ⚠️ {authError}
                  </div>
                )}
              </div>

              {/* Manual Session Key Dialog Trigger */}
              <button
                onClick={() => {
                  setManualKeyInput(sessionKey);
                  setManualUserInput(username);
                  setShowManualDialog(true);
                }}
                className="glass-card-subtle"
                style={{
                  padding: "12px 20px",
                  fontSize: "11.5px",
                  color: "rgba(235, 235, 245, 0.72)",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                ENTER SESSION KEY MANUALLY
              </button>
            </div>
          ) : (
            <div
              className="glass-card"
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid rgba(74, 222, 128, 0.3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <img src="/ic_lastfm_logo.png" alt="Last.fm" style={{ height: "28px", width: "auto", objectFit: "contain" }} />
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#f4f4f9fa" }}>
                    {username || "Authorized User"}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--maru-accent-green)", fontWeight: 700, marginTop: "2px" }}>
                    Connected &amp; Authorized
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDisconnect}
                style={{
                  background: "rgba(255, 69, 58, 0.15)",
                  border: "1px solid rgba(255, 69, 58, 0.3)",
                  borderRadius: "8px",
                  color: "var(--maru-danger)",
                  cursor: "pointer",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                <LogOut size={15} />
                <span>Disconnect</span>
              </motion.button>
            </div>
          )}

          {/* 3. SCROBBLE PERCENTAGE */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px", marginTop: "4px" }}>
            <Sliders size={15} color="var(--maru-accent-pink)" />
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
              SCROBBLE PERCENTAGE
            </span>
          </div>

          <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "rgba(235, 235, 245, 0.72)" }}>Trigger Threshold</span>
              <span style={{ color: "var(--maru-accent-pink)", fontWeight: 800 }}>{scrobblePercentage}%</span>
            </div>

            <input
              type="range"
              min="10"
              max="90"
              value={scrobblePercentage}
              onChange={(e) => setScrobblePercentage(parseInt(e.target.value, 10))}
              style={{
                width: "100%",
                accentColor: "var(--maru-accent-pink)",
                cursor: "pointer",
              }}
            />
          </div>

          {/* 4. APP FILTER */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: "4px", paddingRight: "4px", marginTop: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AppWindow size={15} color="var(--maru-accent-pink)" />
              <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
                APP FILTER ({selectedApps.length}/{allApps.length})
              </span>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleSelectAllApps}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--maru-accent-blue)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Select All
              </button>
              <span style={{ color: "rgba(255, 255, 255, 0.2)", fontSize: "11px" }}>•</span>
              <button
                onClick={handleDeselectAllApps}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(235, 235, 245, 0.5)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {allApps.map((app) => {
                const isSelected = selectedApps.includes(app);
                return (
                  <motion.button
                    key={app}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleToggleApp(app)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      background: isSelected ? "rgba(232, 93, 159, 0.25)" : "rgba(255, 255, 255, 0.08)",
                      border: isSelected
                        ? "1.5px solid var(--maru-accent-pink)"
                        : "1px solid rgba(255, 255, 255, 0.094)",
                      color: isSelected ? "#f4f4f9fa" : "rgba(235, 235, 245, 0.72)",
                      fontSize: "11px",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                    }}
                  >
                    {app}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Manual Key Modal */}
      {showManualDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: "440px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              border: "1px solid rgba(232, 93, 159, 0.5)",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#f4f4f9fa" }}>
              Enter Session Key
            </div>
            <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)" }}>
              If you have an existing Last.fm 32-character session key or auth token:
            </div>

            <div>
              <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", marginBottom: "4px" }}>
                LAST.FM USERNAME
              </div>
              <input
                type="text"
                value={manualUserInput}
                onChange={(e) => setManualUserInput(e.target.value)}
                placeholder="Username"
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
                SESSION KEY (32 CHARACTERS)
              </div>
              <input
                type="text"
                value={manualKeyInput}
                onChange={(e) => setManualKeyInput(e.target.value)}
                placeholder="e.g. 4a9f5581a9bc20a6e16ffc0e..."
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

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                onClick={() => setShowManualDialog(false)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.094)",
                  color: "#f4f4f9fa",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveManual}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: "10px",
                  background: "var(--maru-accent-pink)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
