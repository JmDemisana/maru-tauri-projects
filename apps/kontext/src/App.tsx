import { useEffect, useState } from "react";
import { TitleBar } from "@maru/ui";
import { invoke } from "@tauri-apps/api/core";

interface DialogueLine {
  id: string;
  ts: string;
  speaker: string;
  jp: string;
  en: string;
}

interface Character {
  name: string;
  gender: string;
  speech_style: string;
  notes: string;
  is_adult: boolean;
}

const isOverlay = window.location.hash.includes("overlay");

function OverlayView() {
  const [lines, setLines] = useState<DialogueLine[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const h = await invoke<DialogueLine[]>("get_history", { limit: 3 });
        setLines(h);
      } catch { /* overlay stays quiet */ }
    };
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, []);
  const last = lines[lines.length - 1];
  return (
    <div style={{ padding: 12, background: "rgba(10,6,18,0.82)", color: "#fff", minHeight: "100vh" }}>
      {!last ? <div style={{ opacity: 0.7 }}>Kontext overlay waiting...</div> : (
        <div>
          {last.speaker && <div style={{ fontSize: 12, color: "#a855f7", fontWeight: 700 }}>{last.speaker}</div>}
          <div style={{ fontSize: 16, fontWeight: 700 }}>{last.en || last.jp}</div>
          {last.en && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{last.jp}</div>}
        </div>
      )}
    </div>
  );
}

export default function App() {
  if (isOverlay) return <OverlayView />;

  const [region, setRegion] = useState({ x: 100, y: 600, w: 1100, h: 220 });
  const [jp, setJp] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [draft, setDraft] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [history, setHistory] = useState<DialogueLine[]>([]);
  const [chars, setChars] = useState<Character[]>([]);
  const [newChar, setNewChar] = useState<Character>({ name: "", gender: "unknown", speech_style: "", notes: "", is_adult: true });
  const [overview, setOverview] = useState("");
  const [status, setStatus] = useState("");

  const [hookText, setHookText] = useState("");
  const [hookOn, setHookOn] = useState(true);

  const refresh = async () => {
    try {
      setHistory(await invoke<DialogueLine[]>("get_history", { limit: 40 }));
      setChars(await invoke<Character[]>("get_characters"));
    } catch (e) { setStatus(String(e)); }
  };
  useEffect(() => {
    (async () => {
      try {
        const r: any = await invoke("load_store");
        if (r?.region) setRegion(r.region);
        if (r?.loaded_lines) setStatus(`Restored ${r.loaded_lines} lines from last session.`);
      } catch { /* first run, no memory yet */ }
      refresh();
    })();
  }, []);

  const doCapture = async () => {
    try {
      await invoke("set_region", { region });
      const r = await invoke("capture_region");
      setStatus("Cropped: " + JSON.stringify(r));
    } catch (e) { setStatus(String(e)); }
  };

  const doTranslate = async () => {
    try {
      const r: any = await invoke("translate_with_context", { jp, speaker });
      setDraft(r.draft_en);
      setWarnings(r.warnings || []);
    } catch (e) { setStatus(String(e)); }
  };

  const doSave = async () => {
    try {
      await invoke("add_line", { jp, en: draft || jp, speaker });
      setJp(""); setDraft(""); setWarnings([]);
      refresh();
    } catch (e) { setStatus(String(e)); }
  };

  const doAddChar = async () => {
    if (!newChar.name) return;
    await invoke("upsert_character", { c: newChar });
    setNewChar({ name: "", gender: "unknown", speech_style: "", notes: "", is_adult: true });
    refresh();
  };

  const doOverview = async () => {
    const r: any = await invoke("build_overview_prompt");
    setOverview(r.system + "\n\n" + r.user);
  };

  return (
    <div className="turns-app">
      <TitleBar title="Kontext" iconSrc="/icon.png" draggable={true} showMoveMonitor={true} />
      <div className="turns-body">
        <div className="glass-panel">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>1. Capture region (VN textbox)</div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["x", "y", "w", "h"] as const).map(k => (
              <input key={k} type="number" value={region[k]} onChange={e => setRegion({ ...region, [k]: Number(e.target.value) })}
                style={{ width: 80, background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--border-color)", borderRadius: 6, padding: "6px 8px" }} />
            ))}
            <button className="preset-pill" onClick={doCapture}>Capture crop</button>
            <button className="preset-pill" onClick={() => invoke("toggle_overlay")}>Toggle overlay</button>
          </div>
          {status && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 6 }}>{status}</div>}
        </div>

        <div className="glass-panel">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>2. Texthook (Textractor) intake</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
            In Textractor pick a hook, then paste here or use clipboard copy. Kontext dedupes repeats and saves to memory automatically.
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input placeholder="Hook JP line from Textractor" value={hookText} onChange={e => setHookText(e.target.value)}
              style={{ flex: 1, background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--border-color)", borderRadius: 6, padding: "6px 8px" }} />
            <button className="preset-pill" onClick={async () => {
              if (!hookText.trim()) return;
              const r = await invoke<DialogueLine | null>("ingest_hook_text", { text: hookText, speaker });
              setHookText("");
              if (r) refresh(); else setStatus("Skipped duplicate hook line.");
            }}>Ingest hook</button>
          </div>
          <label style={{ fontSize: 12, marginTop: 6, display: "block" }}>
            <input type="checkbox" checked={hookOn} onChange={e => setHookOn(e.target.checked)} /> auto-ingest polling hint (paste, we dedupe)
          </label>
        </div>

        <div className="glass-panel">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>3. Dialogue + context translate</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input placeholder="Speaker" value={speaker} onChange={e => setSpeaker(e.target.value)}
              style={{ width: 120, background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--border-color)", borderRadius: 6, padding: "6px 8px" }} />
            <input placeholder="Paste JP or texthook line" value={jp} onChange={e => setJp(e.target.value)} style={{ flex: 1, background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--border-color)", borderRadius: 6, padding: "6px 8px" }} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="preset-pill" onClick={doTranslate}>Translate w/ context</button>
            <button className="preset-pill" onClick={doSave}>Save line</button>
            <button className="preset-pill" onClick={() => invoke("clear_history").then(refresh)}>Clear</button>
          </div>
          {draft && <div style={{ marginTop: 8, fontSize: 14 }}><b>Draft:</b> {draft}</div>}
          {warnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: "#f59e0b" }}>! {w}</div>)}
        </div>

        <div className="glass-panel">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>3. History ({history.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
            {history.map(l => (
              <div key={l.id} style={{ fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 4 }}>
                <b style={{ color: "#a855f7" }}>{l.speaker || "??"}</b>: {l.jp}
                <div style={{ opacity: 0.85 }}>{l.en}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>4. Characters (gender + adult flag)</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input placeholder="Name" value={newChar.name} onChange={e => setNewChar({ ...newChar, name: e.target.value })} style={{ width: 110, background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--border-color)", borderRadius: 6, padding: "6px 8px" }} />
            <select value={newChar.gender} onChange={e => setNewChar({ ...newChar, gender: e.target.value })} style={{ background: "#000", color: "#fff", borderRadius: 6 }}>
              <option value="unknown">unknown (they)</option>
              <option value="female">female</option>
              <option value="male">male</option>
              <option value="nonbinary">nonbinary</option>
            </select>
            <label style={{ fontSize: 12 }}><input type="checkbox" checked={newChar.is_adult} onChange={e => setNewChar({ ...newChar, is_adult: e.target.checked })} /> adult 18+</label>
            <button className="preset-pill" onClick={doAddChar}>Add</button>
          </div>
          <input placeholder="notes / speech style" value={newChar.notes} onChange={e => setNewChar({ ...newChar, notes: e.target.value })} style={{ width: "100%", background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--border-color)", borderRadius: 6, padding: "6px 8px", marginBottom: 6 }} />
          {chars.map(c => <div key={c.name} style={{ fontSize: 12 }}>{c.name} [{c.gender}] {c.is_adult ? "" : "(minor-safe)"} {c.notes}</div>)}
          <button className="preset-pill" style={{ marginTop: 8 }} onClick={doOverview}>Build overview prompt (for local AI)</button>
          {overview && <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, marginTop: 6, opacity: 0.9 }}>{overview}</pre>}
        </div>
      </div>
    </div>
  );
}
