import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import "./App.css";

interface StatusPayload {
  port: number;
  drive_letter: string | null;
  elevated: boolean;
  subscribed: boolean;
  sub_user: string | null;
  elevation_user: string | null;
}

interface ProgressPayload {
  filename: string;
  progress: number;
  status: string; // "preparing", "downloading", "completed", or "error: ..."
}

function App() {
  const [driveLetter, setDriveLetter] = useState<string | null>(null);
  const [elevated, setElevated] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subUser, setSubUser] = useState<string | null>(null);
  const [elevationUser, setElevationUser] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<ProgressPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingScope, setOpeningScope] = useState<string | null>(null);
  const [mountError, setMountError] = useState<string | null>(null);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  const toggleAlwaysOnTop = async () => {
    try {
      const nextState = await invoke<boolean>("toggle_always_on_top");
      setAlwaysOnTop(nextState);
    } catch (e) {
      console.error("Failed to set Always on Top:", e);
    }
  };

  // Dynamic window height auto-adjuster based on container content size
  useEffect(() => {
    const container = document.querySelector(".app-container");
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = Math.ceil(entry.borderBoxSize[0]?.blockSize || container.scrollHeight);
        if (height > 0) {
          getCurrentWindow().setSize(new LogicalSize(440, height + 16)).catch(() => {});
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [elevated, subscribed, downloadInfo, mountError, driveLetter, openingScope]);

  const fetchStatus = async () => {
    try {
      const status = await invoke<StatusPayload>("get_status");
      setDriveLetter(status.drive_letter);
      setElevated(status.elevated);
      setSubscribed(status.subscribed);
      setSubUser(status.sub_user);
      setElevationUser(status.elevation_user);
      setMountError(null);
    } catch (e) {
      console.error("Failed to fetch status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    let unlistenAuth: (() => void) | null = null;
    let unlistenProgress: (() => void) | null = null;

    async function setupListeners() {
      unlistenAuth = await listen("auth-updated", () => {
        setOpeningScope(null);
        fetchStatus();
      });

      unlistenProgress = await listen("download-status", (event) => {
        const payload = event.payload as ProgressPayload;
        setDownloadInfo(payload);
      });
    }

    setupListeners();

    return () => {
      if (unlistenAuth) unlistenAuth();
      if (unlistenProgress) unlistenProgress();
    };
  }, []);

  // Clear completed downloads after a brief delay
  useEffect(() => {
    if (downloadInfo && (downloadInfo.status === "completed" || downloadInfo.status.startsWith("error"))) {
      const timer = setTimeout(() => {
        setDownloadInfo(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [downloadInfo]);

  const handleBrowserLogin = async (scope: "elevation" | "subscription") => {
    setOpeningScope(scope);
    try {
      await invoke("open_browser_login", { scope });
    } catch (e) {
      console.error(e);
      setOpeningScope(null);
    }
  };

  const handleMount = async () => {
    setLoading(true);
    setMountError(null);
    try {
      const letter = await invoke<string>("trigger_mount");
      setDriveLetter(letter);
    } catch (e) {
      setMountError(typeof e === "string" ? e : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleUnmount = async () => {
    setLoading(true);
    setMountError(null);
    try {
      await invoke("trigger_unmount");
      setDriveLetter(null);
    } catch (e) {
      setMountError(typeof e === "string" ? e : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleClearAuth = async () => {
    if (confirm("Are you sure you want to log out and clear all authenticated drives?")) {
      setLoading(true);
      try {
        await invoke("clear_auth");
        setElevated(false);
        setSubscribed(false);
        setDriveLetter(null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  const hasAnyAuth = elevated || subscribed;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <span className="app-logo">🌸</span>
          <button
            className={`pin-toggle-btn ${alwaysOnTop ? "pinned" : ""}`}
            onClick={toggleAlwaysOnTop}
            title={alwaysOnTop ? "Always on Top: ON" : "Always on Top: OFF"}
          >
            {alwaysOnTop ? "📌 Pinned to Top" : "📍 Pin Window"}
          </button>
        </div>
        <h1>Maru Files Companion</h1>
        <p className="subtitle">Windows File Explorer Integration</p>
        {(elevated || subscribed) && (
          <div className="session-banner">
            ✓ {elevated && subscribed
                ? "Elevated & Subscription Storage Connected"
                : elevated
                ? "Elevated Admin Storage Active"
                : "Subscription Storage Active"}
          </div>
        )}
      </header>

      {/* Cards List */}
      <main className="card-section">
        {/* Network Storage 1 Card */}
        <section className="glass-card">
          <header className="card-header">
            <h2 className="card-title">📁 Network Storage 1</h2>
            <span className={`status-badge ${elevated ? "active" : "locked"}`}>
              {elevated ? "Elevated" : "Locked"}
            </span>
          </header>
          <p className="card-body">
            Exposes educational files, reports, and blueprints.
          </p>
          {elevated ? (
            <p className="card-user-info">
              Logged in as: <strong>{elevationUser || "Elevated Admin"}</strong>
            </p>
          ) : (
            <button
              className="btn-primary"
              onClick={() => handleBrowserLogin("elevation")}
              disabled={loading || openingScope !== null}
            >
              {openingScope === "elevation" ? (
                <span className="spinner">🌐 Opening Browser...</span>
              ) : (
                "Elevate on Browser"
              )}
            </button>
          )}
        </section>

        {/* Complimentary Storage Card */}
        <section className="glass-card">
          <header className="card-header">
            <h2 className="card-title">⭐ Complimentary Storage</h2>
            <span className={`status-badge ${subscribed ? "active" : "locked"}`}>
              {subscribed ? "Subscribed" : "Locked"}
            </span>
          </header>
          <p className="card-body">
            Exposes private user storage linked to your subscription account.
          </p>
          {subscribed ? (
            <p className="card-user-info">
              Logged in as: <strong>{subUser || "Subscriber Account"}</strong>
            </p>
          ) : (
            <button
              className="btn-primary"
              onClick={() => handleBrowserLogin("subscription")}
              disabled={loading || openingScope !== null}
            >
              {openingScope === "subscription" ? (
                <span className="spinner">🌐 Opening Browser...</span>
              ) : (
                "Sync on Browser"
              )}
            </button>
          )}
        </section>

        {/* Active Download Progress Overlay */}
        {downloadInfo && (
          <section className="downloads-panel">
            <div className="download-item">
              <div className="download-info">
                <span className="download-filename">{downloadInfo.filename}</span>
                <span className="download-percentage">{downloadInfo.progress}%</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${downloadInfo.progress}%` }}
                ></div>
              </div>
              <span className="download-status-txt">
                {downloadInfo.status.startsWith("error") ? (
                  <span style={{ color: "#f87171" }}>{downloadInfo.status}</span>
                ) : (
                  <span>{downloadInfo.status}...</span>
                )}
              </span>
            </div>
          </section>
        )}
      </main>

      {/* Control Buttons */}
      <footer>
        {mountError && (
          <p style={{ color: "#f87171", fontSize: "0.78rem", textAlign: "center", marginBottom: "8px" }}>
            {mountError}
          </p>
        )}

        {driveLetter ? (
          <button
            className="btn-primary btn-unmount"
            onClick={handleUnmount}
            disabled={loading}
          >
            {loading ? <span className="spinner">⚡ Disconnecting...</span> : `🔌 Disconnect Drive (${driveLetter})`}
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={handleMount}
            disabled={loading}
          >
            {loading ? <span className="spinner">⚡ Mount Network Drive</span> : "⚡ Mount Network Drive"}
          </button>
        )}

        {hasAnyAuth && (
          <button
            className="btn-clear-session"
            onClick={handleClearAuth}
            disabled={loading}
          >
            🗑️ Clear Saved Session
          </button>
        )}
      </footer>
    </div>
  );
}

export default App;
