import { useState, useEffect } from "react";

// @ts-ignore
const invoke = window.__TAURI__?.core?.invoke?.bind(window.__TAURI__.core);

interface NodeTrackerKeyPayload {
  keyId: string;
  keyPrefix: string;
  inputTokensUsed: number;
  outputTokensUsed: number;
  nextResetTime: number;
  isRateLimited: boolean;
  isPaidTier: boolean;
  lastError: string | null;
}

interface NodeTrackerStatePayload {
  keys: NodeTrackerKeyPayload[];
}

export default function NodeTracker() {
  const [nodes, setNodes] = useState<NodeTrackerKeyPayload[]>([]);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchTracker() {
      try {
        const auth: any = await invoke("get_secure_auth");
        const apiKeys = auth?.namiAgentGeminiKey || "";
        if (!apiKeys) {
          setError("No Gemini API keys found.");
          return;
        }

        const state: NodeTrackerStatePayload = await invoke("nami_agent_get_node_tracker", { apiKeys });
        if (active) {
          setNodes(state.keys);
          setError("");
        }
      } catch (err: any) {
        if (active) setError(String(err));
      }
    }

    fetchTracker();
    const fetchInterval = setInterval(fetchTracker, 2000);
    const timeInterval = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      active = false;
      clearInterval(fetchInterval);
      clearInterval(timeInterval);
    };
  }, []);

  const togglePaidTier = async (keyId: string, currentState: boolean) => {
    try {
      await invoke("nami_agent_toggle_node_paid_tier", { key: keyId, isPaid: !currentState });
      // optimistic update
      setNodes(prev => prev.map(n => n.keyId === keyId ? { ...n, isPaidTier: !currentState, isRateLimited: false } : n));
    } catch (err) {
      console.error("Failed to toggle paid tier", err);
    }
  };

  return (
    <div style={{ padding: "2rem", color: "var(--theme-text, #fff)", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h2 style={{ margin: 0, fontWeight: 600, fontSize: "1.5rem" }}>API Node Tracker</h2>
      <p style={{ opacity: 0.7, margin: 0, fontSize: "0.9rem" }}>
        Tracking token usage across pooled keys. Free tier limits are estimated (250k TPM, 1500 RPD).
      </p>

      {error && <div style={{ color: "#ff6b6b", background: "rgba(255, 107, 107, 0.1)", padding: "1rem", borderRadius: "8px" }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
        {nodes.map((node, i) => {
          const waitTimeSecs = Math.max(0, Math.ceil((node.nextResetTime - now) / 1000));
          const isLimited = node.isRateLimited && waitTimeSecs > 0;
          
          // Est values based on session usage (assuming roughly 250k TPM for standard free flash models)
          const estMinuteLeft = Math.max(0, 250000 - node.inputTokensUsed);
          // Just a rough estimate placeholder for daily
          const estDailyLeft = Math.max(0, 4000000 - (node.inputTokensUsed + node.outputTokensUsed));

          return (
            <div key={i} style={{ 
              background: "rgba(255, 255, 255, 0.05)", 
              border: `1px solid ${node.isPaidTier ? "rgba(107, 150, 255, 0.4)" : isLimited ? "rgba(255, 107, 107, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
              borderRadius: "8px", 
              padding: "1.2rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.8rem"
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>Node {i + 1}</span>
                    <span style={{ opacity: 0.5, fontSize: "0.8rem", fontFamily: "monospace" }}>({node.keyPrefix})</span>
                    {node.isPaidTier ? (
                       <span style={{ background: "rgba(107, 150, 255, 0.2)", color: "#6b96ff", fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "12px", fontWeight: "bold" }}>PAID TIER</span>
                    ) : isLimited ? (
                      <span style={{ background: "rgba(255, 107, 107, 0.2)", color: "#ff6b6b", fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "12px", fontWeight: "bold" }}>RATE LIMITED</span>
                    ) : (
                      <span style={{ background: "rgba(107, 255, 150, 0.2)", color: "#6bff96", fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "12px", fontWeight: "bold" }}>FREE TIER</span>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ opacity: 0.6, fontSize: "0.75rem", textTransform: "uppercase" }}>Session Input</span>
                      <strong style={{ color: "var(--theme-accent, #6fb3ff)", fontSize: "1rem" }}>{node.inputTokensUsed.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ opacity: 0.6, fontSize: "0.75rem", textTransform: "uppercase" }}>Session Output</span>
                      <strong style={{ color: "var(--theme-accent, #6fb3ff)", fontSize: "1rem" }}>{node.outputTokensUsed.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                  {isLimited && !node.isPaidTier ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <span style={{ opacity: 0.6, fontSize: "0.8rem" }}>Resets In</span>
                      <span style={{ color: "#ff6b6b", fontSize: "1.5rem", fontWeight: "bold", fontFamily: "monospace" }}>{waitTimeSecs}s</span>
                    </div>
                  ) : node.isPaidTier ? (
                    <div style={{ opacity: 0.4, fontSize: "0.9rem", fontStyle: "italic" }}>Unrestricted</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <span style={{ opacity: 0.6, fontSize: "0.8rem" }}>Est. Minute TPM Left</span>
                      <span style={{ color: "#fff", fontSize: "1.1rem", fontWeight: "bold" }}>~{estMinuteLeft.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Toggle Switch */}
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginTop: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>Paid Tier?</span>
                    <input 
                      type="checkbox" 
                      checked={node.isPaidTier} 
                      onChange={() => togglePaidTier(node.keyId, node.isPaidTier)}
                      style={{ accentColor: "var(--theme-accent, #6fb3ff)", width: "16px", height: "16px", cursor: "pointer" }}
                    />
                  </label>
                </div>
              </div>

              {/* Error Display */}
              {node.lastError && (
                <div style={{ marginTop: "0.5rem", padding: "0.8rem", background: "rgba(255, 107, 107, 0.15)", borderRadius: "6px", fontSize: "0.85rem", color: "#ff8c8c", border: "1px solid rgba(255, 107, 107, 0.3)" }}>
                  <strong style={{ color: "#ff6b6b" }}>Last Error:</strong> {node.lastError}
                </div>
              )}
            </div>
          );
        })}
        {nodes.length === 0 && !error && (
          <div style={{ opacity: 0.5, padding: "2rem", textAlign: "center" }}>Loading nodes...</div>
        )}
      </div>
    </div>
  );
}
