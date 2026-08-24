import React, { useState, useEffect } from "react";
import { LASTFM_API_KEY, LASTFM_SECRET, scrobbleTrack, updateNowPlaying } from "../utils/lastfmApi";
import { User, Sliders, AppWindow, CheckCircle2, LogOut, ExternalLink, ShieldCheck } from "lucide-react";

export const ScrobblingScreen: React.FC = () => {
  const [scrobbleEnabled, setScrobbleEnabled] = useState<boolean>(() => {
    return localStorage.getItem("maudio_scrobble_enabled") !== "false";
  });
  const [sessionKey, setSessionKey] = useState<string>(() => {
    return localStorage.getItem("maudio_session_key") || "";
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem("maudio_username") || "JmDemisana";
  });
  const [scrobblePercentage, setScrobblePercentage] = useState<number>(() => {
    return parseInt(localStorage.getItem("maudio_scrobble_pct") || "50", 10);
  });

  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualKeyInput, setManualKeyInput] = useState("");
  const [manualUserInput, setManualUserInput] = useState("");

  const [selectedApps, setSelectedApps] = useState<string[]>([
    "Spotify",
    "Apple Music",
    "YouTube Music",
    "Tidal",
    "VLC media player",
    "Foobar2000",
    "Chrome",
    "Edge",
  ]);

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
  ];

  const handleToggleApp = (app: string) => {
    if (selectedApps.includes(app)) {
      setSelectedApps(selectedApps.filter((a) => a !== app));
    } else {
      setSelectedApps([...selectedApps, app]);
    }
  };

  const handleConnectBrowser = () => {
    const authUrl = `https://www.last.fm/api/auth/?api_key=${LASTFM_API_KEY}&cb=https://maruchansquigle.vercel.app/lastnotif-auth.html`;
    window.open(authUrl, "_blank");
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
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
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
                  gap: "10px",
                }}
              >
                <span style={{ color: "#d51007", fontWeight: 900, fontSize: "16px" }}>last.fm</span>
                <span>CONNECT VIA BROWSER</span>
                <ExternalLink size={16} />
              </button>

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
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ color: "#d51007", fontWeight: 900, fontSize: "22px" }}>last.fm</span>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#f4f4f9fa" }}>
                    {username || "Authorized User"}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--maru-accent-green)", fontWeight: 700, marginTop: "2px" }}>
                    Connected &amp; Authorized
                  </div>
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--maru-danger)",
                  cursor: "pointer",
                  padding: "8px",
                }}
              >
                <LogOut size={20} />
              </button>
            </div>
          )}

          {/* 3. SCROBBLE PERCENTAGE */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px", marginTop: "4px" }}>
            <Sliders size={15} color="var(--maru-accent-pink)" />
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
              SCROBBLE PERCENTAGE
            </span>
          </div>

          <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13.5px", color: "#f4f4f9fa" }}>Trigger Threshold</span>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--maru-accent-pink)" }}>
                {scrobblePercentage}%
              </span>
            </div>

            <input
              type="range"
              min={10}
              max={90}
              step={10}
              value={scrobblePercentage}
              onChange={(e) => setScrobblePercentage(parseInt(e.target.value, 10))}
              style={{ width: "100%", accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
            />
          </div>

          {/* 4. APP FILTER */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px", marginTop: "4px" }}>
            <AppWindow size={15} color="var(--maru-accent-pink)" />
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
              APP FILTER
            </span>
          </div>

          <div className="glass-card" style={{ padding: "16px 18px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {allApps.map((app) => {
              const isSelected = selectedApps.includes(app);
              return (
                <button
                  key={app}
                  onClick={() => handleToggleApp(app)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "24px",
                    background: isSelected ? "rgba(232, 93, 159, 0.25)" : "rgba(255, 255, 255, 0.1)",
                    border: isSelected
                      ? "1px solid var(--maru-accent-pink)"
                      : "1px solid rgba(255, 255, 255, 0.094)",
                    color: isSelected ? "#f4f4f9fa" : "rgba(235, 235, 245, 0.72)",
                    fontSize: "12px",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 120ms ease",
                  }}
                >
                  {app}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Manual Dialog */}
      {showManualDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "400px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              border: "1.5px solid rgba(232, 93, 159, 0.6)",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#f4f4f9fa" }}>
              Manual Credentials
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "rgba(235, 235, 245, 0.72)", marginBottom: "4px" }}>
                Last.fm Username
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
                  padding: "10px",
                  color: "#f4f4f9fa",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "rgba(235, 235, 245, 0.72)", marginBottom: "4px" }}>
                Session Key (32-character hex)
              </div>
              <input
                type="text"
                value={manualKeyInput}
                onChange={(e) => setManualKeyInput(e.target.value)}
                placeholder="e.g. 4a9f5581a9bc..."
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.094)",
                  borderRadius: "10px",
                  padding: "10px",
                  color: "#f4f4f9fa",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={() => setShowManualDialog(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "10px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(235,235,245,0.72)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveManual}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "10px",
                  background: "var(--maru-accent-pink)",
                  border: "none",
                  color: "#ffffff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
