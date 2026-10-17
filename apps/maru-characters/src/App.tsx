import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TitleBar } from "@maru/ui";
import { invoke } from "@tauri-apps/api/core";
import {
  BLANK_TEMPLATE,
  DEFAULT_LLAMA,
  NANAMI_STARTER,
  uid,
  type Character,
  type ChatMessage,
  type LlamaConfig,
} from "./types";
import { loadJSON, saveJSON, sendChat } from "./lib";

const CHARS_KEY = "maru_chars_v1";
const CHATS_KEY = "maru_chats_v1";
const CFG_KEY = "maru_llama_cfg_v1";
const ACTIVE_KEY = "maru_active_char_v1";

type ServerState = "unknown" | "online" | "offline" | "starting";

interface BuiltinInfo {
  binary: string | null;
  model: string | null;
  bundled: boolean;
  modelFile: string;
}

export default function App() {
  const [chars, setChars] = useState<Character[]>(() => {
    const saved = loadJSON<Character[]>(CHARS_KEY, []);
    if (saved.length > 0) return saved;
    return [NANAMI_STARTER];
  });
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>(() =>
    loadJSON<Record<string, ChatMessage[]>>(CHATS_KEY, {})
  );
  const [cfg, setCfg] = useState<LlamaConfig>(() =>
    loadJSON<LlamaConfig>(CFG_KEY, DEFAULT_LLAMA)
  );
  const [activeId, setActiveId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_KEY) || "nanami";
  });
  const [server, setServer] = useState<ServerState>("unknown");
  const [serverNote, setServerNote] = useState("checking...");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"none" | "backend" | "character">("none");
  const [editing, setEditing] = useState<Character | null>(null);
  const [builtin, setBuiltin] = useState<BuiltinInfo | null>(null);
  const didAutoStart = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const active = useMemo(
    () => chars.find((c) => c.id === activeId) || chars[0],
    [chars, activeId]
  );
  const history = useMemo(
    () => (active ? chats[active.id] || [] : []),
    [chats, active]
  );

  useEffect(() => saveJSON(CHARS_KEY, chars), [chars]);
  useEffect(() => saveJSON(CHATS_KEY, chats), [chats]);
  useEffect(() => saveJSON(CFG_KEY, cfg), [cfg]);
  useEffect(() => {
    if (active) localStorage.setItem(ACTIVE_KEY, active.id);
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.length, busy]);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await invoke<{ managed: string; reachable: boolean; log: string }>(
        "llama_status",
        { port: cfg.port }
      );
      if (res.reachable) {
        setServer("online");
        setServerNote(res.managed === "running" ? "managed + reachable" : "reachable");
      } else if (res.managed === "running") {
        setServer("starting");
        setServerNote("process running, warming up...");
      } else {
        setServer("offline");
        setServerNote(res.managed);
      }
    } catch (e) {
      setServer("offline");
      setServerNote(String(e));
    }
  }, [cfg.port]);

  useEffect(() => {
    refreshStatus();
    const t = setInterval(refreshStatus, 3000);
    return () => clearInterval(t);
  }, [refreshStatus]);

  // Effective paths: "bundled" sentinel resolves via Rust builtin lookup.
  const effBinary =
    cfg.binary === "bundled" ? builtin?.binary || "llama-server" : cfg.binary;
  const effModel = cfg.model === "bundled" ? builtin?.model || "" : cfg.model;

  // Resolve bundled model + runtime once, migrate legacy saved defaults.
  useEffect(() => {
    invoke<BuiltinInfo>("llama_builtin_paths")
      .then((b) => setBuiltin(b))
      .catch(() => setBuiltin(null));
    setCfg((prev) =>
      prev.binary === "llama-server" && !prev.model.trim()
        ? { ...prev, binary: "bundled", model: "bundled" }
        : prev
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = useCallback(async () => {
    if (!effModel.trim()) {
      setError(
        "Bundled model not found. Run pnpm bundle:builtins in apps/maru-characters, or paste a .gguf path in Backend panel."
      );
      setPanel("backend");
      return;
    }
    setServer("starting");
    setServerNote("spawning llama-server...");
    setError(null);
    try {
      await invoke("llama_start", {
        opts: {
          binary: effBinary,
          model: effModel,
          port: cfg.port,
          ctx: cfg.ctx,
          threads: cfg.threads,
          extra_args: cfg.extraArgs,
        },
      });
      setTimeout(refreshStatus, 1500);
    } catch (e) {
      setServer("offline");
      setError(String(e));
    }
  }, [cfg.port, cfg.ctx, cfg.threads, cfg.extraArgs, effBinary, effModel, refreshStatus]);

  useEffect(() => {
    if (didAutoStart.current) return;
    if (!builtin) return;
    didAutoStart.current = true;
    if (cfg.autostart && effModel.trim()) {
      handleStart();
    }
  }, [builtin, cfg.autostart, effModel, handleStart]);

  const handleStop = async () => {
    try {
      await invoke("llama_stop");
      refreshStatus();
    } catch (e) {
      setError(String(e));
    }
  };

  const ensureGreeting = (charId: string) => {
    setChats((prev) => {
      if (prev[charId] && prev[charId].length > 0) return prev;
      const char = chars.find((c) => c.id === charId);
      if (!char) return prev;
      return {
        ...prev,
        [charId]: [{ role: "assistant", content: char.greeting, ts: Date.now() }],
      };
    });
  };

  useEffect(() => {
    if (active) ensureGreeting(active.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !active || busy) return;
    if (server !== "online") {
      setError("Model is offline. Press Start in the top bar first.");
      return;
    }
    setError(null);
    setBusy(true);
    const userMsg: ChatMessage = { role: "user", content: text, ts: Date.now() };
    const nextHist = [...history, userMsg];
    setChats((prev) => ({ ...prev, [active.id]: nextHist }));
    setInput("");
    try {
      const reply = await sendChat(cfg, active, history, text);
      setChats((prev) => ({
        ...prev,
        [active.id]: [...(prev[active.id] || nextHist), { role: "assistant", content: reply, ts: Date.now() }],
      }));
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const openNewCharacter = () => {
    setEditing({ ...BLANK_TEMPLATE, id: uid("char"), name: "" });
    setPanel("character");
  };

  const saveEditing = () => {
    if (!editing || !editing.name.trim()) {
      setError("Character needs a name.");
      return;
    }
    setChars((prev) => {
      const exists = prev.some((c) => c.id === editing.id);
      if (exists) return prev.map((c) => (c.id === editing.id ? editing : c));
      return [...prev, editing];
    });
    setActiveId(editing.id);
    setPanel("none");
    setEditing(null);
  };

  const deleteActive = () => {
    if (!active) return;
    if (chars.length <= 1) {
      setError("Keep at least one character.");
      return;
    }
    setChars((prev) => prev.filter((c) => c.id !== active.id));
    setActiveId(chars.find((c) => c.id !== active.id)?.id || chars[0].id);
  };

  const pillColor =
    server === "online" ? "#10b981" : server === "starting" ? "#f59e0b" : "#f43f5e";

  return (
    <div className="chars-app">
      <TitleBar title="Maru Characters" iconSrc="/icon.png" draggable showMoveMonitor />

      <div className="chars-layout">
        <aside className="chars-side">
          <div className="side-head">
            <span>Characters</span>
            <button className="mini-btn" onClick={openNewCharacter}>+ New</button>
          </div>
          <div className="char-list">
            {chars.map((c) => (
              <button
                key={c.id}
                className={`char-item ${active?.id === c.id ? "active" : ""}`}
                onClick={() => setActiveId(c.id)}
              >
                <span className="char-emoji">{c.emoji}</span>
                <span className="char-meta">
                  <strong>{c.name}</strong>
                  <small>{c.tagline}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="side-foot">
            <button className="mini-btn" onClick={() => { setEditing(active ? { ...active } : null); setPanel("character"); }}>
              Edit active
            </button>
            <button className="mini-btn danger" onClick={deleteActive}>Delete</button>
          </div>
        </aside>

        <main className="chars-main">
          <div className="chat-head">
            <div className="chat-title">
              <span className="big-emoji">{active?.emoji}</span>
              <div>
                <strong>{active?.name}</strong>
                <small style={{ color: "var(--text-muted)" }}>{active?.tagline}</small>
              </div>
              <span className="status-pill" style={{ borderColor: pillColor, color: pillColor }}>
                ● {server} <small>{serverNote}</small>
              </span>
            </div>
            <div className="head-actions">
              <button className="mini-btn" onClick={handleStart}>Start model</button>
              <button className="mini-btn" onClick={handleStop}>Stop</button>
              <button className="mini-btn" onClick={() => setPanel(panel === "backend" ? "none" : "backend")}>
                Backend
              </button>
            </div>
          </div>

          {error && <div className="error-bar">{error}</div>}

          <div className="messages">
            {history.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="bubble">{m.content}</div>
              </div>
            ))}
            {busy && <div className="msg assistant"><div className="bubble typing">typing...</div></div>}
            <div ref={bottomRef} />
          </div>

          <div className="composer">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Message ${active?.name || "character"}...`}
            />
            <button onClick={handleSend} disabled={busy || !input.trim()}>Send</button>
          </div>
        </main>

        {panel !== "none" && (
          <aside className="chars-panel">
            {panel === "backend" && (
              <div className="panel-card">
                <h3>llama-server backend</h3>
                <div className="builtin-box">
                  {builtin == null && <span>Resolving built-in model...</span>}
                  {builtin != null && builtin.model && (
                    <span>
                      Built-in model ready {builtin.bundled ? "(inside installer)" : "(dev path)"}: {builtin.modelFile}
                    </span>
                  )}
                  {builtin != null && !builtin.model && (
                    <span className="warn">
                      No model staged. Run pnpm bundle:builtins in apps/maru-characters, or paste a path below.
                    </span>
                  )}
                  {builtin != null && !builtin.binary && (
                    <span className="warn">llama-server not found. Install with: winget install llama.cpp</span>
                  )}
                </div>
                <label>Binary<input value={cfg.binary} onChange={(e) => setCfg({ ...cfg, binary: e.target.value })} placeholder='bundled (or full llama-server path)' /></label>
                <label>Model .gguf path<input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} placeholder="bundled (or D:/models/xxx.gguf)" /></label>
                <div className="row2">
                  <button className="mini-btn" onClick={() => setCfg({ ...cfg, binary: "bundled", model: "bundled" })}>Use bundled</button>
                  <span className="hint">Effective: {(effBinary || "").slice(-42)} | {(effModel || "").slice(-42)}</span>
                </div>
                <div className="row2">
                  <label>Port<input type="number" value={cfg.port} onChange={(e) => setCfg({ ...cfg, port: Number(e.target.value) || 8080 })} /></label>
                  <label>Ctx<input type="number" value={cfg.ctx} onChange={(e) => setCfg({ ...cfg, ctx: Number(e.target.value) || 4096 })} /></label>
                </div>
                <div className="row2">
                  <label>Threads<input type="number" value={cfg.threads} onChange={(e) => setCfg({ ...cfg, threads: Number(e.target.value) || 4 })} /></label>
                  <label className="check"><input type="checkbox" checked={cfg.autostart} onChange={(e) => setCfg({ ...cfg, autostart: e.target.checked })} /> autostart</label>
                </div>
                <label>Extra args<input value={cfg.extraArgs} onChange={(e) => setCfg({ ...cfg, extraArgs: e.target.value })} placeholder="--n-gpu-layers 0" /></label>
                <p className="hint">Ships with Qwen3 4B abliterated baked into the installer (pnpm build:characters:bundled). Falls back to D:/models in dev. App talks to http://127.0.0.1:port/v1/chat/completions.</p>
                <div className="row2">
                  <button className="mini-btn" onClick={handleStart}>Start</button>
                  <button className="mini-btn" onClick={() => setPanel("none")}>Close</button>
                </div>
              </div>
            )}
            {panel === "character" && (
              <div className="panel-card">
                <h3>{chars.some((c) => c.id === editing?.id) ? "Edit character" : "New character"}</h3>
                {editing && (
                  <>
                    <div className="row2">
                      <label>Emoji<input value={editing.emoji} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} /></label>
                      <label>Name<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
                    </div>
                    <label>Tagline<input value={editing.tagline} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} /></label>
                    <label>System prompt<textarea value={editing.systemPrompt} onChange={(e) => setEditing({ ...editing, systemPrompt: e.target.value })} rows={6} /></label>
                    <label>Greeting<textarea value={editing.greeting} onChange={(e) => setEditing({ ...editing, greeting: e.target.value })} rows={3} /></label>
                    <div className="row2">
                      <label>Temp<input type="number" step="0.05" min="0" max="2" value={editing.temperature} onChange={(e) => setEditing({ ...editing, temperature: Number(e.target.value) || 0.8 })} /></label>
                      <label>Max tokens<input type="number" value={editing.maxTokens} onChange={(e) => setEditing({ ...editing, maxTokens: Number(e.target.value) || 400 })} /></label>
                    </div>
                    <div className="row2">
                      <button className="mini-btn primary" onClick={saveEditing}>Save</button>
                      <button className="mini-btn" onClick={() => { setPanel("none"); setEditing(null); }}>Cancel</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
