import { useState, useEffect, useMemo, useCallback } from "react";
import { TitleBar } from "@maru/ui";
import { invoke } from "@tauri-apps/api/core";

interface ModelPreset {
  id: string;
  name: string;
  capacity: number;
  badge: string;
}

interface TierConfig {
  id: string;
  label: string;
  cycle: string;
  models: ModelPreset[];
}

const TIERS: Record<string, TierConfig> = {
  starter: {
    id: "starter",
    label: "Starter (Weekly)",
    cycle: "weekly",
    models: [
      { id: "flash", name: "Gemini Flash", capacity: 50, badge: "~50/wk" },
      { id: "pro", name: "Gemini Pro", capacity: 12, badge: "~12/wk" },
      { id: "sonnet", name: "Claude Sonnet", capacity: 5, badge: "~5/wk" },
    ],
  },
  pro: {
    id: "pro",
    label: "AI Pro (5h Sprint)",
    cycle: "sprint",
    models: [
      { id: "flash_sprint", name: "Gemini Flash", capacity: 100, badge: "~100/5h" },
      { id: "pro_sprint", name: "Gemini Pro", capacity: 30, badge: "~30/5h" },
      { id: "sonnet_sprint", name: "Claude Sonnet", capacity: 40, badge: "~40/5h" },
      { id: "opus_sprint", name: "Claude Opus", capacity: 15, badge: "~15/5h" },
    ],
  },
  custom: {
    id: "custom",
    label: "Custom",
    cycle: "custom",
    models: [
      { id: "custom_slot", name: "Custom Model", capacity: 50, badge: "Custom" },
    ],
  },
};

export default function App() {
  // --- Persistent State ---
  const [tierId, setTierId] = useState<string>(() => {
    return localStorage.getItem("maru_turns_tier") || "starter";
  });

  const [modelId, setModelId] = useState<string>(() => {
    return localStorage.getItem("maru_turns_model") || "flash";
  });

  const [quotaPercent, setQuotaPercent] = useState<number>(() => {
    const saved = localStorage.getItem("maru_turns_percent");
    return saved !== null ? Number(saved) : 100;
  });

  const [customMax, setCustomMax] = useState<number>(() => {
    const saved = localStorage.getItem("maru_turns_custom_max");
    return saved ? Number(saved) : 50;
  });

  const [customName, setCustomName] = useState<string>(() => {
    return localStorage.getItem("maru_turns_custom_name") || "Custom Model";
  });

  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [sessionBurned, setSessionBurned] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);

  // Reset Countdown (target epoch timestamp in ms)
  const [resetTargetTime, setResetTargetTime] = useState<number | null>(() => {
    const saved = localStorage.getItem("maru_turns_reset_target");
    return saved ? Number(saved) : null;
  });

  const [timeLeftStr, setTimeLeftStr] = useState<string>("");

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("maru_turns_tier", tierId);
  }, [tierId]);

  useEffect(() => {
    localStorage.setItem("maru_turns_model", modelId);
  }, [modelId]);

  useEffect(() => {
    localStorage.setItem("maru_turns_percent", quotaPercent.toString());
  }, [quotaPercent]);

  useEffect(() => {
    localStorage.setItem("maru_turns_custom_max", customMax.toString());
  }, [customMax]);

  useEffect(() => {
    localStorage.setItem("maru_turns_custom_name", customName);
  }, [customName]);

  useEffect(() => {
    if (resetTargetTime) {
      localStorage.setItem("maru_turns_reset_target", resetTargetTime.toString());
    } else {
      localStorage.removeItem("maru_turns_reset_target");
    }
  }, [resetTargetTime]);

  // Current active model and capacity
  const currentTier = TIERS[tierId] || TIERS.starter;

  const currentModel = useMemo(() => {
    if (tierId === "custom") {
      return { id: "custom_slot", name: customName, capacity: customMax, badge: `~${customMax}` };
    }
    const found = currentTier.models.find((m) => m.id === modelId);
    return found || currentTier.models[0];
  }, [tierId, modelId, currentTier, customName, customMax]);

  // Max turns, remaining, and consumed
  const maxTurns = currentModel.capacity;
  const remainingTurns = Math.max(0, Math.min(maxTurns, Math.round((quotaPercent / 100) * maxTurns)));
  const consumedTurns = Math.max(0, maxTurns - remainingTurns);

  // Efficiency Tier
  const efficiency = useMemo(() => {
    if (remainingTurns > 20) {
      return {
        name: "STANDARD",
        color: "#10b981",
        glow: "rgba(16, 185, 129, 0.35)",
        icon: "🟢",
        tip: "Normal efficient coding. Full freedom.",
      };
    } else if (remainingTurns >= 11) {
      return {
        name: "ENHANCED",
        color: "#06b6d4",
        glow: "rgba(6, 182, 212, 0.35)",
        icon: "🟡",
        tip: "Think before reading, batch edits together.",
      };
    } else if (remainingTurns >= 6) {
      return {
        name: "STRICT",
        color: "#f59e0b",
        glow: "rgba(245, 158, 11, 0.35)",
        icon: "🟠",
        tip: "Map entire solution before touching tools, zero backtracking.",
      };
    } else if (remainingTurns >= 1) {
      return {
        name: "MINIMAL",
        color: "#ef4444",
        glow: "rgba(239, 68, 68, 0.35)",
        icon: "🔴",
        tip: "Every call surgical. Avoid tasks >2 turns.",
      };
    } else {
      return {
        name: "EXHAUSTED",
        color: "#f43f5e",
        glow: "rgba(244, 63, 94, 0.35)",
        icon: "💀",
        tip: "Quota depleted. Switch pool or reason in text.",
      };
    }
  }, [remainingTurns]);

  // Trigger brief toast message
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  // Burn a turn
  const handleBurnTurn = useCallback(() => {
    if (remainingTurns <= 0) return;
    const newRemaining = remainingTurns - 1;
    const newPercent = Math.max(0, Math.round((newRemaining / maxTurns) * 100));
    setQuotaPercent(newPercent);
    setSessionBurned((prev) => prev + 1);
  }, [remainingTurns, maxTurns]);

  // Restore/Add a turn
  const handleAddTurn = useCallback(() => {
    if (remainingTurns >= maxTurns) return;
    const newRemaining = remainingTurns + 1;
    const newPercent = Math.min(100, Math.round((newRemaining / maxTurns) * 100));
    setQuotaPercent(newPercent);
    setSessionBurned((prev) => Math.max(0, prev - 1));
  }, [remainingTurns, maxTurns]);

  // Hotkeys: `[` to burn turn, `]` to add turn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "[" || e.key === "-") {
        e.preventDefault();
        handleBurnTurn();
      } else if (e.key === "]" || e.key === "=" || e.key === "+") {
        e.preventDefault();
        handleAddTurn();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBurnTurn, handleAddTurn]);

  // Reset Timer Countdown Ticker
  useEffect(() => {
    const updateCountdown = () => {
      if (!resetTargetTime) {
        setTimeLeftStr("Not set");
        return;
      }
      const now = Date.now();
      const diff = resetTargetTime - now;
      if (diff <= 0) {
        setTimeLeftStr("Ready to reset!");
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      if (days > 0) {
        setTimeLeftStr(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeftStr(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeftStr(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [resetTargetTime]);

  // Helper to set quick countdown
  const setQuickCountdown = (hours: number) => {
    const target = Date.now() + hours * 3600 * 1000;
    setResetTargetTime(target);
    showToast(`Timer set for ${hours}h`);
  };

  // Toggle Always on Top
  const togglePin = async () => {
    const nextState = !isPinned;
    try {
      await invoke("set_always_on_top", { enabled: nextState });
      setIsPinned(nextState);
      showToast(nextState ? "Window pinned on top 📌" : "Window unpinned");
    } catch (e) {
      console.error("Failed to toggle pin:", e);
      setIsPinned(nextState);
    }
  };

  // Copy status to clipboard
  const copyStatus = () => {
    const resetPart = timeLeftStr && timeLeftStr !== "Not set" ? ` • resets in ~${timeLeftStr}` : "";
    const text = `📊 ~${remainingTurns} turns remaining (${currentModel.name} • ${quotaPercent}%${resetPart})`;
    navigator.clipboard.writeText(text);
    showToast("Status copied to clipboard! 📋");
  };

  // Reset Session
  const resetSession = () => {
    setSessionBurned(0);
    showToast("Session counter reset 🔄");
  };

  return (
    <div className="turns-app">
      {/* TitleBar with faux Win11 controls */}
      <TitleBar
        title="Turns Calculator"
        iconSrc="/icon.png"
        draggable={true}
        showMoveMonitor={true}
      />

      <div className="turns-body">
        {/* Tier Selector */}
        <div className="tier-tabs">
          {Object.values(TIERS).map((t) => (
            <button
              key={t.id}
              className={`tier-tab ${tierId === t.id ? "active" : ""}`}
              onClick={() => {
                setTierId(t.id);
                if (t.id !== "custom") {
                  setModelId(t.models[0].id);
                }
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Model Selector Cards */}
        {tierId !== "custom" ? (
          <div className="models-grid">
            {currentTier.models.map((m) => (
              <div
                key={m.id}
                className={`model-chip ${modelId === m.id ? "selected" : ""}`}
                onClick={() => setModelId(m.id)}
              >
                <div className="model-chip-title">{m.name}</div>
                <div className="model-chip-sub">{m.badge}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Model Name"
              style={{
                flex: 2,
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                padding: "6px 8px",
                color: "#fff",
                fontSize: "12px",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
              <input
                type="number"
                min="1"
                max="500"
                value={customMax}
                onChange={(e) => setCustomMax(Math.max(1, Number(e.target.value) || 1))}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  padding: "6px 8px",
                  color: "#fff",
                  fontSize: "12px",
                  textAlign: "center",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>turns</span>
            </div>
          </div>
        )}

        {/* Hero Quota Display */}
        <div className="glass-panel">
          <div className="hero-stats">
            <div className="hero-number-wrap">
              <div className="hero-big-number">{remainingTurns}</div>
              <div className="hero-sub-label">/ {maxTurns} turns</div>
            </div>
            <div
              className="hero-percent-badge"
              style={{
                color: efficiency.color,
                borderColor: efficiency.color,
                background: efficiency.glow,
              }}
            >
              {quotaPercent}%
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${quotaPercent}%`,
                background: `linear-gradient(90deg, ${efficiency.color}, #a855f7)`,
                boxShadow: `0 0 10px ${efficiency.glow}`,
              }}
            />
          </div>

          {/* Percentage Slider & Direct Input */}
          <div className="slider-row">
            <input
              type="range"
              min="0"
              max="100"
              value={quotaPercent}
              onChange={(e) => setQuotaPercent(Number(e.target.value))}
              className="quota-slider"
            />
            <div className="percent-input-wrap">
              <input
                type="number"
                min="0"
                max="100"
                value={quotaPercent}
                onChange={(e) => setQuotaPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="percent-input"
              />
              <span className="percent-symbol">%</span>
            </div>
          </div>

          {/* Percentage Presets */}
          <div className="preset-pills">
            {[100, 75, 50, 25, 10, 0].map((p) => (
              <button
                key={p}
                className="preset-pill"
                onClick={() => setQuotaPercent(p)}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Efficiency Tier Guidance Banner */}
        <div
          className="tier-banner"
          style={{
            background: `linear-gradient(90deg, ${efficiency.glow}, rgba(0, 0, 0, 0.4))`,
            border: `1px solid ${efficiency.color}40`,
          }}
        >
          <div className="tier-banner-icon">{efficiency.icon}</div>
          <div className="tier-banner-info">
            <div className="tier-banner-title" style={{ color: efficiency.color }}>
              TIER: {efficiency.name}
            </div>
            <div className="tier-banner-desc">{efficiency.tip}</div>
          </div>
        </div>

        {/* Quick Stepper (Burn / Restore) */}
        <div className="glass-panel">
          <div className="stepper-row">
            <button className="stepper-btn burn" onClick={handleBurnTurn} title="Shortcut: [ or -">
              🔥 -1 Turn
            </button>
            <button className="stepper-btn" onClick={handleAddTurn} title="Shortcut: ] or +">
              ⚡ +1 Turn
            </button>
          </div>
          <div className="session-stat">
            Burned this session: <strong style={{ color: "#fff" }}>{sessionBurned} turns</strong>
            {consumedTurns > 0 && ` (${consumedTurns} total consumed)`}
          </div>
        </div>

        {/* Task Estimator Budget */}
        <div className="glass-panel">
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
            TASK BUDGET ESTIMATE
          </div>
          <div className="task-matrix">
            <div className="task-item">
              <span className="task-label">Quick Edit (~1t)</span>
              <span className="task-count">~{remainingTurns}x</span>
            </div>
            <div className="task-item">
              <span className="task-label">Bugfix & Test (~2.5t)</span>
              <span className="task-count">~{Math.floor(remainingTurns / 2.5)}x</span>
            </div>
            <div className="task-item">
              <span className="task-label">Feature (~5t)</span>
              <span className="task-count">~{Math.floor(remainingTurns / 5)}x</span>
            </div>
            <div className="task-item">
              <span className="task-label">Full Module (~12t)</span>
              <span className="task-count">~{Math.floor(remainingTurns / 12)}x</span>
            </div>
          </div>
        </div>

        {/* Reset Countdown Timer */}
        <div className="glass-panel">
          <div className="timer-row">
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>
                RESET COUNTDOWN
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-cyan)", marginTop: "2px" }}>
                {timeLeftStr}
              </div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                className="preset-pill"
                style={{ padding: "4px 8px" }}
                onClick={() => setQuickCountdown(5)}
              >
                5h sprint
              </button>
              <button
                className="preset-pill"
                style={{ padding: "4px 8px" }}
                onClick={() => setQuickCountdown(24 * 7)}
              >
                7d week
              </button>
              {resetTargetTime && (
                <button
                  className="preset-pill"
                  style={{ padding: "4px 8px", color: "var(--accent-rose)" }}
                  onClick={() => setResetTargetTime(null)}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Toast Feedback */}
        {toast && <div className="toast-badge">{toast}</div>}

        {/* Action Utilities */}
        <div className="action-buttons-row">
          <button
            className={`action-btn ${isPinned ? "active-pin" : ""}`}
            onClick={togglePin}
          >
            📌 {isPinned ? "Pinned" : "Pin On Top"}
          </button>
          <button className="action-btn" onClick={copyStatus}>
            📋 Copy Status
          </button>
          <button className="action-btn" onClick={resetSession}>
            🔄 Reset
          </button>
        </div>
      </div>
    </div>
  );
}
