use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

// ---------- Models ----------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Region {
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogueLine {
    pub id: String,
    pub ts: String,
    pub speaker: String,
    pub jp: String,
    pub en: String,
    pub ambiguous: bool,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Character {
    pub name: String,
    /// "male" | "female" | "unknown" | "nonbinary" etc. Unknown forces they/name.
    pub gender: String,
    pub speech_style: String,
    pub notes: String,
    /// true = adult (18+). False/unknown = treat as minor-safe, no ecchi summary.
    pub is_adult: bool,
}

pub struct AppState {
    pub history: Mutex<Vec<DialogueLine>>,
    pub characters: Mutex<HashMap<String, Character>>,
    pub region: Mutex<Option<Region>>,
    pub last_hook: Mutex<(String, String)>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            history: Mutex::new(Vec::new()),
            characters: Mutex::new(HashMap::new()),
            region: Mutex::new(None),
            last_hook: Mutex::new((String::new(), String::new())),
        }
    }
}

// ---------- Persistent memory (JSON in app data dir) ----------

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct Persisted {
    #[serde(default)]
    history: Vec<DialogueLine>,
    #[serde(default)]
    characters: HashMap<String, Character>,
    #[serde(default)]
    region: Option<Region>,
}

fn memory_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("kontext-memory.json"))
}

fn save_state(app: &tauri::AppHandle, state: &State<'_, AppState>) -> Result<(), String> {
    let data = Persisted {
        history: state.history.lock().map_err(|e| e.to_string())?.clone(),
        characters: state.characters.lock().map_err(|e| e.to_string())?.clone(),
        region: state.region.lock().map_err(|e| e.to_string())?.clone(),
    };
    // Keep file small on potato PC: last 400 lines only.
    let mut data = data;
    if data.history.len() > 400 {
        let n = data.history.len() - 400;
        data.history.drain(0..n);
    }
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    std::fs::write(memory_path(app)?, json).map_err(|e| e.to_string())?;
    Ok(())
}

fn load_state_into(app: &tauri::AppHandle, state: &State<'_, AppState>) -> Result<usize, String> {
    let path = memory_path(app)?;
    if !path.exists() {
        return Ok(0);
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: Persisted = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    let n = data.history.len();
    *state.history.lock().map_err(|e| e.to_string())? = data.history;
    *state.characters.lock().map_err(|e| e.to_string())? = data.characters;
    *state.region.lock().map_err(|e| e.to_string())? = data.region;
    Ok(n)
}

fn clean_hook_text(raw: &str) -> String {
    // Textractor often sends repeats, newlines, junk spaces. Keep it light.
    let mut s: String = raw.replace("\r\n", "\n").replace('\r', "\n");
    s = s.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect::<Vec<_>>().join("\n");
    // Collapse absurd char spam (e.g. ｗｗｗ or !!! spam) to max 3 repeats.
    let mut out = String::with_capacity(s.len());
    let mut last: Option<char> = None;
    let mut run = 0;
    for ch in s.chars() {
        if Some(ch) == last {
            run += 1;
            if run > 3 {
                continue;
            }
        } else {
            last = Some(ch);
            run = 1;
        }
        out.push(ch);
    }
    out.trim().to_string()
}

// ---------- Window helpers (shared pattern) ----------

#[tauri::command]
async fn move_to_next_monitor(window: tauri::WebviewWindow) -> Result<(), String> {
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    if monitors.len() <= 1 {
        return Ok(());
    }
    let current = window.current_monitor().map_err(|e| e.to_string())?;
    let mut next_idx = 0;
    if let Some(curr_mon) = current {
        for (i, m) in monitors.iter().enumerate() {
            if m.name() == curr_mon.name() {
                next_idx = (i + 1) % monitors.len();
                break;
            }
        }
    }
    let target_mon = &monitors[next_idx];
    let mon_pos = target_mon.position();
    let mon_size = target_mon.size();
    let win_size = window.outer_size().unwrap_or(tauri::PhysicalSize::new(900, 680));
    let new_x = mon_pos.x + ((mon_size.width as i32 - win_size.width as i32) / 2).max(50);
    let new_y = mon_pos.y + ((mon_size.height as i32 - win_size.height as i32) / 2).max(50);
    let _ = window.set_position(tauri::PhysicalPosition::new(new_x, new_y));
    Ok(())
}

#[tauri::command]
async fn set_always_on_top(window: tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    window.set_always_on_top(enabled).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn toggle_overlay(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(win) = app.get_webview_window("overlay") {
        let visible = win.is_visible().map_err(|e| e.to_string())?;
        if visible {
            win.hide().map_err(|e| e.to_string())?;
            Ok(false)
        } else {
            win.show().map_err(|e| e.to_string())?;
            let _ = win.set_always_on_top(true);
            Ok(true)
        }
    } else {
        Err("overlay window not found".into())
    }
}

// ---------- Region + capture ----------

#[tauri::command]
async fn set_region(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    region: Region,
) -> Result<Region, String> {
    *state.region.lock().map_err(|e| e.to_string())? = Some(region.clone());
    let _ = save_state(&app, &state);
    Ok(region)
}

#[tauri::command]
async fn get_region(state: State<'_, AppState>) -> Result<Option<Region>, String> {
    Ok(state.region.lock().map_err(|e| e.to_string())?.clone())
}

#[tauri::command]
async fn capture_region(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let region = state.region.lock().map_err(|e| e.to_string())?.clone();
    let region = region.ok_or("set a capture region first")?;

    // xcap 0.4 has no capture_region, so grab full frame then crop with image crate.
    let monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
    let mon = monitors.into_iter().next().ok_or("no monitor found")?;
    let full = mon.capture_image().map_err(|e| e.to_string())?;

    let (fw, fh) = (full.width(), full.height());
    let x = region.x.max(0) as u32;
    let y = region.y.max(0) as u32;
    let w = region.w.max(32).min(fw.saturating_sub(x).max(32));
    let h = region.h.max(32).min(fh.saturating_sub(y).max(32));
    let cropped = image::imageops::crop_imm(&full, x, y, w, h).to_image();

    let out = std::env::temp_dir().join(format!("kontext-{}.png", Utc::now().timestamp_millis()));
    cropped.save(&out).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "path": out.to_string_lossy(),
        "w": w,
        "h": h,
        "hint": "v1 saves a crop. OCR plugs in next (Windows OCR / Tesseract). For now paste JP manually or use texthook ingest."
    }))
}

// ---------- Context-aware translation stub ----------
// v1 is rule-based so it runs offline with zero model.
// v2 can call a local abliterated 0.5B-1.5B model with build_overview_prompt() payload.

#[derive(Debug, Serialize)]
struct TranslateResult {
    draft_en: String,
    ambiguous: bool,
    warnings: Vec<String>,
    context_used: usize,
    prompt_for_llm: String,
}

fn last_speaker(history: &[DialogueLine]) -> Option<String> {
    history.iter().rev().find(|l| !l.speaker.is_empty()).map(|l| l.speaker.clone())
}

#[tauri::command]
async fn translate_with_context(
    state: State<'_, AppState>,
    jp: String,
    speaker: Option<String>,
) -> Result<TranslateResult, String> {
    let history = state.history.lock().map_err(|e| e.to_string())?.clone();
    let characters = state.characters.lock().map_err(|e| e.to_string())?.clone();
    let ctx: Vec<DialogueLine> = history.iter().rev().take(12).rev().cloned().collect();

    let speaker = speaker.unwrap_or_default();
    let mut warnings: Vec<String> = Vec::new();

    // Heuristic: JP often drops the subject. If line is short and has no clear
    // name/pronoun marker, flag it as ambiguous so UI shows context.
    let short = jp.chars().count() < 24;
    let has_watashi = jp.contains("私") || jp.contains("僕") || jp.contains("俺") || jp.contains("あたし");
    let ambiguous = short && !has_watashi;

    if ambiguous {
        warnings.push("Subject dropped in JP. Check context panel before locking pronouns.".into());
    }
    if let Some(ls) = last_speaker(&history) {
        if ls != speaker && !speaker.is_empty() {
            warnings.push(format!("Speaker changed ({} -> {}). Keep voice consistent.", ls, speaker));
        }
    }
    // Gender safety: if speaker gender unknown, warn instead of guessing he/she.
    if !speaker.is_empty() {
        match characters.get(&speaker) {
            Some(c) if c.gender == "unknown" || c.gender.is_empty() => {
                warnings.push(format!("{} gender unknown. Use they/name, not he/she.", speaker))
            }
            None => warnings.push(format!("New speaker '{}'. Add to Characters with gender + adult flag.", speaker)),
            _ => {}
        }
    }

    // Draft EN for v1: passthrough with context header so overlay still helps.
    // Real NMT (opus-mt-ja-en ONNX) and optional tiny LLM plug in here in v2.
    let mut ctx_block = String::new();
    for l in ctx.iter().rev().take(5).rev() {
        let who = if l.speaker.is_empty() { "??" } else { &l.speaker };
        ctx_block.push_str(&format!("{}: {} ({})\n", who, l.jp, l.en));
    }
    let draft_en = format!("[DRAFT] {}", jp);

    let prompt_for_llm = build_llm_prompt(&ctx, &characters, &speaker, &jp);

    Ok(TranslateResult {
        draft_en,
        ambiguous,
        warnings,
        context_used: ctx.len(),
        prompt_for_llm,
    })
}

#[tauri::command]
async fn add_line(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    jp: String,
    en: String,
    speaker: Option<String>,
) -> Result<DialogueLine, String> {
    let speaker = speaker.unwrap_or_default();
    let line = DialogueLine {
        id: format!("l{}", Utc::now().timestamp_millis()),
        ts: Utc::now().to_rfc3339(),
        speaker,
        jp,
        en,
        ambiguous: false,
        note: String::new(),
    };
    {
        let mut h = state.history.lock().map_err(|e| e.to_string())?;
        h.push(line.clone());
        if h.len() > 400 {
            let drain = h.len() - 400;
            h.drain(0..drain);
        }
    }
    let _ = save_state(&app, &state);
    let _ = app.emit("kontext:line", &line);
    Ok(line)
}

/// Textractor / texthook intake with dedupe.
/// Textractor repeats the same hook constantly, so identical back to back
/// lines are skipped. Returns None when skipped.
#[tauri::command]
async fn ingest_hook_text(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    text: String,
    speaker: Option<String>,
) -> Result<Option<DialogueLine>, String> {
    let jp = clean_hook_text(&text);
    if jp.is_empty() || jp.chars().count() < 2 {
        return Ok(None);
    }
    let speaker = speaker.unwrap_or_default();
    {
        let last = state.last_hook.lock().map_err(|e| e.to_string())?.clone();
        if last.0 == jp && last.1 == speaker {
            return Ok(None);
        }
        // Skip if identical to newest history line (common on VN advance spam).
        if let Some(prev) = state.history.lock().map_err(|e| e.to_string())?.last() {
            if prev.jp == jp && prev.speaker == speaker {
                return Ok(None);
            }
        }
    }
    let line = DialogueLine {
        id: format!("l{}", Utc::now().timestamp_millis()),
        ts: Utc::now().to_rfc3339(),
        speaker: speaker.clone(),
        jp: jp.clone(),
        // v1 draft. v2 fills real offline NMT + optional tiny LLM here.
        en: format!("[HOOK] {}", jp),
        ambiguous: jp.chars().count() < 24,
        note: "texthook".into(),
    };
    {
        let mut h = state.history.lock().map_err(|e| e.to_string())?;
        h.push(line.clone());
        if h.len() > 400 {
            let drain = h.len() - 400;
            h.drain(0..drain);
        }
        *state.last_hook.lock().map_err(|e| e.to_string())? = (jp, speaker);
    }
    let _ = save_state(&app, &state);
    let _ = app.emit("kontext:line", &line);
    Ok(Some(line))
}

#[tauri::command]
async fn get_history(state: State<'_, AppState>, limit: Option<usize>) -> Result<Vec<DialogueLine>, String> {
    let h = state.history.lock().map_err(|e| e.to_string())?.clone();
    let n = limit.unwrap_or(60).min(h.len().max(1));
    Ok(h.into_iter().rev().take(n).rev().collect())
}

#[tauri::command]
async fn clear_history(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    state.history.lock().map_err(|e| e.to_string())?.clear();
    let _ = save_state(&app, &state);
    Ok(())
}

// ---------- Characters + overview (ecchi-aware but adult-only) ----------

#[tauri::command]
async fn upsert_character(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    c: Character,
) -> Result<Character, String> {
    state
        .characters
        .lock()
        .map_err(|e| e.to_string())?
        .insert(c.name.clone(), c.clone());
    let _ = save_state(&app, &state);
    Ok(c)
}

#[tauri::command]
async fn load_store(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let n = load_state_into(&app, &state)?;
    let region = state.region.lock().map_err(|e| e.to_string())?.clone();
    Ok(serde_json::json!({ "loaded_lines": n, "region": region }))
}

#[tauri::command]
async fn get_characters(state: State<'_, AppState>) -> Result<Vec<Character>, String> {
    Ok(state
        .characters
        .lock()
        .map_err(|e| e.to_string())?
        .values()
        .cloned()
        .collect())
}

fn build_llm_prompt(
    ctx: &[DialogueLine],
    characters: &HashMap<String, Character>,
    speaker: &str,
    jp: &str,
) -> String {
    let mut s = String::from(
        "Translate VN dialogue with context. Rules: keep speaker voice, do not invent gender. If gender unknown use they or the name. If subject is dropped in Japanese, resolve it from prior lines, else keep neutral.\nCHARACTERS:\n",
    );
    for c in characters.values() {
        s.push_str(&format!(
            "- {} (gender: {}, adult: {}, style: {}, notes: {})\n",
            c.name, c.gender, c.is_adult, c.speech_style, c.notes
        ));
    }
    s.push_str("RECENT LINES:\n");
    for l in ctx.iter().rev().take(10).rev() {
        s.push_str(&format!("{}: {}\n", l.speaker, l.jp));
    }
    s.push_str(&format!("NOW TRANSLATE ({}): {}\nEN:", speaker, jp));
    s
}

#[tauri::command]
async fn build_overview_prompt(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let history = state.history.lock().map_err(|e| e.to_string())?.clone();
    let characters = state.characters.lock().map_err(|e| e.to_string())?.clone();

    // Only adult-flagged characters get mature relationship notes.
    // Unknown/minor characters are summarized plot-only, no ecchi detail.
    let mut char_block = String::new();
    for c in characters.values() {
        if c.is_adult {
            char_block.push_str(&format!(
                "- {} ({}): {} [{}]\n",
                c.name, c.gender, c.notes, c.speech_style
            ));
        } else {
            char_block.push_str(&format!("- {} ({}): plot-only, no mature detail\n", c.name, c.gender));
        }
    }
    let recent: Vec<String> = history
        .iter()
        .rev()
        .take(30)
        .rev()
        .map(|l| format!("{}: {} // {}", l.speaker, l.jp, l.en))
        .collect();

    let system = "You recap visual novel progress offline. You may discuss adult romance/ecchi ONLY for characters explicitly marked adult. Never sexualize minors or unknown-age characters. Keep summaries story-focused, non-graphic, no pornographic detail. If unsure about age, treat as minor-safe. Use they/name when gender unknown.".to_string();
    let user = format!(
        "CHARACTERS:\n{}\nRECENT DIALOGUE (oldest to newest):\n{}\nTASK: Give a short 'what we know so far' recap: plot threads, relationships, each adult character in 1 line. Flag ambiguous pronouns.",
        char_block,
        recent.join("\n")
    );

    Ok(serde_json::json!({ "system": system, "user": user, "history_len": history.len() }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Load persistent memory so closing the app never wipes progress.
            if let Some(state) = app.try_state::<AppState>() {
                let handle = app.handle().clone();
                let _ = load_state_into(&handle, &state);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            move_to_next_monitor,
            set_always_on_top,
            toggle_overlay,
            set_region,
            get_region,
            capture_region,
            translate_with_context,
            add_line,
            ingest_hook_text,
            get_history,
            clear_history,
            upsert_character,
            get_characters,
            load_store,
            build_overview_prompt
        ])
        .run(tauri::generate_context!())
        .expect("error while running kontext");
}
