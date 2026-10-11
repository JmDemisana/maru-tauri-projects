import { useState, useRef, useEffect, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./app.css";
import {
  SITE_API_DEFAULT,
  TOOL_META,
  TOOL_ORDER,
  DEFAULT_PERMS,
  loadPerms,
  savePerms,
  parseToolCall,
  stripToolTags,
  truncateForSite,
  type ToolName,
  type PermSetting,
  type ToolCall,
} from "./agent";

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

const MODELS = [
  { id: "auto", label: "Auto" },
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "o3-mini", label: "o3-mini" },
  { id: "openrouter-auto", label: "OpenRouter Auto" },
  { id: "openrouter-llama", label: "Llama 3.3 70B" },
  { id: "openrouter-gemma", label: "Gemma 3 27B" },
  { id: "openrouter-deepseek", label: "DeepSeek V3" },
  { id: "openrouter-qwen", label: "Qwen3 235B" },
];

const MAX_TOOL_STEPS = 8;

type Entry =
  | { id: number; kind: "user" | "model" | "note"; text: string }
  | {
      id: number;
      kind: "tool";
      tool: string;
      label: string;
      summary: string;
      detail: string;
      status: "ok" | "error" | "denied";
    };

interface FileOpResult {
  ok: boolean;
  content: string | null;
  entries: string[] | null;
  error: string | null;
}

interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  error: string | null;
}

type NewEntry =
  | { kind: "user" | "model" | "note"; text: string }
  | {
      kind: "tool";
      tool: string;
      label: string;
      summary: string;
      detail: string;
      status: "ok" | "error" | "denied";
    };

class GateError extends Error {}

let nextId = 1;
const nid = () => nextId++;

function previewCall(call: ToolCall): { summary: string; detail: string } {
  const a = call.args;
  switch (call.name) {
    case "read_file":
    case "list_directory":
      return { summary: a.path, detail: a.path };
    case "run_command":
      return { summary: a.command.slice(0, 90), detail: a.command };
    case "write_file":
      return {
        summary: `${a.path} (${a.content.length} chars)`,
        detail: `path: ${a.path}\n\n${a.content.slice(0, 800)}${
          a.content.length > 800 ? "\n...[preview trimmed]" : ""
        }`,
      };
    case "replace_in_file":
      return {
        summary: a.path,
        detail: `path: ${a.path}\n\nfind:\n${a.target.slice(0, 400)}${
          a.target.length > 400 ? "\n...[trimmed]" : ""
        }\n\nreplace with:\n${a.replacement.slice(0, 400)}${
          a.replacement.length > 400 ? "\n...[trimmed]" : ""
        }`,
      };
  }
}

export default function App() {
  const [authed, setAuthed] = useState(
    () => localStorage.getItem("nanami-desktop-authed") === "1"
  );
  const [pin, setPin] = useState(() => localStorage.getItem("nanami-desktop-pin") || "");
  const [pinInput, setPinInput] = useState("");
  const [gateError, setGateError] = useState("");
  const [endpoint, setEndpoint] = useState(
    () => localStorage.getItem("nanami-desktop-endpoint") || SITE_API_DEFAULT
  );
  const [model, setModel] = useState(
    () => localStorage.getItem("nanami-desktop-model") || "auto"
  );
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [perms, setPerms] = useState<Record<ToolName, PermSetting>>(loadPerms);
  const [autoApprove, setAutoApprove] = useState(false);
  const [cwd, setCwd] = useState("");
  const [pending, setPending] = useState<ToolCall | null>(null);

  const apiHistory = useRef<Array<{ role: "user" | "model"; text: string }>>([]);
  const cancelRef = useRef(false);
  const approveRef = useRef<((d: "once" | "always" | "deny") => void) | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, running, pending]);

  useEffect(() => {
    savePerms(perms);
  }, [perms]);

  useEffect(() => {
    if (!isTauri) return;
    invoke("nami_get_cwd")
      .then((v) => setCwd(String(v)))
      .catch(() => {});
  }, []);

  const push = (e: NewEntry) =>
    setEntries((prev) => [...prev, { ...e, id: nid() } as Entry]);

  async function callSite(message: string): Promise<{ text: string }> {
    const res = await fetch(endpoint.trim() || SITE_API_DEFAULT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-nanami-gate-pin": pin,
        "x-nami-client": "desktop",
      },
      body: JSON.stringify({
        message,
        history: apiHistory.current.slice(-24),
        model,
        behavior: "nanami",
        client: "desktop",
      }),
    });
    if (res.status === 401) throw new GateError("locked");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(
        (j as { message?: string }).message || `Nami hiccuped (${res.status})`
      );
    }
    return (await res.json()) as { text: string };
  }

  function askApproval(call: ToolCall): Promise<"once" | "always" | "deny"> {
    setPending(call);
    return new Promise((resolve) => {
      approveRef.current = (d) => {
        approveRef.current = null;
        setPending(null);
        resolve(d);
      };
    });
  }

  async function runTool(call: ToolCall): Promise<string> {
    if (!isTauri) return "Error: local hands only work inside the desktop app.";
    const a = call.args;
    switch (call.name) {
      case "read_file": {
        const r = (await invoke("nami_read_file", { path: a.path })) as FileOpResult;
        return r.ok ? r.content || "(empty file)" : `Error: ${r.error}`;
      }
      case "list_directory": {
        const r = (await invoke("nami_list_directory", { path: a.path })) as FileOpResult;
        return r.ok
          ? (r.entries || []).join("\n") || "(empty folder)"
          : `Error: ${r.error}`;
      }
      case "write_file": {
        const r = (await invoke("nami_write_file", {
          path: a.path,
          content: a.content,
        })) as FileOpResult;
        return r.ok ? "File written." : `Error: ${r.error}`;
      }
      case "replace_in_file": {
        const r = (await invoke("nami_replace_in_file", {
          path: a.path,
          target: a.target,
          replacement: a.replacement,
        })) as FileOpResult;
        return r.ok ? "Edit applied." : `Error: ${r.error}`;
      }
      case "run_command": {
        const r = (await invoke("nami_run_command", {
          command: a.command,
          cwd: cwd || null,
        })) as CommandResult;
        const parts = [`exitCode: ${r.exitCode}`];
        if (r.stdout.trim()) parts.push(`stdout:\n${r.stdout.trim()}`);
        if (r.stderr.trim()) parts.push(`stderr:\n${r.stderr.trim()}`);
        if (r.error) parts.push(`error: ${r.error}`);
        return parts.join("\n\n");
      }
    }
  }

  async function agentLoop(userText: string) {
    push({ kind: "user", text: userText });
    apiHistory.current.push({ role: "user", text: userText });
    setRunning(true);
    cancelRef.current = false;
    let steps = 0;
    try {
      // The message that kicked this off is already the last history item.
      let first = true;
      while (!cancelRef.current) {
        const data = await callSite(first ? userText : "Continue.");
        first = false;
        const call = parseToolCall(data.text || "");
        const clean = stripToolTags(data.text || "");
        if (!call) {
          push({
            kind: "model",
            text: clean || "Ehh... my brain hiccuped. Say that again?",
          });
          apiHistory.current.push({ role: "model", text: clean || "(empty)" });
          break;
        }
        if (clean) {
          push({ kind: "model", text: clean });
          apiHistory.current.push({ role: "model", text: clean });
        }
        if (steps >= MAX_TOOL_STEPS) {
          push({ kind: "note", text: "That's enough hands for one message, Senpai~ 😅" });
          break;
        }
        steps++;
        const meta = TOOL_META[call.name];
        const { summary } = previewCall(call);

        let okToRun = autoApprove || perms[call.name] === "allow";
        if (!okToRun) {
          const decision = await askApproval(call);
          if (decision === "deny") {
            push({
              kind: "tool",
              tool: call.name,
              label: meta.label,
              summary,
              detail: "Senpai said no. 🥺",
              status: "denied",
            });
            apiHistory.current.push({
              role: "user",
              text: `[TOOL_RESULT ${call.name}]\nRefused: Senpai denied permission for this action.`,
            });
            continue;
          }
          if (decision === "always") {
            setPerms((p) => ({ ...p, [call.name]: "allow" }));
          }
          okToRun = true;
        }

        let result: string;
        try {
          result = await runTool(call);
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
        const failed = /^Error:/.test(result);
        push({
          kind: "tool",
          tool: call.name,
          label: meta.label,
          summary,
          detail: result.length > 4000 ? result.slice(0, 4000) + "\n...[trimmed]" : result,
          status: failed ? "error" : "ok",
        });
        apiHistory.current.push({
          role: "user",
          text: `[TOOL_RESULT ${call.name}]\n${truncateForSite(result)}`,
        });
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch (err) {
      if (err instanceof GateError) {
        handleLock();
        return;
      }
      push({
        kind: "note",
        text: `Ehh, something tripped: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setRunning(false);
    }
  }

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || running) return;
    setInput("");
    void agentLoop(text);
  };

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    const attempt = pinInput.trim();
    if (!attempt) return;
    setGateError("");
    try {
      const res = await fetch(endpoint.trim() || SITE_API_DEFAULT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-nanami-gate-pin": attempt,
          "x-nami-client": "desktop",
        },
        body: JSON.stringify({ message: "ping_gate", client: "desktop" }),
      });
      if (res.status === 401) {
        setGateError("Wrong code, baka! 😤");
        return;
      }
      setPin(attempt);
      localStorage.setItem("nanami-desktop-pin", attempt);
      localStorage.setItem("nanami-desktop-authed", "1");
      setAuthed(true);
      setPinInput("");
    } catch {
      setGateError("Can't reach Nami right now. Check your internet~ 🥺");
    }
  };

  const handleLock = () => {
    localStorage.removeItem("nanami-desktop-authed");
    setAuthed(false);
    setPinInput("");
  };

  const handleClear = () => {
    setEntries([]);
    apiHistory.current = [];
  };

  useEffect(() => {
    localStorage.setItem("nanami-desktop-endpoint", endpoint);
  }, [endpoint]);
  useEffect(() => {
    localStorage.setItem("nanami-desktop-model", model);
  }, [model]);

  if (!authed) {
    return (
      <div className="nd-shell">
        <div className="nd-titlebar">
          <div className="nd-drag" data-tauri-drag-region>
            <span className="nd-heart">💚</span> Nanami AI
          </div>
          <button
            className="nd-winbtn"
            onClick={() => isTauri && invoke("win_minimize").catch(() => {})}
          >
            −
          </button>
          <button
            className="nd-winbtn nd-close"
            onClick={() => isTauri && invoke("win_close").catch(() => {})}
          >
            ✕
          </button>
        </div>
        <div className="nd-gate">
          <div style={{ fontSize: "2rem" }}>🔒</div>
          <h2>Secret code, Senpai?</h2>
          <p>
            Ehh, this is the desktop hideout. Only people with the code get my
            hands and feet~
          </p>
          <form onSubmit={handleUnlock}>
            <input
              type="password"
              inputMode="numeric"
              placeholder="•••••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              autoFocus
            />
            <div className="nd-gateerr">{gateError}</div>
            <button type="submit">Let me in~ 🌸</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="nd-shell">
      <div className="nd-titlebar">
        <div className="nd-drag" data-tauri-drag-region>
          <span className="nd-heart">💚</span>
          <span>Nanami AI</span>
          <span className="nd-sub">{isTauri ? "desktop hands on" : "preview (no hands)"}</span>
        </div>
        <button
          className="nd-winbtn"
          title="Minimize"
          onClick={() => isTauri && invoke("win_minimize").catch(() => {})}
        >
          −
        </button>
        <button
          className="nd-winbtn nd-close"
          title="Close"
          onClick={() => isTauri && invoke("win_close").catch(() => {})}
        >
          ✕
        </button>
      </div>

      <div className="nd-toolbar">
        <select
          className="nd-modelsel"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          title="Nami's brain"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          className={`nd-iconbtn ${showSettings ? "nd-on" : ""}`}
          onClick={() => setShowSettings((s) => !s)}
          title="Hands & permissions"
        >
          🖐️ Hands
        </button>
        <button className="nd-iconbtn" onClick={handleClear} title="Clear chat">
          🗑️
        </button>
        <button className="nd-iconbtn" onClick={handleLock} title="Lock">
          🔒
        </button>
      </div>

      {showSettings && (
        <div className="nd-settings">
          <h4>Nami's hands (what she's allowed to touch)</h4>
          {TOOL_ORDER.map((name) => (
            <div className="nd-permrow" key={name}>
              <div className="nd-perminfo">
                <b>
                  {name === "read_file"
                    ? "📖"
                    : name === "list_directory"
                    ? "📁"
                    : name === "write_file"
                    ? "✏️"
                    : name === "replace_in_file"
                    ? "🛠️"
                    : "💻"}{" "}
                  {TOOL_META[name].label}
                  {TOOL_META[name].risky && <span className="nd-risky">• careful</span>}
                </b>
                <span>{TOOL_META[name].blurb}</span>
              </div>
              <div className="nd-seg">
                <button
                  className={perms[name] === "ask" ? "nd-sel" : ""}
                  onClick={() => setPerms((p) => ({ ...p, [name]: "ask" as PermSetting }))}
                >
                  Ask me
                </button>
                <button
                  className={perms[name] === "allow" ? "nd-sel" : ""}
                  onClick={() => setPerms((p) => ({ ...p, [name]: "allow" as PermSetting }))}
                >
                  Always
                </button>
              </div>
            </div>
          ))}
          <label className="nd-switchrow">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
            />
            <span>
              ⚡ Auto-approve everything this session (dangerous but fast, baka!)
            </span>
          </label>
          {(Object.keys(DEFAULT_PERMS) as ToolName[]).some(
            (k) => perms[k] !== DEFAULT_PERMS[k]
          ) && (
            <button
              className="nd-iconbtn"
              style={{ marginTop: "0.5rem" }}
              onClick={() => setPerms({ ...DEFAULT_PERMS })}
            >
              ↩ Reset to gentle defaults
            </button>
          )}
          <h4>Chat route</h4>
          <input
            className="nd-endpoint"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder={SITE_API_DEFAULT}
            spellCheck={false}
          />
          {cwd && <div className="nd-cwd">Working folder: {cwd}</div>}
        </div>
      )}

      <div className="nd-log" ref={logRef}>
        {entries.length === 0 && (
          <div className="nd-empty">
            <img src="/app-icon.png" alt="Nanami" />
            <h3>What are we doing today, Senpai?</h3>
            <p>
              I can chat like always, but here I also have hands~ Ask me to peek
              at files, tidy code, or run stuff. I'll ask first before touching
              anything risky. 🌸
            </p>
          </div>
        )}
        {entries.map((e) =>
          e.kind === "tool" ? (
            <div key={e.id} className={`nd-tool nd-${e.status}`}>
              <details>
                <summary>
                  {e.status === "ok" ? "✅" : e.status === "denied" ? "🚫" : "⚠️"}{" "}
                  {e.label}: {e.summary}
                </summary>
                <pre>{e.detail}</pre>
              </details>
            </div>
          ) : e.kind === "note" ? (
            <div key={e.id} className="nd-thinking">
              {e.text}
            </div>
          ) : (
            <div key={e.id} className={`nd-msg nd-${e.kind}`}>
              <span className="nd-who">{e.kind === "user" ? "Senpai" : "🌸 Nami"}</span>
              {e.text}
            </div>
          )
        )}
        {pending && (
          <div className="nd-approve">
            <h5>
              🖐️ Nami wants to use her hands: {TOOL_META[pending.name].label}
            </h5>
            <p>{TOOL_META[pending.name].blurb}. Say yes?</p>
            <pre>{previewCall(pending).detail}</pre>
            <div className="nd-approw">
              <button
                className="nd-yes"
                onClick={() => approveRef.current?.("once")}
              >
                Allow once
              </button>
              <button
                className="nd-always"
                onClick={() => approveRef.current?.("always")}
              >
                Always
              </button>
              <button className="nd-no" onClick={() => approveRef.current?.("deny")}>
                No!
              </button>
            </div>
          </div>
        )}
        {running && !pending && <div className="nd-thinking">🌸 Nami is thinking...</div>}
      </div>

      <form className="nd-inputrow" onSubmit={handleSend}>
        <input
          className="nd-input"
          placeholder={running ? "Nami is busy..." : "Tell Nami what to do..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={running}
        />
        {running ? (
          <button
            type="button"
            className="nd-send nd-stop"
            onClick={() => {
              cancelRef.current = true;
            }}
          >
            ■
          </button>
        ) : (
          <button type="submit" className="nd-send" disabled={!input.trim()}>
            Send
          </button>
        )}
      </form>
    </div>
  );
}
