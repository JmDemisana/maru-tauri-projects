import { openUrl } from "@tauri-apps/plugin-opener";
import { save as saveFileDialog } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { parseMidiFile, type ParsedMidiFile, type ParsedMidiNote } from "./utils/midiParser";
import {
  MONIKA_PIANO_KEYS,
  foldPitchToMonikaRange,
  getMonikaKeyByMidi,
  getMonikaKeyByNoteName,
  getMonikaKeyByChar,
  generateMonikaPianoJson,
  generateStandardMonikaPianoJson,
  generateCompactMonikaPianoJson,
  analyzeSongDelays,
  generateLyricsKeysText,
  validateMonikaPianoJson,
  generatePostpianoRpy,
  parseRawKeyCharactersToPhrases,
  parseMonikaSongInput,
  type MonikaPhrase,
  type MonikaPianoSong,
  type MonikaPianoKey,
  type PostpianoDialogueLine,
  type PostpianoMenuChoice,
  type PostpianoScriptConfig,
} from "./utils/monikaPiano";
import { MONIKA_CUSTOM_SONGS, isAnnotatedSong, type CustomPianoSongEntry } from "./data/monikaCustomSongs";
import {
  generateExternalAiPrompt,
  parseAiShorthandCode,
} from "./utils/monikaAiPrompt";
import { pianoSynth } from "./utils/pianoAudio";
import { GlidingHoverGroup } from "./components/GlidingHoverGroup";
import { AppletDetailModal } from "./components/AppletDetailModal";
import { StudioAppletShell } from "./components/StudioAppletShell";
import { MonikaSpriteVisualizer } from "./components/MonikaSpriteVisualizer";
import { TitleBar } from "./components/TitleBar";
import "./MonikaPianoMaker.css";

type AppTab = "piano" | "library" | "dialogue" | "expressions";

export interface CustomEmotionPreset {
  id: string;
  code: string;
  label: string;
  pose: string;
  eyes: string;
  brows: string;
  mouth: string;
  modifier?: string;
  isUserCreated?: boolean;
}

// 12 White Keys & 8 Black Keys for authentic 20-key layout
const WHITE_PIANO_KEYS = MONIKA_PIANO_KEYS.filter((k) => !k.isSharp);

const BLACK_PIANO_KEYS = [
  { ...getMonikaKeyByNoteName("F4SH")!, leftOffset: "8.333%" },
  { ...getMonikaKeyByNoteName("G4SH")!, leftOffset: "16.666%" },
  { ...getMonikaKeyByNoteName("A4SH")!, leftOffset: "25.000%" },
  { ...getMonikaKeyByNoteName("C5SH")!, leftOffset: "41.666%" },
  { ...getMonikaKeyByNoteName("D5SH")!, leftOffset: "50.000%" },
  { ...getMonikaKeyByNoteName("F5SH")!, leftOffset: "66.666%" },
  { ...getMonikaKeyByNoteName("G5SH")!, leftOffset: "75.000%" },
  { ...getMonikaKeyByNoteName("A5SH")!, leftOffset: "83.333%" },
];

const EXTENDED_POSES = [
  { code: "1", label: "1 - Desk Rest / Folded Hands" },
  { code: "2", label: "2 - Pointing / Explaining" },
  { code: "3", label: "3 - Hands on Hips" },
  { code: "4", label: "4 - Head Tilt / Inquisitive" },
  { code: "5", label: "5 - Hand on Cheek / Dreamy" },
  { code: "6", label: "6 - Hand on Heart / Sentimental" },
  { code: "7", label: "7 - Hair Twirl / Playful" },
];

const EXTENDED_EYES = [
  { code: "e", label: "e - Normal / Direct Gaze" },
  { code: "w", label: "w - Wide / Excited Sparkle" },
  { code: "s", label: "s - Soft / Half-Lidded Romantic" },
  { code: "d", label: "d - Downcast / Shy" },
  { code: "t", label: "t - Smug / Teasing Glance" },
  { code: "h", label: "h - Happy Closed (⌒ ⌒)" },
  { code: "k", label: "k - Playful Wink" },
  { code: "l", label: "l - Glance Left" },
  { code: "r", label: "r - Glance Right" },
];

const EXTENDED_BROWS = [
  { code: "u", label: "u - Up / Friendly Smile" },
  { code: "d", label: "d - Down / Sad Concerned" },
  { code: "f", label: "f - Furrowed / Determined" },
  { code: "m", label: "m - Mid / Relaxed" },
  { code: "w", label: "w - Wide Raised / Surprised" },
];

const EXTENDED_MOUTHS = [
  { code: "a", label: "a - Closed Sweet Smile" },
  { code: "b", label: "b - Singing / Open Talking" },
  { code: "c", label: "c - Neutral Closed Line" },
  { code: "d", label: "d - Gasp / Open Sad" },
  { code: "p", label: "p - Cute Pout (-3-)" },
  { code: "w", label: "w - Wide Laugh" },
];

const EXTENDED_MODIFIERS = [
  { code: "", label: "Normal (No FX)" },
  { code: "blush", label: "🌸 Rosy Blush" },
  { code: "deepblush", label: "😳 Deep Flustered Blush" },
  { code: "sweat", label: "💧 Sweat Drop" },
  { code: "hearts", label: "💚 Floating Hearts" },
  { code: "tears", label: "🥺 Soft Tears" },
];

const FACTORY_PRESETS: CustomEmotionPreset[] = [
  { id: "pre-1", code: "1eua", label: "Friendly Smile", pose: "1", eyes: "e", brows: "u", mouth: "a" },
  { id: "pre-2", code: "1eub", label: "Singing Happy", pose: "1", eyes: "e", brows: "u", mouth: "b" },
  { id: "pre-3", code: "1hua", label: "Gentle Closed Smile", pose: "1", eyes: "h", brows: "u", mouth: "a" },
  { id: "pre-4", code: "1hub", label: "Joyful Singing", pose: "1", eyes: "h", brows: "u", mouth: "b" },
  { id: "pre-5", code: "5sua", label: "Dreamy Romance", pose: "5", eyes: "s", brows: "u", mouth: "a", modifier: "blush" },
  { id: "pre-6", code: "6sub", label: "Passionate Melody", pose: "6", eyes: "s", brows: "u", mouth: "b", modifier: "blush" },
  { id: "pre-7", code: "1kua", label: "Playful Wink", pose: "1", eyes: "k", brows: "u", mouth: "a" },
  { id: "pre-8", code: "4eua", label: "Inquisitive Tilt", pose: "4", eyes: "e", brows: "u", mouth: "a" },
  { id: "pre-9", code: "1tua", label: "Bashful Glance", pose: "1", eyes: "t", brows: "u", mouth: "a", modifier: "blush" },
  { id: "pre-10", code: "2eub", label: "Explaining Point", pose: "2", eyes: "e", brows: "u", mouth: "b" },
  { id: "pre-11", code: "7sub", label: "Hair Twirl Melancholy", pose: "7", eyes: "s", brows: "u", mouth: "b" },
  { id: "pre-12", code: "1wub", label: "Surprised Joy", pose: "1", eyes: "w", brows: "u", mouth: "b" },
];

// Memoized Piano Keyboard
const PianoKeyboard = React.memo(function PianoKeyboard({
  activeNoteMidi,
  onPlayKey,
}: {
  activeNoteMidi: number | null;
  onPlayKey: (k: MonikaPianoKey) => void;
}) {
  return (
    <div className="mpm-piano-wrapper" style={{ margin: "0.4rem 0" }}>
      <div className="mpm-piano-keyboard" style={{ height: "115px" }}>
        <div className="mpm-white-keys-container">
          {WHITE_PIANO_KEYS.map((k) => {
            const isActive = activeNoteMidi === k.midi;
            return (
              <button
                key={k.note}
                className={`mpm-white-key ${isActive ? "active" : ""}`}
                onMouseDown={() => onPlayKey(k)}
                title={`${k.label} (MAS Key: ${k.displayKey})`}
              >
                <span className="mpm-key-char">{k.displayKey}</span>
                <span className="mpm-key-note">{k.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mpm-black-keys-container">
          {BLACK_PIANO_KEYS.map((k) => {
            const isActive = activeNoteMidi === k.midi;
            return (
              <button
                key={k.note}
                className={`mpm-black-key ${isActive ? "active" : ""}`}
                style={{ left: k.leftOffset }}
                onMouseDown={() => onPlayKey(k)}
                title={`${k.label} (MAS Key: ${k.displayKey})`}
              >
                <span className="mpm-key-char">{k.displayKey}</span>
                <span className="mpm-key-note">{k.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

// Highly Memoized Individual Phrase Card
interface PhraseCardItemProps {
  phrase: MonikaPhrase;
  pIdx: number;
  isCurrentPlaying: boolean;
  isFocused: boolean;
  isTimingCurrentPhrase: boolean;
  timingNoteIdx: number;
  userCustomPresets: CustomEmotionPreset[];
  noteToAdd: string;
  setNoteToAdd: (n: string) => void;
  onTextChange: (pIdx: number, text: string) => void;
  onExpressionChange: (pIdx: number, express: string) => void;
  onToggleVerse: (pIdx: number) => void;
  onMoveUp: (pIdx: number) => void;
  onMoveDown: (pIdx: number) => void;
  onDuplicate: (pIdx: number) => void;
  onDelete: (pIdx: number) => void;
  onPlaySingle: (pIdx: number) => void;
  onUpdatePitch: (pIdx: number, nIdx: number, pitch: string) => void;
  onRemoveNote: (pIdx: number, nIdx: number) => void;
  onNoteDelayChange: (pIdx: number, nIdx: number, delay: number) => void;
  onAddNote: (pIdx: number, note: string) => void;
  onSetAllDelays: (pIdx: number, delay: number) => void;
  onSelectFocus: (pIdx: number) => void;
  onPlayKey: (k: MonikaPianoKey) => void;
  isLast: boolean;
}

const PhraseCardItem = React.memo(
  function PhraseCardItem({
    phrase,
    pIdx,
    isCurrentPlaying,
    isFocused,
    isTimingCurrentPhrase,
    timingNoteIdx,
    userCustomPresets,
    noteToAdd,
    setNoteToAdd,
    onTextChange,
    onExpressionChange,
    onToggleVerse,
    onMoveUp,
    onMoveDown,
    onDuplicate,
    onDelete,
    onPlaySingle,
    onUpdatePitch,
    onRemoveNote,
    onNoteDelayChange,
    onAddNote,
    onSetAllDelays,
    onSelectFocus,
    onPlayKey,
    isLast,
  }: PhraseCardItemProps) {
    const phraseAvgDelay = phrase.noteDelays && phrase.noteDelays.length > 0
      ? phrase.noteDelays.reduce((a, b) => a + b, 0) / phrase.noteDelays.length
      : 0.35;

    return (
      <div
        className={`mpm-phrase-card ${isCurrentPlaying ? "playing" : ""} ${isFocused ? "focused" : ""} ${isTimingCurrentPhrase ? "timing-active" : ""}`}
        onClick={() => onSelectFocus(pIdx)}
        style={{ padding: "0.75rem 0.85rem" }}
      >
        <div className="mpm-phrase-top" style={{ marginBottom: "0.4rem" }}>
          <div className="mpm-phrase-meta">
            <span className="mpm-phrase-num">#{pIdx + 1}</span>
            <label className="mpm-checkbox-label" title="Mark as Verse Checkpoint" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={phrase.verse !== undefined}
                onChange={() => onToggleVerse(pIdx)}
              />
              <span style={{ fontSize: "0.75rem", color: phrase.verse !== undefined ? "#38bdf8" : "#94a3b8" }}>
                Verse
              </span>
            </label>
            <span className="mpm-phrase-timing-pill">
              ⏱️ {phraseAvgDelay.toFixed(2)}s avg
            </span>
          </div>

          <input
            type="text"
            className="mpm-phrase-input"
            value={phrase.text}
            onChange={(e) => onTextChange(pIdx, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Lyric text Monika will speak..."
          />

          <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
            <select
              className="mpm-select"
              value={phrase.express || "1eua"}
              onChange={(e) => onExpressionChange(pIdx, e.target.value)}
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem", maxWidth: "140px" }}
            >
              <optgroup label="✨ Built-In Presets">
                {FACTORY_PRESETS.map((preset) => (
                  <option key={preset.code} value={preset.code}>
                    {preset.label} ({preset.code})
                  </option>
                ))}
              </optgroup>
              {userCustomPresets.length > 0 && (
                <optgroup label="⭐ Your Custom Presets">
                  {userCustomPresets.map((preset) => (
                    <option key={preset.id} value={preset.code}>
                      {preset.label} ({preset.code})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <button className="mpm-action-btn" onClick={() => onMoveUp(pIdx)} disabled={pIdx === 0} style={{ padding: "0.2rem 0.45rem", fontSize: "0.75rem" }}>↑</button>
            <button className="mpm-action-btn" onClick={() => onMoveDown(pIdx)} disabled={isLast} style={{ padding: "0.2rem 0.45rem", fontSize: "0.75rem" }}>↓</button>
            <button className="mpm-action-btn" onClick={() => onDuplicate(pIdx)} style={{ padding: "0.2rem 0.45rem", fontSize: "0.75rem" }}>📋</button>
            <button className="mpm-action-btn" onClick={() => onPlaySingle(pIdx)} style={{ padding: "0.2rem 0.45rem", fontSize: "0.75rem", color: "#38bdf8" }}>▶</button>
            <button className="mpm-action-btn" onClick={() => onDelete(pIdx)} style={{ padding: "0.2rem 0.45rem", fontSize: "0.75rem", color: "#f87171" }}>✕</button>
          </div>
        </div>

        {/* Note Chips */}
        <div className="mpm-note-chips" style={{ gap: "0.35rem" }}>
          {phrase.notes.map((noteName, nIdx) => {
            const keyObj = getMonikaKeyByNoteName(noteName);
            const delaySec = (phrase.noteDelays && phrase.noteDelays[nIdx] !== undefined)
              ? phrase.noteDelays[nIdx]
              : 0.35;
            const isCurrentlyTimingThisNote = isTimingCurrentPhrase && timingNoteIdx === nIdx;

            return (
              <div
                key={nIdx}
                className={`mpm-note-chip ${isCurrentlyTimingThisNote ? "timing-active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (keyObj) {
                    onPlayKey(keyObj);
                  }
                }}
              >
                <div className="chip-note-info" onClick={(e) => e.stopPropagation()}>
                  <select
                    className="chip-pitch-select"
                    value={noteName}
                    onChange={(e) => onUpdatePitch(pIdx, nIdx, e.target.value)}
                  >
                    {MONIKA_PIANO_KEYS.map((k) => (
                      <option key={k.note} value={k.note}>
                        {k.note} ({k.displayKey})
                      </option>
                    ))}
                  </select>
                  <button className="chip-delete-btn" onClick={() => onRemoveNote(pIdx, nIdx)}>✕</button>
                </div>

                <div className="chip-delay-control" onClick={(e) => e.stopPropagation()}>
                  <span className="delay-icon">⏱️</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="10.0"
                    className="chip-delay-input"
                    value={delaySec}
                    onChange={(e) => onNoteDelayChange(pIdx, nIdx, parseFloat(e.target.value) || 0.35)}
                  />
                  <span className="delay-unit">s</span>
                </div>
              </div>
            );
          })}

          <div className="mpm-add-note-inline" onClick={(e) => e.stopPropagation()}>
            <select
              className="mpm-select mini"
              value={noteToAdd}
              onChange={(e) => setNoteToAdd(e.target.value)}
            >
              {MONIKA_PIANO_KEYS.map((k) => (
                <option key={k.note} value={k.note}>
                  {k.note} ({k.displayKey})
                </option>
              ))}
            </select>
            <button
              className="mpm-action-btn"
              style={{ fontSize: "0.72rem", padding: "0.2rem 0.45rem" }}
              onClick={() => onAddNote(pIdx, noteToAdd)}
            >
              + Note
            </button>
          </div>
        </div>

        {/* Phrase Bottom Timing Bar */}
        <div className="mpm-phrase-timing-bar" style={{ marginTop: "0.4rem" }} onClick={(e) => e.stopPropagation()}>
          <div className="mpm-batch-delays-group">
            <span className="timing-label">Set Delays:</span>
            <div className="mpm-mini-preset-chips">
              {[0.25, 0.32, 0.45, 0.65].map((d) => (
                <button
                  key={d}
                  className="mpm-mini-chip"
                  onClick={() => onSetAllDelays(pIdx, d)}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

function MonikaPianoMobileBlocked() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "calc(100vh - 80px)",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        boxSizing: "border-box",
      }}
    >
      <div
        className="mpm-card"
        style={{
          width: "min(100%, 32rem)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "0.85rem",
          padding: "2.25rem 1.75rem",
          border: "1px solid rgba(16, 185, 129, 0.45)",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(6, 78, 59, 0.3) 100%)",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.5)",
          borderRadius: "16px",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            background: "rgba(16, 185, 129, 0.18)",
            border: "1.5px solid rgba(16, 185, 129, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.75rem",
            boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)",
          }}
        >
          🎹
        </div>

        <span
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#34d399",
            fontWeight: 700,
          }}
        >
          Desktop Workstation Required
        </span>

        <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#f8fafc" }}>
          Monika Piano Studio
        </h2>

        <p style={{ margin: 0, fontSize: "0.88rem", color: "#cbd5e1", lineHeight: 1.6 }}>
          This full DAW and piano workstation requires a wide desktop screen and a physical keyboard to transcribe musical phrases, calibrate timings, and compose Monika After Story custom songs.
        </p>

        <div
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "0.65rem 1rem",
            fontSize: "0.78rem",
            color: "#94a3b8",
            marginTop: "0.4rem",
            lineHeight: 1.5,
          }}
        >
          🖥️ <strong>Please open or maximize this window on a desktop PC or laptop</strong> to access the piano studio, library catalog, dialogue script editor, and expressions studio.
        </div>
      </div>
    </div>
  );
}

export default function MonikaPianoMaker() {
  

  const [activeTab, setActiveTab] = useState<AppTab>("piano");
  const [noteToAdd, setNoteToAdd] = useState<string>("D5");

  // External AI Shorthand Hub State
  const [aiPromptMode, setAiPromptMode] = useState<"full" | "dialogue_only">("full");
  const [aiPromptTitle, setAiPromptTitle] = useState("");
  const [aiPromptArtist, setAiPromptArtist] = useState("");
  const [aiPromptLyrics, setAiPromptLyrics] = useState("");
  const [aiPromptTone, setAiPromptTone] = useState("Sweet & Romantic");
  const [aiPromptDifficulty, setAiPromptDifficulty] = useState("Standard Melodic");
  const [aiShorthandInput, setAiShorthandInput] = useState("");
  const [aiParseStatus, setAiParseStatus] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDialogueModalOpen, setIsDialogueModalOpen] = useState(false);
  const [companionSongSlug, setCompanionSongSlug] = useState<string>("backtodecember");
  const [companionLineIdx, setCompanionLineIdx] = useState<number>(0);
  const [companionChoiceId, setCompanionChoiceId] = useState<string | null>(null);
  const [copiedSubmodPath, setCopiedSubmodPath] = useState<boolean>(false);
  const [showRawLyrics, setShowRawLyrics] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);

  // Custom Songs Catalog
  const customSongsList = MONIKA_CUSTOM_SONGS;
  const [selectedSongSlug, setSelectedSongSlug] = useState<string>("backtodecember");
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>("");

  const filteredCatalogSongs = useMemo(() => {
    const query = catalogSearchQuery.trim().toLowerCase();
    if (!query) return customSongsList;
    return customSongsList.filter((song) => {
      const nameMatch = song.name.toLowerCase().includes(query);
      const artistMatch = song.artist.toLowerCase().includes(query);
      const descMatch = song.description.toLowerCase().includes(query);
      const authorMatch = song.credits?.author.toLowerCase().includes(query);
      const noteMatch = song.credits?.note?.toLowerCase().includes(query);
      const lyricsMatch = song.songData.pnm_list?.some((p) => p.text?.toLowerCase().includes(query));
      return Boolean(nameMatch || artistMatch || descMatch || authorMatch || noteMatch || lyricsMatch);
    });
  }, [customSongsList, catalogSearchQuery]);

  // Raw Keys Shorthand Import State
  const [isRawKeysModalOpen, setIsRawKeysModalOpen] = useState<boolean>(false);
  const [rawKeysInput, setRawKeysInput] = useState<string>("");
  const [rawKeysDefaultDelay, setRawKeysDefaultDelay] = useState<number>(0.28);

  const parsedRawKeysPreview = useMemo(() => {
    if (!rawKeysInput.trim()) return [];
    return parseRawKeyCharactersToPhrases(rawKeysInput, { defaultNoteDelay: rawKeysDefaultDelay });
  }, [rawKeysInput, rawKeysDefaultDelay]);

  const rawKeysTotalNotes = useMemo(() => {
    return parsedRawKeysPreview.reduce((acc, p) => acc + p.notes.length, 0);
  }, [parsedRawKeysPreview]);

  // Song metadata
  const [songName, setSongName] = useState("Back to December");
  const [songArtist, setSongArtist] = useState("Taylor Swift");
  const [dialoguePrefix, setDialoguePrefix] = useState("jmcustom");

  const selectedCompanionSong = useMemo(() => {
    return MONIKA_CUSTOM_SONGS.find((s) => s.slug === companionSongSlug) || MONIKA_CUSTOM_SONGS[0];
  }, [companionSongSlug]);

  const activeDialogueSequence = useMemo(() => {
    const cfg = selectedCompanionSong.dialogueConfig;
    if (!cfg) return [];
    const seq: Array<{ speaker: string; expression?: string; text: string; choicePrompt?: string; choices?: typeof cfg.perfectChoices }> = [];
    (cfg.perfectLines || []).forEach((l) => seq.push(l));
    if (cfg.perfectChoices && cfg.perfectChoices.length > 0) {
      const selectedChoice = cfg.perfectChoices.find((c) => c.id === companionChoiceId) || cfg.perfectChoices[0];
      seq.push({
        speaker: "m",
        expression: "2euc",
        text: cfg.perfectMenuPrompt || "Make a choice...",
        choices: cfg.perfectChoices,
      });
      if (selectedChoice && selectedChoice.lines) {
        selectedChoice.lines.forEach((l) => seq.push(l));
      }
    }
    (cfg.perfectPostMenuLines || []).forEach((l) => seq.push(l));
    return seq;
  }, [selectedCompanionSong, companionChoiceId]);

  // MIDI state
  const [parsedMidi, setParsedMidi] = useState<ParsedMidiFile | null>(null);
  const [selectedTrackIndices, setSelectedTrackIndices] = useState<number[]>([0]);
  const [fileName, setFileName] = useState<string>("back_to_december.json");

  // Modulo folding & Transposition state
  const [transposeSemitones, setTransposeSemitones] = useState<number>(0);
  const [preferHigherOctave, setPreferHigherOctave] = useState<boolean>(false);

  // Lyrics and Phrases state
  const [rawLyrics, setRawLyrics] = useState<string>("");
  const [phrases, setPhrases] = useState<MonikaPhrase[]>([]);

  // ── Synchronized Live References (Impervious to React async render lag) ──
  const phrasesRef = useRef<MonikaPhrase[]>([]);
  phrasesRef.current = phrases;

  // Unsaved-change detection: baseline JSON fingerprint of the last loaded/created project
  const baselineJsonRef = useRef<string>("");
  const [pendingProjectSwitch, setPendingProjectSwitch] = useState<null | { kind: "new" } | { kind: "file"; file: File } | { kind: "load"; song: CustomPianoSongEntry } | { kind: "close" }>(null);

  // Playback & Virtual Piano state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activePhraseIndex, setActivePhraseIndex] = useState<number | null>(null);
  const [activeNoteMidi, setActiveNoteMidi] = useState<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Live Record Mode State & Refs
  const [isRecordingLive, setIsRecordingLive] = useState(false);
  const isRecordingLiveRef = useRef(false);
  isRecordingLiveRef.current = isRecordingLive;
  const lastRecordKeyTimeRef = useRef<number | null>(null);

  // Live Time Mode State & Synchronous Refs
  const [isTimingMode, setIsTimingMode] = useState(false);
  const isTimingModeRef = useRef(false);
  isTimingModeRef.current = isTimingMode;
  const [timingPhraseIdx, setTimingPhraseIdx] = useState<number>(0);
  const timingPhraseIdxRef = useRef<number>(0);
  const [timingNoteIdx, setTimingNoteIdx] = useState<number>(0);
  const timingNoteIdxRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number | null>(null);

  const phraseCardsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll in playback & Time Mode
  useEffect(() => {
    if (activePhraseIndex !== null && isPlaying) {
      const activeEl = phraseCardsRef.current[activePhraseIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    }
  }, [activePhraseIndex, isPlaying]);

  // Only scroll when phrase index advances in Time Mode (avoids per-note scroll thrashing)
  useEffect(() => {
    if (isTimingMode) {
      const activeEl = phraseCardsRef.current[timingPhraseIdx];
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    }
  }, [isTimingMode, timingPhraseIdx]);

  const [activeEditingPhraseIdx, setActiveEditingPhraseIdx] = useState<number>(0);

  // Dialogue Studio State
  const [includeCommonFallbacks, setIncludeCommonFallbacks] = useState(true);
  const [preSongLines, setPreSongLines] = useState<PostpianoDialogueLine[]>([
    { id: "pre-1", speaker: "m", expression: "1eua", text: "Are you ready to play together, [player]?" },
  ]);
  const [perfectLines, setPerfectLines] = useState<PostpianoDialogueLine[]>([
    { id: "pf-1", speaker: "m", expression: "1hua", text: "That was wonderful! You played every single note in perfect harmony with me!" },
    { id: "pf-2", speaker: "m", expression: "1sua", text: "Playing piano with you always makes my day brighter, [player]." },
  ]);
  const [almostLines, setAlmostLines] = useState<PostpianoDialogueLine[]>([
    { id: "alm-1", speaker: "m", expression: "1wub", text: "That was great, [player]!" },
    { id: "alm-2", speaker: "m", expression: "4eua", text: "With just a little more practice, you'll perfect it!" },
  ]);
  const [escapeLines, setEscapeLines] = useState<PostpianoDialogueLine[]>([
    { id: "esc-1", speaker: "m", expression: "1euc", text: "..." },
    { id: "esc-2", speaker: "m", expression: "1eua", text: "Aww, don't worry [player]. Take your time, we can try again whenever you want!" },
  ]);
  const [enableChoiceMenu, setEnableChoiceMenu] = useState(true);
  const [menuPrompt, setMenuPrompt] = useState("Did you enjoy playing this song with me, [player]?");
  const [menuChoices, setMenuChoices] = useState<PostpianoMenuChoice[]>([
    {
      id: "choice-1",
      choiceText: "It was magical!",
      lines: [{ id: "rep-1", speaker: "m", expression: "1eub", text: "Ahaha, I thought so too! Music is always better when we share it." }],
    },
    {
      id: "choice-2",
      choiceText: "My fingers slipped a bit...",
      lines: [{ id: "rep-2", speaker: "m", expression: "1hua", text: "You still did wonderfully, [player]! Every bit of practice brings us closer." }],
    },
  ]);

  // MAS Emotion & Sprite Simulator State
  const [simPose, setSimPose] = useState("1");
  const [simEyes, setSimEyes] = useState("e");
  const [simBrows, setSimBrows] = useState("u");
  const [simMouth, setSimMouth] = useState("a");
  const [simModifier, setSimModifier] = useState("");
  const [simDialogueText, setSimDialogueText] = useState("Every day, I imagine a future where I can be with you...");
  const [newPresetLabel, setNewPresetLabel] = useState("");

  const [userCustomPresets, setUserCustomPresets] = useState<CustomEmotionPreset[]>(() => {
    try {
      const saved = localStorage.getItem("monika_custom_expression_presets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const activeExpressionCode = `${simPose}${simEyes}${simBrows}${simMouth}`;

  const handleSaveCustomPreset = () => {
    const label = newPresetLabel.trim() || `Custom (${activeExpressionCode})`;
    const newPreset: CustomEmotionPreset = {
      id: `user-pre-${Date.now()}`,
      code: activeExpressionCode,
      label,
      pose: simPose,
      eyes: simEyes,
      brows: simBrows,
      mouth: simMouth,
      modifier: simModifier,
      isUserCreated: true,
    };

    const updated = [...userCustomPresets, newPreset];
    setUserCustomPresets(updated);
    try {
      localStorage.setItem("monika_custom_expression_presets", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to persist custom emotion preset", e);
    }
    setNewPresetLabel("");
  };

  const handleDeleteCustomPreset = (presetId: string) => {
    const updated = userCustomPresets.filter((p) => p.id !== presetId);
    setUserCustomPresets(updated);
    try {
      localStorage.setItem("monika_custom_expression_presets", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to delete custom emotion preset", e);
    }
  };

  const handleApplyPresetToSimulator = (preset: CustomEmotionPreset) => {
    setSimPose(preset.pose);
    setSimEyes(preset.eyes);
    setSimBrows(preset.brows);
    setSimMouth(preset.mouth);
    setSimModifier(preset.modifier || "");
  };

  const handleApplyExpressionToActivePhrase = () => {
    if (phrases.length === 0) return;
    const targetIdx = Math.min(activeEditingPhraseIdx, phrases.length - 1);
    setPhrases((prev) => {
      const next = [...prev];
      next[targetIdx] = {
        ...next[targetIdx],
        express: activeExpressionCode,
      };
      return next;
    });
    setCopiedType("code");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const playbackTimerRef = useRef<number[]>([]);
  const isPlayingRef = useRef(false);

  // Session Persistence & Restore
  useEffect(() => {
    try {
      const savedSession = sessionStorage.getItem("monika_piano_active_session");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && Array.isArray(parsed.phrases) && parsed.phrases.length > 0) {
          if (parsed.songName) setSongName(parsed.songName);
          if (parsed.songArtist) setSongArtist(parsed.songArtist);
          if (parsed.selectedSongSlug) setSelectedSongSlug(parsed.selectedSongSlug);
          if (parsed.fileName) setFileName(parsed.fileName);
          if (parsed.dialoguePrefix) setDialoguePrefix(parsed.dialoguePrefix);
          setPhrases(parsed.phrases);
          if (parsed.rawLyrics !== undefined) setRawLyrics(parsed.rawLyrics);
          if (parsed.preSongLines) setPreSongLines(parsed.preSongLines);
          if (parsed.perfectLines) setPerfectLines(parsed.perfectLines);
          if (parsed.almostLines) setAlmostLines(parsed.almostLines);
          if (parsed.escapeLines) setEscapeLines(parsed.escapeLines);
          if (parsed.enableChoiceMenu !== undefined) setEnableChoiceMenu(parsed.enableChoiceMenu);
          if (parsed.menuPrompt) setMenuPrompt(parsed.menuPrompt);
          if (parsed.menuChoices) setMenuChoices(parsed.menuChoices);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to restore previous piano maker session", e);
    }

    // Default fallback if no saved session
    const initialSong = MONIKA_CUSTOM_SONGS[0];
    if (initialSong) {
      loadCustomSong(initialSong);
    }
  }, []);

  // Save session state to prevent unexpected loss on HMR / reload
  useEffect(() => {
    if (phrases.length === 0) return;
    try {
      const sessionData = {
        songName,
        songArtist,
        selectedSongSlug,
        fileName,
        dialoguePrefix,
        phrases,
        rawLyrics,
        preSongLines,
        perfectLines,
        almostLines,
        escapeLines,
        enableChoiceMenu,
        menuPrompt,
        menuChoices,
      };
      sessionStorage.setItem("monika_piano_active_session", JSON.stringify(sessionData));
    } catch (e) {
      console.warn("Failed to persist piano maker session", e);
    }
  }, [
    songName,
    songArtist,
    selectedSongSlug,
    fileName,
    dialoguePrefix,
    phrases,
    rawLyrics,
    preSongLines,
    perfectLines,
    almostLines,
    escapeLines,
    enableChoiceMenu,
    menuPrompt,
    menuChoices,
  ]);

  // Normalized JSON fingerprint for a project (name + phrases), used to detect unsaved edits
  function buildSongJson(name: string, phrases: MonikaPhrase[]): string {
    const verseList = Array.from(
      new Set(phrases.map((p, idx) => (p.verse !== undefined ? idx : null)).filter((v): v is number => v !== null))
    ).sort((a, b) => a - b);
    return generateMonikaPianoJson({
      name,
      verse_list: verseList.length > 0 ? verseList : [0],
      pnm_list: phrases,
    });
  }

  function loadCustomSong(song: CustomPianoSongEntry) {
    stopPlayback();
    stopAllLiveModes();
    setSelectedSongSlug(song.slug);
    setSongName(song.name);
    setSongArtist(song.artist);
    setFileName(`${song.slug}.json`);

    const pnmList = song.songData.pnm_list || [];
    const formattedPhrases: MonikaPhrase[] = pnmList.map((p, idx) => {
      const rawDelays = (p as any).noteDelays || (p as any)._comment_note_delays_sec;
      const validDelays = Array.isArray(rawDelays) && rawDelays.length === p.notes.length
        ? rawDelays
        : p.notes.map((_, nIdx) => (nIdx === p.notes.length - 1 ? 0.65 : 0.32));

      return {
        id: p.id || `phrase-${idx}-${Date.now()}`,
        text: p.text || "",
        style: p.style || "monika_credits_text",
        notes: Array.isArray(p.notes) ? p.notes : [],
        noteDelays: validDelays,
        phraseDelay: (p as any).phraseDelay || (p as any)._comment_phrase_pause_sec || 0.85,
        express: p.express || "1eub",
        postexpress: p.postexpress || "1hua",
        vis_timeout: p.vis_timeout || 2.0,
        verse: p.verse !== undefined ? p.verse : undefined,
        posttext: p.posttext !== undefined ? p.posttext : true,
      };
    });

    setPhrases(formattedPhrases);
    setRawLyrics(formattedPhrases.map((p) => p.text).join("\n"));
    setParsedMidi(null);

    if (song.songData.win_label && song.songData.win_label.includes("_")) {
      const pfx = song.songData.win_label.split("_")[0];
      if (pfx) setDialoguePrefix(pfx);
    }

    if ((song as any).dialogueScript) {
      if ((song as any).dialogueScript.preLines) setPreSongLines((song as any).dialogueScript.preLines);
      if ((song as any).dialogueScript.perfectLines) setPerfectLines((song as any).dialogueScript.perfectLines);
      if ((song as any).dialogueScript.almostLines) setAlmostLines((song as any).dialogueScript.almostLines);
      if ((song as any).dialogueScript.escapeLines) setEscapeLines((song as any).dialogueScript.escapeLines);
      if ((song as any).dialogueScript.perfectMenuPrompt && (song as any).dialogueScript.perfectChoices) {
        setEnableChoiceMenu(true);
        setMenuPrompt((song as any).dialogueScript.perfectMenuPrompt);
        setMenuChoices((song as any).dialogueScript.perfectChoices);
      }
    }

    baselineJsonRef.current = buildSongJson(song.name, formattedPhrases);
  }

  function handleImportRawKeys(mode: "replace" | "append") {
    if (parsedRawKeysPreview.length === 0) return;
    stopPlayback();
    stopAllLiveModes();
    const parsedRes = parseMonikaSongInput(rawKeysInput, { defaultNoteDelay: rawKeysDefaultDelay });
    if (mode === "replace") {
      if (parsedRes.songName && parsedRes.songName !== "Custom Piano Song" && parsedRes.songName !== "Imported Song") {
        setSongName(parsedRes.songName);
      }
      if (parsedRes.songArtist && parsedRes.songArtist !== "Monika") {
        setSongArtist(parsedRes.songArtist);
      }
      setPhrases(parsedRawKeysPreview);
      setRawLyrics(parsedRawKeysPreview.map((p) => p.text).join("\n"));
      setParsedMidi(null);
      setActiveEditingPhraseIdx(0);
    } else {
      setPhrases((prev) => [...prev, ...parsedRawKeysPreview]);
      setRawLyrics((prev) => (prev ? prev + "\n" : "") + parsedRawKeysPreview.map((p) => p.text).join("\n"));
    }
    setIsRawKeysModalOpen(false);
    setRawKeysInput("");
  }

  function handleCreateEmptyProject() {
    stopPlayback();
    stopAllLiveModes();
    setSelectedSongSlug("empty-project");
    setSongName("New Piano Song");
    setSongArtist("You");
    setFileName("new_piano_song.json");
    setDialoguePrefix("jmcustom");

    const blankPhrases: MonikaPhrase[] = [
      {
        id: `phrase-0-${Date.now()}`,
        text: "Your first lyric line...",
        style: "monika_credits_text",
        notes: [],
        noteDelays: [],
        phraseDelay: 0.85,
        express: "1eub",
        postexpress: "1hua",
        vis_timeout: 2.0,
        posttext: true,
      },
    ];

    setPhrases(blankPhrases);
    setRawLyrics("Your first lyric line...");
    setParsedMidi(null);
    setActiveEditingPhraseIdx(0);

    setPreSongLines([
      { id: "pre-1", speaker: "m", expression: "1eua", text: "Ready to play a new song together?" }
    ]);
    setPerfectLines([
      { id: "pf-1", speaker: "m", expression: "1hua", text: "Incredible! That was a flawless performance!" },
      { id: "pf-2", speaker: "m", expression: "1eua", text: "I love making music with you." }
    ]);
    setAlmostLines([
      { id: "al-1", speaker: "m", expression: "1eub", text: "Great effort! We almost got through every note." }
    ]);
    setEscapeLines([
      { id: "es-1", speaker: "m", expression: "1ekc", text: "Don't worry, practice makes perfect! Let's try again anytime." }
    ]);
    setEnableChoiceMenu(false);

    baselineJsonRef.current = buildSongJson("New Piano Song", blankPhrases);
  }

  function stopAllLiveModes() {
    setIsRecordingLive(false);
    isRecordingLiveRef.current = false;
    lastRecordKeyTimeRef.current = null;
    setIsTimingMode(false);
    isTimingModeRef.current = false;
    lastTapTimeRef.current = null;
  }

  // Keyboard Play Handler
  const handlePlayKey = useCallback((k: MonikaPianoKey) => {
    pianoSynth.playKey(k, 0.4);
    setActiveNoteMidi(k.midi);
    setTimeout(() => setActiveNoteMidi(null), 250);

    if (isRecordingLiveRef.current) {
      const now = performance.now();
      let delayFromPrev = 0.32;
      if (lastRecordKeyTimeRef.current !== null) {
        delayFromPrev = Math.max(0.04, Number(((now - lastRecordKeyTimeRef.current) / 1000).toFixed(3)));
      }
      lastRecordKeyTimeRef.current = now;

      setPhrases((prev) => {
        const next = [...prev];
        if (next.length === 0) {
          next.push({
            id: `phrase-rec-0-${Date.now()}`,
            text: `Phrase 1`,
            style: "monika_credits_text",
            notes: [k.note],
            noteDelays: [0.5],
            phraseDelay: 0.85,
            express: "1eua",
            postexpress: "1eua",
            vis_timeout: 2.0,
            verse: 0,
            posttext: true,
          });
          return next;
        }

        const currentPhraseIdx = next.length - 1;
        const currentP = { ...next[currentPhraseIdx] };
        const updatedNotes = [...currentP.notes, k.note];
        const updatedDelays = [...(currentP.noteDelays || [])];

        if (updatedNotes.length > 1) {
          updatedDelays[updatedNotes.length - 2] = delayFromPrev;
        }
        updatedDelays[updatedNotes.length - 1] = 0.5;

        currentP.notes = updatedNotes;
        currentP.noteDelays = updatedDelays;
        next[currentPhraseIdx] = currentP;
        return next;
      });
    }
  }, []);

  const handleRecordNextPhrase = useCallback(() => {
    if (!isRecordingLiveRef.current) return;
    const now = performance.now();
    let phrasePause = 0.85;
    if (lastRecordKeyTimeRef.current !== null) {
      phrasePause = Math.max(0.15, Number(((now - lastRecordKeyTimeRef.current) / 1000).toFixed(3)));
    }
    lastRecordKeyTimeRef.current = null;

    setPhrases((prev) => {
      const next = [...prev];
      if (next.length > 0) {
        next[next.length - 1].phraseDelay = phrasePause;
      }
      const newIdx = next.length;
      next.push({
        id: `phrase-rec-${newIdx}-${Date.now()}`,
        text: `Phrase ${newIdx + 1}`,
        style: "monika_credits_text",
        notes: [],
        noteDelays: [],
        phraseDelay: 0.85,
        express: newIdx % 2 === 0 ? "1eub" : "1eua",
        postexpress: "1hua",
        vis_timeout: 2.0,
        verse: newIdx === 0 || newIdx % 4 === 0 ? newIdx : undefined,
        posttext: true,
      });
      return next;
    });
  }, []);

  const handleToggleRecordMode = () => {
    if (isRecordingLive) {
      setIsRecordingLive(false);
      isRecordingLiveRef.current = false;
      lastRecordKeyTimeRef.current = null;
    } else {
      stopPlayback();
      setIsTimingMode(false);
      isTimingModeRef.current = false;
      setIsRecordingLive(true);
      isRecordingLiveRef.current = true;
      lastRecordKeyTimeRef.current = null;
    }
  };

  // ── Ultra-Fast, Race-Condition Free Time Mode Engine ──────────────────
  const handleStartTimeMode = (startPhraseIdx = 0) => {
    stopPlayback();
    setIsRecordingLive(false);
    isRecordingLiveRef.current = false;
    timingPhraseIdxRef.current = startPhraseIdx;
    timingNoteIdxRef.current = 0;
    lastTapTimeRef.current = null;
    setTimingPhraseIdx(startPhraseIdx);
    setTimingNoteIdx(0);
    setIsTimingMode(true);
    isTimingModeRef.current = true;
  };

  const handleStopTimingMode = () => {
    setIsTimingMode(false);
    isTimingModeRef.current = false;
    lastTapTimeRef.current = null;
  };

  const handleTimeModeTap = useCallback(() => {
    const currentPhrases = phrasesRef.current;
    if (!currentPhrases || currentPhrases.length === 0) return;

    const currentPIdx = timingPhraseIdxRef.current;
    const currentNIdx = timingNoteIdxRef.current;

    const targetPhrase = currentPhrases[currentPIdx];
    if (!targetPhrase || !targetPhrase.notes || targetPhrase.notes.length === 0) {
      if (currentPIdx + 1 < currentPhrases.length) {
        timingPhraseIdxRef.current = currentPIdx + 1;
        timingNoteIdxRef.current = 0;
        setTimingPhraseIdx(currentPIdx + 1);
        setTimingNoteIdx(0);
      } else {
        handleStopTimingMode();
      }
      return;
    }

    // 1. Play audio for this note immediately via Web Audio API (zero audio thread lag)
    const currentNoteName = targetPhrase.notes[currentNIdx];
    const keyObj = getMonikaKeyByNoteName(currentNoteName);
    if (keyObj) {
      pianoSynth.playKey(keyObj, 0.35);
    }

    // 2. Measure delta from previous tap
    const now = performance.now();
    const hasPrevTap = lastTapTimeRef.current !== null;
    let deltaSec = 0.32;
    if (hasPrevTap) {
      deltaSec = Math.max(0.04, Number(((now - lastTapTimeRef.current!) / 1000).toFixed(3)));
    }
    lastTapTimeRef.current = now;

    // 3. Update delays in state
    if (hasPrevTap) {
      setPhrases((prev) => {
        const next = [...prev];
        if (currentNIdx > 0) {
          // Setting delay for note (nIdx - 1)
          const p = { ...next[currentPIdx] };
          const delays = [...(p.noteDelays || p.notes.map(() => 0.35))];
          delays[currentNIdx - 1] = deltaSec;
          p.noteDelays = delays;
          next[currentPIdx] = p;
        } else if (currentPIdx > 0) {
          // Setting phrase pause for previous phrase
          const prevP = { ...next[currentPIdx - 1] };
          prevP.phraseDelay = deltaSec;
          next[currentPIdx - 1] = prevP;
        }
        return next;
      });
    }

    // 4. Advance pointer synchronously in refs and state
    if (currentNIdx + 1 < targetPhrase.notes.length) {
      timingNoteIdxRef.current = currentNIdx + 1;
      setTimingNoteIdx(currentNIdx + 1);
    } else {
      if (currentPIdx + 1 < currentPhrases.length) {
        timingPhraseIdxRef.current = currentPIdx + 1;
        timingNoteIdxRef.current = 0;
        setTimingPhraseIdx(currentPIdx + 1);
        setTimingNoteIdx(0);
      } else {
        handleStopTimingMode();
      }
    }
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (isTimingMode) {
          handleTimeModeTap();
          return;
        }
        if (isRecordingLive) {
          handleRecordNextPhrase();
          return;
        }
      }

      const matchedKey = getMonikaKeyByChar(e.key.toLowerCase());
      if (matchedKey) {
        e.preventDefault();
        handlePlayKey(matchedKey);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTimingMode, isRecordingLive, handleTimeModeTap, handlePlayKey]);

  // File Upload (JSON, Text, MIDI)
  const processUploadedFile = async (file: File) => {
    stopPlayback();
    stopAllLiveModes();
    setFileName(file.name);

    // 1. Try reading as Text / JSON first (for .json, .txt, or text-based files)
    if (file.name.endsWith(".json") || file.name.endsWith(".txt")) {
      try {
        const rawText = await file.text();
        const parsedResult = parseMonikaSongInput(rawText, { defaultNoteDelay: 0.32 });
        if (parsedResult.success && parsedResult.phrases.length > 0) {
          const title = parsedResult.songName && parsedResult.songName !== "Custom Piano Song" && parsedResult.songName !== "Imported Song"
            ? parsedResult.songName
            : file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
          setSongName(title.charAt(0).toUpperCase() + title.slice(1));
          if (parsedResult.songArtist) setSongArtist(parsedResult.songArtist);
          setPhrases(parsedResult.phrases);
          setRawLyrics(parsedResult.phrases.map((p) => p.text || "").join("\n"));
          setParsedMidi(null);
          baselineJsonRef.current = buildSongJson(title, parsedResult.phrases);
          return;
        }
      } catch (err) {
        console.error("Failed to parse text/JSON file", err);
      }
    }

    // 2. Try parsing as MIDI
    try {
      const buffer = await file.arrayBuffer();
      const isMidiHeader = buffer.byteLength >= 4 &&
        new Uint8Array(buffer, 0, 4).every((byte, idx) => byte === [0x4d, 0x54, 0x68, 0x64][idx]);

      if (isMidiHeader || file.name.endsWith(".mid") || file.name.endsWith(".midi")) {
        const parsed = parseMidiFile(buffer);
        setParsedMidi(parsed);
        setSelectedTrackIndices([parsed.melodyTrackIndex]);

        const inferredTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setSongName(inferredTitle.charAt(0).toUpperCase() + inferredTitle.slice(1));

        const lyricsToUse = parsed.lyricsFound.length > 0 ? parsed.lyricsFound.join("\n") : rawLyrics;
        if (parsed.lyricsFound.length > 0) {
          setRawLyrics(lyricsToUse);
        }

        convertSelectedTracksToPhrases(parsed, [parsed.melodyTrackIndex], lyricsToUse, transposeSemitones, preferHigherOctave);
        return;
      }
    } catch (err) {
      console.error("Failed to parse MIDI file", err);
    }

    // 3. Fallback: try parsing buffer as text/json
    try {
      const rawText = await file.text();
      const parsedResult = parseMonikaSongInput(rawText);
      if (parsedResult.success && parsedResult.phrases.length > 0) {
        const title = parsedResult.songName && parsedResult.songName !== "Custom Piano Song" && parsedResult.songName !== "Imported Song"
          ? parsedResult.songName
          : file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setSongName(title.charAt(0).toUpperCase() + title.slice(1));
        if (parsedResult.songArtist) setSongArtist(parsedResult.songArtist);
        setPhrases(parsedResult.phrases);
        setRawLyrics(parsedResult.phrases.map((p) => p.text || "").join("\n"));
        setParsedMidi(null);
        baselineJsonRef.current = buildSongJson(title, parsedResult.phrases);
      }
    } catch (err) {
      console.error("Failed fallback text parse", err);
    }
  };

  function convertSelectedTracksToPhrases(
    midi: ParsedMidiFile,
    trackIndices: number[],
    lyricsText: string,
    transpose: number,
    preferUpper: boolean
  ) {
    const combinedNotes: ParsedMidiNote[] = [];
    trackIndices.forEach((idx) => {
      const track = midi.tracks[idx];
      if (track && track.notes) {
        combinedNotes.push(...track.notes);
      }
    });

    combinedNotes.sort((a, b) => a.startTimeSec - b.startTimeSec);

    const convertedNotes = combinedNotes.map((n) => {
      const pitchVal = n.midi ?? n.pitch ?? 60;
      const foldedMidi = foldPitchToMonikaRange(pitchVal, transpose, preferUpper);
      const keyObj = getMonikaKeyByMidi(foldedMidi);
      return {
        ...n,
        monikaNote: keyObj ? keyObj.note : "D5",
        monikaMidi: foldedMidi,
      };
    });

    const lines = lyricsText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l !== "Your first lyric line...");
    const hasCustomLyrics = lines.length > 1;
    const totalNotes = convertedNotes.length;

    if (totalNotes === 0) {
      setPhrases([
        {
          id: `phrase-0-${Date.now()}`,
          text: "No notes found in selected track(s)",
          style: "monika_credits_text",
          notes: ["D5"],
          noteDelays: [0.35],
          phraseDelay: 0.85,
          express: "1eub",
          postexpress: "1hua",
          vis_timeout: 2.0,
          verse: 0,
          posttext: true,
        },
      ]);
      return;
    }

    const newPhrases: MonikaPhrase[] = [];

    if (hasCustomLyrics) {
      const lyricCount = lines.length;
      const notesPerLine = Math.max(1, Math.floor(totalNotes / lyricCount));
      const totalChunks = lyricCount;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * notesPerLine;
        const end = i === totalChunks - 1 ? totalNotes : (i + 1) * notesPerLine;
        const slice = convertedNotes.slice(start, end);
        const noteNames = slice.map((n) => n.monikaNote).filter(Boolean) as string[];

        const noteDelays: number[] = [];
        for (let nIdx = 0; nIdx < slice.length; nIdx++) {
          if (nIdx < slice.length - 1) {
            const delta = slice[nIdx + 1].startTimeSec - slice[nIdx].startTimeSec;
            noteDelays.push(Math.max(0.08, Number(delta.toFixed(3))));
          } else {
            noteDelays.push(Math.max(0.2, Number((slice[nIdx].durationSec || 0.4).toFixed(3))));
          }
        }

        let phraseDelay = 0.85;
        if (i < totalChunks - 1 && end < totalNotes) {
          const nextStart = convertedNotes[end].startTimeSec;
          const currentEnd = slice[slice.length - 1].endTimeSec || (slice[slice.length - 1].startTimeSec + 0.3);
          phraseDelay = Math.max(0.3, Math.min(3.0, Number((nextStart - currentEnd).toFixed(3))));
        }

        newPhrases.push({
          id: `phrase-${i}-${Date.now()}`,
          text: lines[i] || `Phrase ${i + 1}`,
          style: "monika_credits_text",
          notes: noteNames.length > 0 ? noteNames : ["D5"],
          noteDelays: noteDelays.length > 0 ? noteDelays : [0.35],
          phraseDelay,
          express: i % 2 === 0 ? "1eub" : "1eua",
          postexpress: "1hua",
          vis_timeout: 2.0,
          verse: i === 0 || i % 4 === 0 ? i : undefined,
          posttext: true,
        });
      }
    } else {
      // Smart musical rest & note-count chunking for instrumentals / raw MIDI
      let currentSlice: typeof convertedNotes = [];
      let phraseIdx = 0;

      for (let i = 0; i < totalNotes; i++) {
        currentSlice.push(convertedNotes[i]);
        const isLast = i === totalNotes - 1;
        const nextNote = !isLast ? convertedNotes[i + 1] : null;
        const restGap = nextNote
          ? nextNote.startTimeSec - (convertedNotes[i].endTimeSec || convertedNotes[i].startTimeSec)
          : 0;
        const reachedRestGap = restGap >= 0.75;
        const reachedMaxNotes = currentSlice.length >= 10;

        if (isLast || reachedRestGap || reachedMaxNotes) {
          const noteNames = currentSlice.map((n) => n.monikaNote).filter(Boolean) as string[];
          const noteDelays: number[] = [];
          for (let nIdx = 0; nIdx < currentSlice.length; nIdx++) {
            if (nIdx < currentSlice.length - 1) {
              const delta = currentSlice[nIdx + 1].startTimeSec - currentSlice[nIdx].startTimeSec;
              noteDelays.push(Math.max(0.08, Number(delta.toFixed(3))));
            } else {
              noteDelays.push(Math.max(0.2, Number((currentSlice[nIdx].durationSec || 0.4).toFixed(3))));
            }
          }

          let phraseDelay = 0.85;
          if (nextNote) {
            phraseDelay = Math.max(
              0.3,
              Math.min(
                3.0,
                Number((nextNote.startTimeSec - currentSlice[currentSlice.length - 1].startTimeSec).toFixed(3))
              )
            );
          }

          newPhrases.push({
            id: `phrase-${phraseIdx}-${Date.now()}`,
            text: `Phrase ${phraseIdx + 1}`,
            style: "monika_credits_text",
            notes: noteNames.length > 0 ? noteNames : ["D5"],
            noteDelays: noteDelays.length > 0 ? noteDelays : [0.35],
            phraseDelay,
            express: phraseIdx % 2 === 0 ? "1eub" : "1eua",
            postexpress: "1hua",
            vis_timeout: 2.0,
            verse: phraseIdx === 0 || phraseIdx % 4 === 0 ? phraseIdx : undefined,
            posttext: true,
          });

          currentSlice = [];
          phraseIdx++;
        }
      }
    }

    setPhrases(newPhrases);
  }

  const handleTransposeChange = (delta: number) => {
    const nextTranspose = transposeSemitones + delta;
    setTransposeSemitones(nextTranspose);
    if (parsedMidi) {
      convertSelectedTracksToPhrases(parsedMidi, selectedTrackIndices, rawLyrics, nextTranspose, preferHigherOctave);
    } else {
      setPhrases((prev) =>
        prev.map((phrase) => ({
          ...phrase,
          notes: phrase.notes.map((noteName) => {
            const k = getMonikaKeyByNoteName(noteName);
            if (!k) return noteName;
            const foldedMidi = foldPitchToMonikaRange(k.midi, delta, preferHigherOctave);
            const keyObj = getMonikaKeyByMidi(foldedMidi);
            return keyObj ? keyObj.note : noteName;
          }),
        }))
      );
    }
  };

  const handlePreferHigherOctaveToggle = (checked: boolean) => {
    setPreferHigherOctave(checked);
    if (parsedMidi) {
      convertSelectedTracksToPhrases(parsedMidi, selectedTrackIndices, rawLyrics, transposeSemitones, checked);
    }
  };

  const handleRealignLyrics = () => {
    if (parsedMidi) {
      convertSelectedTracksToPhrases(parsedMidi, selectedTrackIndices, rawLyrics, transposeSemitones, preferHigherOctave);
    } else {
      const allNotes = phrases.flatMap((p) => p.notes);
      const allDelays = phrases.flatMap((p) => p.noteDelays || [0.35]);
      const lines = rawLyrics.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      const lyricCount = Math.max(1, lines.length);
      const notesPerLine = Math.max(1, Math.floor(allNotes.length / lyricCount));

      const updated: MonikaPhrase[] = [];
      for (let i = 0; i < lyricCount; i++) {
        const start = i * notesPerLine;
        const end = i === lyricCount - 1 ? allNotes.length : (i + 1) * notesPerLine;
        const slice = allNotes.slice(start, end);
        const sliceDelays = allDelays.slice(start, end);
        updated.push({
          id: `phrase-${i}-${Date.now()}`,
          text: lines[i] || `Phrase ${i + 1}`,
          style: "monika_credits_text",
          notes: slice.length > 0 ? slice : ["D5"],
          noteDelays: sliceDelays.length > 0 ? sliceDelays : slice.map(() => 0.35),
          phraseDelay: 0.6,
          express: i % 2 === 0 ? "1eub" : "1eua",
          postexpress: "1eua",
          vis_timeout: 2.0,
          verse: i === 0 ? 0 : undefined,
          posttext: true,
        });
      }
      setPhrases(updated);
    }
  };

  // Stable Phrase Event Callbacks
  const handlePhraseTextChange = useCallback((pIdx: number, text: string) => {
    setPhrases((prev) => {
      const next = [...prev];
      next[pIdx] = { ...next[pIdx], text };
      return next;
    });
  }, []);

  const handlePhraseExpressionChange = useCallback((pIdx: number, express: string) => {
    setPhrases((prev) => {
      const next = [...prev];
      next[pIdx] = { ...next[pIdx], express };
      return next;
    });
  }, []);

  const handleToggleVerse = useCallback((pIdx: number) => {
    setPhrases((prev) => {
      const next = [...prev];
      next[pIdx] = {
        ...next[pIdx],
        verse: next[pIdx].verse !== undefined ? undefined : pIdx,
      };
      return next;
    });
  }, []);

  const handleMovePhraseUp = useCallback((pIdx: number) => {
    if (pIdx === 0) return;
    setPhrases((prev) => {
      const next = [...prev];
      const temp = next[pIdx];
      next[pIdx] = next[pIdx - 1];
      next[pIdx - 1] = temp;
      return next;
    });
  }, []);

  const handleMovePhraseDown = useCallback((pIdx: number) => {
    setPhrases((prev) => {
      if (pIdx === prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[pIdx];
      next[pIdx] = next[pIdx + 1];
      next[pIdx + 1] = temp;
      return next;
    });
  }, []);

  const handleDuplicatePhrase = useCallback((pIdx: number) => {
    setPhrases((prev) => {
      const next = [...prev];
      const target = next[pIdx];
      const copy: MonikaPhrase = {
        ...target,
        id: `phrase-${Date.now()}`,
        text: `${target.text} (Copy)`,
        notes: [...target.notes],
        noteDelays: [...(target.noteDelays || target.notes.map(() => 0.35))],
      };
      next.splice(pIdx + 1, 0, copy);
      return next;
    });
  }, []);

  const handleDeletePhrase = useCallback((pIdx: number) => {
    setPhrases((prev) => prev.filter((_, idx) => idx !== pIdx));
  }, []);

  const handleAddPhrase = () => {
    const newIdx = phrases.length;
    setPhrases((prev) => [
      ...prev,
      {
        id: `phrase-${newIdx}-${Date.now()}`,
        text: `Phrase ${newIdx + 1}`,
        style: "monika_credits_text",
        notes: ["D5", "E5", "G5"],
        noteDelays: [0.35, 0.35, 0.65],
        phraseDelay: 0.85,
        express: activeExpressionCode || "1eub",
        postexpress: "1hua",
        vis_timeout: 2.0,
        verse: newIdx === 0 ? 0 : undefined,
        posttext: true,
      },
    ]);
  };

  const handleAddNoteToPhrase = useCallback((pIdx: number, note: string) => {
    setPhrases((prev) => {
      const next = [...prev];
      const p = { ...next[pIdx] };
      p.notes = [...p.notes, note];
      p.noteDelays = [...(p.noteDelays || p.notes.map(() => 0.35)), 0.35];
      next[pIdx] = p;
      return next;
    });
  }, []);

  const handleRemoveNoteFromPhrase = useCallback((pIdx: number, nIdx: number) => {
    setPhrases((prev) => {
      const next = [...prev];
      const p = { ...next[pIdx] };
      p.notes = p.notes.filter((_, idx) => idx !== nIdx);
      p.noteDelays = (p.noteDelays || []).filter((_, idx) => idx !== nIdx);
      next[pIdx] = p;
      return next;
    });
  }, []);

  const handleUpdateNotePitch = useCallback((pIdx: number, nIdx: number, newPitch: string) => {
    setPhrases((prev) => {
      const next = [...prev];
      const p = { ...next[pIdx] };
      const updatedNotes = [...p.notes];
      updatedNotes[nIdx] = newPitch;
      p.notes = updatedNotes;
      next[pIdx] = p;
      return next;
    });
  }, []);

  const handleNoteDelayChange = useCallback((phraseIdx: number, noteIdx: number, newDelaySec: number) => {
    setPhrases((prev) => {
      const next = [...prev];
      if (!next[phraseIdx]) return prev;
      const p = { ...next[phraseIdx] };
      const delays = [...(p.noteDelays || p.notes.map(() => 0.35))];
      delays[noteIdx] = Math.max(0.05, Number(newDelaySec.toFixed(3)));
      p.noteDelays = delays;
      next[phraseIdx] = p;
      return next;
    });
  }, []);

  const handleSetAllPhraseDelays = useCallback((pIdx: number, delaySec: number) => {
    setPhrases((prev) => {
      const next = [...prev];
      const p = { ...next[pIdx] };
      p.noteDelays = p.notes.map(() => delaySec);
      next[pIdx] = p;
      return next;
    });
  }, []);

  // Lazy & Memoized Song Calculations
  const currentSong: MonikaPianoSong = useMemo(() => {
    const verseList = Array.from(
      new Set(
        phrases
          .map((p, idx) => (p.verse !== undefined ? idx : null))
          .filter((v): v is number => v !== null)
      )
    ).sort((a, b) => a - b);

    return {
      name: songName,
      verse_list: verseList.length > 0 ? verseList : [0],
      pnm_list: phrases,
    };
  }, [songName, phrases]);

  const standardJsonOutput = useMemo(() => (isExportModalOpen ? generateStandardMonikaPianoJson(currentSong) : ""), [currentSong, isExportModalOpen]);
  const compactJsonOutput = useMemo(() => (isExportModalOpen ? generateCompactMonikaPianoJson(currentSong) : ""), [currentSong, isExportModalOpen]);
  const keysTextOutput = useMemo(() => (isExportModalOpen ? generateLyricsKeysText(currentSong) : ""), [currentSong, isExportModalOpen]);
  const validationResult = useMemo(() => (isExportModalOpen ? validateMonikaPianoJson(standardJsonOutput || generateStandardMonikaPianoJson(currentSong)) : { valid: true, errors: [] }), [currentSong, isExportModalOpen, standardJsonOutput]);
  const delayAnalysis = useMemo(() => analyzeSongDelays(currentSong), [currentSong]);

  // Accordion: which code block is expanded (null = all collapsed)
  const [openBlock, setOpenBlock] = React.useState<"standard" | "compact" | "keys" | "rpy" | "ai" | null>(null);
  React.useEffect(() => { if (isExportModalOpen) setOpenBlock(null); }, [isExportModalOpen]);

  const totalNotesCount = useMemo(() => {
    return phrases.reduce((acc, p) => acc + (p.notes?.length || 0), 0);
  }, [phrases]);
  const postpianoConfig: PostpianoScriptConfig = useMemo(() => ({
    prefix: dialoguePrefix,
    songSlug: songName.toLowerCase().replace(/[^a-z0-9_]/g, ""),
    preLines: preSongLines,
    perfectLines: perfectLines,
    almostLines: almostLines,
    escapeLines: escapeLines,
    perfectMenuPrompt: enableChoiceMenu ? menuPrompt : undefined,
    perfectChoices: enableChoiceMenu ? menuChoices : undefined,
    includeCommonFallbacks,
  }), [dialoguePrefix, songName, preSongLines, perfectLines, almostLines, escapeLines, enableChoiceMenu, menuPrompt, menuChoices, includeCommonFallbacks]);

  const postpianoRpyOutput = useMemo(() => (activeTab === "dialogue" || isExportModalOpen ? generatePostpianoRpy(postpianoConfig) : ""), [postpianoConfig, activeTab, isExportModalOpen]);

  // Audio Playback
  function stopPlayback() {
    pianoSynth.stopAll();
    playbackTimerRef.current.forEach((t) => clearTimeout(t));
    playbackTimerRef.current = [];
    isPlayingRef.current = false;
    setIsPlaying(false);
    setActivePhraseIndex(null);
    setActiveNoteMidi(null);
  }

  function playFullSong(phrasesToPlay?: MonikaPhrase[]) {
    stopPlayback();
    setIsPlaying(true);
    isPlayingRef.current = true;

    const list = phrasesToPlay || phrases;
    let accumulatedTimeMs = 50;

    list.forEach((phrase, pIdx) => {
      const phraseStartTime = accumulatedTimeMs;
      const startTimer = window.setTimeout(() => {
        if (isPlayingRef.current) {
          setActivePhraseIndex(pIdx);
        }
      }, phraseStartTime);
      playbackTimerRef.current.push(startTimer);

      let currentNoteOffsetMs = 0;
      const delays = phrase.noteDelays || phrase.notes.map(() => 0.35);

      phrase.notes.forEach((noteName, nIdx) => {
        const noteFireTime = phraseStartTime + currentNoteOffsetMs;
        const keyObj = getMonikaKeyByNoteName(noteName);

        if (keyObj) {
          const noteTimer = window.setTimeout(() => {
            if (isPlayingRef.current) {
              pianoSynth.playKey(keyObj, 0.45);
              setActiveNoteMidi(keyObj.midi);
            }
          }, noteFireTime);
          playbackTimerRef.current.push(noteTimer);
        }

        const noteDelaySec = (delays[nIdx] !== undefined ? delays[nIdx] : 0.35) / playbackSpeed;
        currentNoteOffsetMs += noteDelaySec * 1000;
      });

      const phrasePauseSec = (phrase.phraseDelay !== undefined ? phrase.phraseDelay : 0.85) / playbackSpeed;
      accumulatedTimeMs += currentNoteOffsetMs + phrasePauseSec * 1000;
    });

    const endTimer = window.setTimeout(() => {
      stopPlayback();
    }, accumulatedTimeMs + 400);
    playbackTimerRef.current.push(endTimer);
  }

  const playSinglePhrase = useCallback((pIdx: number) => {
    const target = phrases[pIdx];
    if (target) {
      playFullSong([target]);
    }
  }, [phrases]);

  // AI Shorthand Import / Export
  const handleCopyAiPrompt = () => {
    const isTitleExplicitlyTyped = aiPromptTitle.trim().length > 0;
    const titleToUse = aiPromptTitle.trim() || (selectedSongSlug === "empty-project" ? "" : songName);
    const artistToUse = aiPromptArtist.trim() || (isTitleExplicitlyTyped ? "" : selectedSongSlug === "empty-project" ? "" : songArtist);
    const lyricsToUse = aiPromptLyrics.trim() || (aiPromptMode === "dialogue_only" ? rawLyrics : "");
    const prompt = generateExternalAiPrompt(
      titleToUse,
      lyricsToUse,
      {
        tone: aiPromptTone,
        difficulty: aiPromptDifficulty,
        mode: aiPromptMode,
        artist: artistToUse,
        prefix: dialoguePrefix,
      }
    );
    navigator.clipboard.writeText(prompt);
    setAiCopied(true);
    setTimeout(() => setAiCopied(false), 3000);
  };

  const handleApplyAiShorthand = () => {
    if (!aiShorthandInput.trim()) {
      setAiParseStatus("⚠️ Please paste some AI Shorthand or JSON code first!");
      return;
    }
    const result = parseAiShorthandCode(aiShorthandInput);
    if (!result.success) {
      setAiParseStatus(`❌ Parse Error: ${result.warnings.join(", ") || "Invalid shorthand format"}`);
      return;
    }

    if (result.songName) setSongName(result.songName);
    if (result.artist) setSongArtist(result.artist);
    // Preserve user's MAS prefix, only initializing if currently empty
    if (result.dialoguePrefix && !dialoguePrefix.trim()) {
      setDialoguePrefix(result.dialoguePrefix);
    }

    if (result.phrases && result.phrases.length > 0) {
      setPhrases(result.phrases);
      setRawLyrics(result.phrases.map((p) => p.text).join("\n"));
    }

    if (result.preLines && result.preLines.length > 0) setPreSongLines(result.preLines);
    if (result.perfectLines && result.perfectLines.length > 0) setPerfectLines(result.perfectLines);
    if (result.almostLines && result.almostLines.length > 0) setAlmostLines(result.almostLines);
    if (result.escapeLines && result.escapeLines.length > 0) setEscapeLines(result.escapeLines);
    if (result.menuChoices && result.menuChoices.length > 0) {
      setEnableChoiceMenu(true);
      setMenuPrompt(result.menuPrompt || "Did you enjoy playing it?");
      setMenuChoices(result.menuChoices);
    }

    setAiParseStatus(`✨ Successfully loaded "${result.songName || songName}" (${result.artist || songArtist}) with ${result.phrases.length} phrases and dialogue!`);
    setIsAiModalOpen(false);
  };

  const handleApplyDialogueOnly = () => {
    if (!aiShorthandInput.trim()) {
      setAiParseStatus("⚠️ Please paste some AI Shorthand or JSON code first!");
      return;
    }
    const result = parseAiShorthandCode(aiShorthandInput);
    const hasDialogueParsed =
      (result.preLines && result.preLines.length > 0) ||
      (result.perfectLines && result.perfectLines.length > 0) ||
      (result.almostLines && result.almostLines.length > 0) ||
      (result.escapeLines && result.escapeLines.length > 0) ||
      (result.menuChoices && result.menuChoices.length > 0);

    if (!result.success && !hasDialogueParsed) {
      setAiParseStatus(`❌ Parse Error: ${result.warnings.join(", ") || "No dialogue found in shorthand"}`);
      return;
    }

    if (result.songName) setSongName(result.songName);
    if (result.artist) setSongArtist(result.artist);
    // Preserve user's MAS prefix, only initializing if currently empty
    if (result.dialoguePrefix && !dialoguePrefix.trim()) {
      setDialoguePrefix(result.dialoguePrefix);
    }

    if (result.preLines && result.preLines.length > 0) setPreSongLines(result.preLines);
    if (result.perfectLines && result.perfectLines.length > 0) setPerfectLines(result.perfectLines);
    if (result.almostLines && result.almostLines.length > 0) setAlmostLines(result.almostLines);
    if (result.escapeLines && result.escapeLines.length > 0) setEscapeLines(result.escapeLines);
    if (result.menuChoices && result.menuChoices.length > 0) {
      setEnableChoiceMenu(true);
      setMenuPrompt(result.menuPrompt || "Did you enjoy playing it with me, [player]?");
      setMenuChoices(result.menuChoices);
    }

    setAiParseStatus(`✨ Successfully loaded dialogue script for "${result.songName || songName}" (${result.artist || songArtist}) without altering piano notes!`);
    setIsAiModalOpen(false);
    setActiveTab("dialogue");
  };

  // Dialogue Line Handlers
  const handleAddDialogueLine = (setter: React.Dispatch<React.SetStateAction<PostpianoDialogueLine[]>>, defaultExpr = "1eua") => {
    setter((prev) => [
      ...prev,
      { id: `line-${Date.now()}-${prev.length}`, speaker: "m", expression: defaultExpr, text: "" },
    ]);
  };

  const handleUpdateDialogueLine = (
    setter: React.Dispatch<React.SetStateAction<PostpianoDialogueLine[]>>,
    idx: number,
    field: "expression" | "text",
    val: string
  ) => {
    setter((prev) => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = { ...next[idx], [field]: val };
      }
      return next;
    });
  };

  const handleDeleteDialogueLine = (setter: React.Dispatch<React.SetStateAction<PostpianoDialogueLine[]>>, idx: number) => {
    setter((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadRpyc = () => {
    const a = document.createElement("a");
    a.href = "/downloads/custom_dialogue_v1.rpyc";
    a.download = "custom_dialogue_v1.rpyc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Opens native Windows save dialog and writes content to the chosen path.
  const handleSaveFile = async (
    content: string,
    suggestedName: string,
    filterName: string,
    filterExt: string
  ): Promise<boolean> => {
    try {
      const filePath = await saveFileDialog({
        title: "Save File",
        defaultPath: suggestedName,
        filters: [{ name: filterName, extensions: [filterExt] }],
      });
      if (!filePath) return false;
      await writeTextFile(filePath, content);
      return true;
    } catch (err) {
      console.error("Save failed", err);
      return false;
    }
  };

  // Saves the current song as a Standard JSON via native save dialog.
  const handleSaveJsonDirect = async () => {
    const safeName =
      (songName || "monika_song").toLowerCase().replace(/\s+/g, "_") + ".json";
    await handleSaveFile(
      generateStandardMonikaPianoJson(currentSong),
      safeName,
      "Piano Studio Standard JSON",
      "json"
    );
  };

  // Wraps processUploadedFile with a save-first check when active data exists.
  const handleFileUpload = (file: File) => {
    const hasWorkingData =
      phrases.length > 1 ||
      phrases.some((p) => p.notes.length > 0) ||
      hasUnsavedChanges();
    if (hasWorkingData) {
      setPendingProjectSwitch({ kind: "file", file });
    } else {
      processUploadedFile(file);
    }
  };

  const hasUnsavedChanges = () => buildSongJson(songName, phrases) !== baselineJsonRef.current;

  const handleRequestClose = async () => {
    const hasWorkingData = phrases.length > 1 || phrases.some((p) => p.notes.length > 0) || hasUnsavedChanges();
    if (hasWorkingData) {
      setPendingProjectSwitch({ kind: "close" });
    } else {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    }
  };

  const runProjectSwitch = async () => {
    if (!pendingProjectSwitch) return;
    if (pendingProjectSwitch.kind === "new") {
      handleCreateEmptyProject();
      setActiveTab("piano");
    } else if (pendingProjectSwitch.kind === "file") {
      processUploadedFile(pendingProjectSwitch.file);
    } else if (pendingProjectSwitch.kind === "close") {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } else {
      loadCustomSong(pendingProjectSwitch.song);
      setActiveTab("piano");
    }
    setPendingProjectSwitch(null);
  };

  const requestProjectSwitch = (next: { kind: "new" } | { kind: "load"; song: CustomPianoSongEntry }) => {
    const hasWorkingData = phrases.length > 1 || phrases.some((p) => p.notes.length > 0) || hasUnsavedChanges();
    if (hasWorkingData) {
      setPendingProjectSwitch(next);
    } else if (next.kind === "new") {
      handleCreateEmptyProject();
      setActiveTab("piano");
    } else {
      loadCustomSong(next.song);
      setActiveTab("piano");
    }
  };

  const STUDIO_TABS = [
    { id: "piano", label: "Piano Studio & DAW", icon: "🎹" },
    { id: "expressions", label: "Expressions Studio", icon: "🌸" },
  ];

  const handleOpenOnline = async () => {
    try {
      await openUrl("https://maruchansquigle.vercel.app/monika-piano-maker");
    } catch {
      window.open("https://maruchansquigle.vercel.app/monika-piano-maker", "_blank");
    }
  };

  const appletActions = (
    <div className="mpm-top-ribbon-actions">
      <button
        className="mpm-action-btn"
        onClick={() => requestProjectSwitch({ kind: "new" })}
        title="Start a blank new piano project"
        style={{ color: "#34d399", borderColor: "rgba(52, 211, 153, 0.4)", background: "rgba(16, 185, 129, 0.15)" }}
      >
        ✨ New Project
      </button>
      <button
        className="mpm-action-btn"
        onClick={handleOpenOnline}
        title="Open Monika Piano Studio on web"
        style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)", background: "rgba(2, 132, 199, 0.18)" }}
      >
        🌐 Open Applet Online
      </button>
      <button
        className="mpm-action-btn primary"
        onClick={handleSaveJsonDirect}
        title="Save project as JSON using native Windows dialog"
      >
        💾 Save JSON
      </button>
    </div>
  );

  const appletViewModes = (
    <GlidingHoverGroup
      items={STUDIO_TABS}
      activeId={activeTab}
      onSelect={(id) => setActiveTab(id as AppTab)}
      variant="ribbon"
      layoutId="mpm-main-ribbon-tabs"
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#0b0d14" }}>
      <TitleBar title="Monika Piano Maker" iconSrc="/app-icon.png" onClose={handleRequestClose} />
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
      <>
      {/* TAB 1: Piano & DAW Workstation (Full Screen, Non-Scrollable Layout) */}
      {activeTab === "piano" && (
        <StudioAppletShell
          title={appletViewModes}
          actionsSlot={appletActions}
          previewRatio="380px"
          controlsRatio="1fr"
          fullHeight={true}
          previewSlot={
            <>
              {/* Metadata & Dropzone */}
              <div className="mpm-card" style={{ padding: "0.85rem 1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr", gap: "0.4rem", marginBottom: "0.6rem" }}>
                  <div>
                    <label style={{ fontSize: "0.68rem", color: "#94a3b8", display: "block", fontWeight: 600, marginBottom: "0.15rem" }}>Song Title:</label>
                    <input
                      type="text"
                      className="mpm-input"
                      style={{ width: "100%", padding: "0.35rem 0.5rem", fontSize: "0.8rem", boxSizing: "border-box" }}
                      value={songName}
                      onChange={(e) => setSongName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.68rem", color: "#94a3b8", display: "block", fontWeight: 600, marginBottom: "0.15rem" }}>Artist:</label>
                    <input
                      type="text"
                      className="mpm-input"
                      style={{ width: "100%", padding: "0.35rem 0.5rem", fontSize: "0.8rem", boxSizing: "border-box" }}
                      value={songArtist}
                      onChange={(e) => setSongArtist(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.68rem", color: "#94a3b8", display: "block", fontWeight: 600, marginBottom: "0.15rem" }}>MAS Prefix:</label>
                    <input
                      type="text"
                      className="mpm-input"
                      style={{ width: "100%", padding: "0.35rem 0.5rem", fontSize: "0.8rem", boxSizing: "border-box" }}
                      value={dialoguePrefix}
                      onChange={(e) => setDialoguePrefix(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  className="mpm-dropzone"
                  style={{ padding: "0.55rem 0.75rem" }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".mid,.midi,.json,.txt";
                    input.onchange = (e) => {
                      const f = (e.target as HTMLInputElement).files?.[0];
                      if (f) handleFileUpload(f);
                    };
                    input.click();
                  }}
                >
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#cbd5e1" }}>
                    📂 Drop <code>.mid</code> / <code>.json</code> or Click to Browse
                  </span>
                  {fileName && <span style={{ fontSize: "0.72rem", color: "#38bdf8", display: "block", marginTop: "0.15rem" }}>📄 {fileName}</span>}
                  <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block", marginTop: "0.2rem" }}>
                    💡 Tip: Loading a file replaces active notes. Save as Piano Studio Standard JSON first to keep your work.
                  </span>
                </div>

                {/* MIDI Multi-Track Selector */}
                {parsedMidi && parsedMidi.tracks.length > 0 && (
                  <div style={{ marginTop: "0.5rem", background: "rgba(15, 23, 42, 0.75)", padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: 700 }}>
                        🎵 MIDI Tracks ({parsedMidi.tracks.length}):
                      </span>
                      <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                        BPM: {parsedMidi.initialBpm || 120}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: "120px", overflowY: "auto" }}>
                      {parsedMidi.tracks.map((t, idx) => {
                        const isSel = selectedTrackIndices.includes(idx);
                        return (
                          <label
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-start",
                              gap: "0.45rem",
                              fontSize: "0.72rem",
                              color: isSel ? "#34d399" : "#cbd5e1",
                              background: isSel ? "rgba(16, 185, 129, 0.12)" : "rgba(30, 41, 59, 0.5)",
                              padding: "0.25rem 0.45rem",
                              borderRadius: "4px",
                              border: isSel ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid transparent",
                              cursor: "pointer",
                              textAlign: "left",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSel}
                              style={{ margin: 0, padding: 0, flexShrink: 0, accentColor: "#10b981", width: "13px", height: "13px" }}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selectedTrackIndices, idx]
                                  : selectedTrackIndices.filter((i) => i !== idx);
                                const finalTracks = next.length > 0 ? next : [idx];
                                setSelectedTrackIndices(finalTracks);
                                convertSelectedTracksToPhrases(parsedMidi, finalTracks, rawLyrics, transposeSemitones, preferHigherOctave);
                              }}
                            />
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0, textAlign: "left" }}>
                              <strong>{t.name || `Track ${idx + 1}`}</strong> ({t.instrumentName}) — {t.totalNotes} notes
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: "0.45rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      <button
                        type="button"
                        className="mpm-action-btn primary"
                        style={{ width: "100%", justifyContent: "center", fontSize: "0.75rem", padding: "0.35rem 0.6rem", fontWeight: 700 }}
                        onClick={() => {
                          convertSelectedTracksToPhrases(parsedMidi, selectedTrackIndices, rawLyrics, transposeSemitones, preferHigherOctave);
                        }}
                      >
                        ⚡ Convert &amp; Import to Piano ({selectedTrackIndices.reduce((acc, i) => acc + (parsedMidi.tracks[i]?.totalNotes || 0), 0)} Notes)
                      </button>
                      <span style={{ fontSize: "0.68rem", color: "#94a3b8", textAlign: "center" }}>
                        Folds notes to F4–C6 &amp; creates playable phrases
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Memoized 20-Key Interactive Piano Keyboard */}
              <div className="mpm-card" style={{ padding: "0.85rem 1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc" }}>🎹 Piano</span>
                  <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Transpose:</span>
                    <button className="mpm-action-btn" style={{ padding: "0.15rem 0.35rem", fontSize: "0.68rem" }} onClick={() => handleTransposeChange(-12)}>-12</button>
                    <button className="mpm-action-btn" style={{ padding: "0.15rem 0.35rem", fontSize: "0.68rem" }} onClick={() => handleTransposeChange(-1)}>-1</button>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", minWidth: "18px", textAlign: "center" }}>{transposeSemitones}</span>
                    <button className="mpm-action-btn" style={{ padding: "0.15rem 0.35rem", fontSize: "0.68rem" }} onClick={() => handleTransposeChange(1)}>+1</button>
                    <button className="mpm-action-btn" style={{ padding: "0.15rem 0.35rem", fontSize: "0.68rem" }} onClick={() => handleTransposeChange(12)}>+12</button>
                  </div>
                </div>

                <PianoKeyboard
                  activeNoteMidi={activeNoteMidi}
                  onPlayKey={handlePlayKey}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.3rem" }}>
                  <label className="mpm-checkbox-label" style={{ fontSize: "0.72rem" }}>
                    <input
                      type="checkbox"
                      checked={preferHigherOctave}
                      onChange={(e) => handlePreferHigherOctaveToggle(e.target.checked)}
                    />
                    <span>Prefer Upper Octave</span>
                  </label>
                  <span style={{ fontSize: "0.7rem", color: "#64748b" }}>20 Authentic Keys</span>
                </div>
              </div>

              {/* Record & Time Mode Studio Deck */}
              <div className="mpm-record-panel">
                <div className="mpm-record-header">
                  <span className="mpm-record-title">🎙️ Live Record &amp; Tapper</span>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      className={`mpm-rec-btn ${isRecordingLive ? "recording" : ""}`}
                      onClick={handleToggleRecordMode}
                    >
                      {isRecordingLive ? "⏹ Stop" : "🔴 Record"}
                    </button>
                    <button
                      className={`mpm-time-btn ${isTimingMode ? "timing" : ""}`}
                      onClick={() => (isTimingMode ? handleStopTimingMode() : handleStartTimeMode(0))}
                    >
                      {isTimingMode ? "⏹ Stop" : "⏱️ Time Mode"}
                    </button>
                  </div>
                </div>

                {isRecordingLive && (
                  <div className="mpm-spacebar-hint" style={{ borderColor: "rgba(239, 68, 68, 0.5)" }}>
                    <span>🔴 Type on piano keys to record. Press <span className="mpm-space-key-pill">Space</span> for next phrase!</span>
                  </div>
                )}

                {isTimingMode && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <div className="mpm-spacebar-hint" style={{ borderColor: "rgba(56, 189, 248, 0.5)" }}>
                      <span>Tap <span className="mpm-space-key-pill">Space</span> to time: <strong>Phrase #{timingPhraseIdx + 1}, Note #{timingNoteIdx + 1}</strong></span>
                    </div>
                    <button
                      className="mpm-action-btn primary"
                      style={{ width: "100%", justifyContent: "center", padding: "0.5rem", fontSize: "0.85rem", fontWeight: 700 }}
                      onClick={handleTimeModeTap}
                    >
                      ⚡ Tap Space / Click Here (Next Note)
                    </button>
                  </div>
                )}
              </div>

              {/* Playback Transport & Rhythm Health */}
              <div className="mpm-card" style={{ padding: "0.85rem 1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", gap: "0.5rem" }}>
                  <div className="mpm-transport-pill" style={{ flex: 1 }}>
                    {isPlaying ? (
                      <button className="mpm-transport-stop-btn" onClick={stopPlayback} title="Stop Live Audio Playback" style={{ flex: 1 }}>
                        ⏹ Stop
                      </button>
                    ) : (
                      <button className="mpm-transport-play-btn" onClick={() => playFullSong()} title="Play Full Song Live with Tone Synth" style={{ flex: 1 }}>
                        ▶ Play Full Song
                      </button>
                    )}
                    <div className="mpm-speed-pills">
                      {[0.75, 1.0, 1.25].map((spd) => (
                        <button key={spd} className={`mpm-speed-mini-btn ${playbackSpeed === spd ? "active" : ""}`} onClick={() => setPlaybackSpeed(spd)}>
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                    ⏱️ Avg: <strong>{delayAnalysis.avgNoteDelay.toFixed(2)}s</strong> | Max: <strong>{delayAnalysis.maxNoteDelay.toFixed(2)}s</strong>
                  </span>
                  {delayAnalysis.overallStatus === "danger" ? (
                    <span className="mpm-badge-danger" style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem" }}>🚨 Timeout Risk</span>
                  ) : delayAnalysis.overallStatus === "warning" ? (
                    <span className="mpm-badge-warning" style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem" }}>⚠️ Slow Pacing</span>
                  ) : (
                    <span className="mpm-badge-good" style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem" }}>✅ Safe Rhythm</span>
                  )}
                </div>

                <div style={{ marginTop: "0.25rem" }}>
                  <button className="mpm-action-btn primary" onClick={() => setIsExportModalOpen(true)} style={{ width: "100%", fontSize: "0.78rem", justifyContent: "center", padding: "0.45rem" }}>
                    📤 Export Files
                  </button>
                </div>
              </div>
            </>
          }
          controlsSlot={
            <>
              {/* Sequencer Header */}
              <div className="mpm-card" style={{ padding: "0.65rem 0.9rem", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#f8fafc" }}>🎼 Notes &amp; Lyrics Sequencer</span>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>({phrases.length} phrases • {totalNotesCount} notes)</span>
                  </div>

                  <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
                    <button className="mpm-action-btn primary" onClick={handleAddPhrase} style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}>
                      + Add Phrase
                    </button>
                    <button className="mpm-action-btn" onClick={() => setIsRawKeysModalOpen(true)} style={{ fontSize: "0.75rem", padding: "0.3rem 0.55rem" }}>
                      ⌨️ Paste Keys
                    </button>
                    <button className="mpm-action-btn" onClick={() => setShowRawLyrics(!showRawLyrics)} style={{ fontSize: "0.75rem", padding: "0.3rem 0.55rem" }}>
                      {showRawLyrics ? "Hide Lyrics" : "📝 Raw Lyrics"}
                    </button>
                    <button className="mpm-action-btn" onClick={handleRealignLyrics} style={{ fontSize: "0.75rem", padding: "0.3rem 0.55rem" }}>
                      🔄 Re-align
                    </button>
                  </div>
                </div>

                {showRawLyrics && (
                  <div style={{ marginTop: "0.6rem" }}>
                    <textarea
                      className="mpm-textarea"
                      rows={6}
                      value={rawLyrics}
                      onChange={(e) => setRawLyrics(e.target.value)}
                      placeholder="Paste raw lyrics line by line..."
                    />
                  </div>
                )}
              </div>

              {/* Scrollable Phrase Sequencer List with Memoized Card Items */}
              <div
                className="mpm-phrase-list"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.65rem",
                  paddingRight: "4px",
                }}
              >
                {phrases.map((phrase, pIdx) => {
                  const isCurrentPlaying = activePhraseIndex === pIdx;
                  const isFocused = activeEditingPhraseIdx === pIdx;
                  const isTimingCurrentPhrase = isTimingMode && timingPhraseIdx === pIdx;

                  return (
                    <div
                      key={phrase.id || pIdx}
                      ref={(el) => {
                        phraseCardsRef.current[pIdx] = el;
                      }}
                    >
                      <PhraseCardItem
                        phrase={phrase}
                        pIdx={pIdx}
                        isCurrentPlaying={isCurrentPlaying}
                        isFocused={isFocused}
                        isTimingCurrentPhrase={isTimingCurrentPhrase}
                        timingNoteIdx={timingNoteIdx}
                        userCustomPresets={userCustomPresets}
                        noteToAdd={noteToAdd}
                        setNoteToAdd={setNoteToAdd}
                        onTextChange={handlePhraseTextChange}
                        onExpressionChange={handlePhraseExpressionChange}
                        onToggleVerse={handleToggleVerse}
                        onMoveUp={handleMovePhraseUp}
                        onMoveDown={handleMovePhraseDown}
                        onDuplicate={handleDuplicatePhrase}
                        onDelete={handleDeletePhrase}
                        onPlaySingle={playSinglePhrase}
                        onUpdatePitch={handleUpdateNotePitch}
                        onRemoveNote={handleRemoveNoteFromPhrase}
                        onNoteDelayChange={handleNoteDelayChange}
                        onAddNote={handleAddNoteToPhrase}
                        onSetAllDelays={handleSetAllPhraseDelays}
                        onSelectFocus={setActiveEditingPhraseIdx}
                        onPlayKey={handlePlayKey}
                        isLast={pIdx === phrases.length - 1}
                      />
                    </div>
                  );
                })}

                <div style={{ padding: "0.5rem 0", display: "flex", justifyContent: "center" }}>
                  <button className="mpm-action-btn primary" onClick={handleAddPhrase}>
                    + Add New Phrase
                  </button>
                </div>
              </div>
            </>
          }
        />
      )}

      {/* TAB 3: MAS Emotion & Sprite Simulator Studio (Locked Scroll Workstation Mode) */}
      {activeTab === "expressions" && (
        <StudioAppletShell
          title={appletViewModes}
          actionsSlot={appletActions}
          previewRatio="390px"
          controlsRatio="1fr"
          fullHeight={true}
          previewSlot={
            <div className="mpm-sprite-stage-card">
              <div className="mpm-sprite-viewport">
                <span className="mpm-sprite-code-tag">MAS Code: {activeExpressionCode}</span>
                <MonikaSpriteVisualizer
                  pose={simPose}
                  eyes={simEyes}
                  brows={simBrows}
                  mouth={simMouth}
                  modifier={simModifier}
                  height="330px"
                />
              </div>

              <div className="mpm-sprite-dialogue-box">
                <div className="mpm-monika-speech">
                  <span style={{ fontWeight: 700, color: "#38bdf8", display: "block", marginBottom: "0.2rem" }}>Monika:</span>
                  <span>"{simDialogueText || "..."}"</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.35rem" }}>
                  <label style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>Test Monika's Dialogue Speech:</label>
                  <input
                    type="text"
                    className="mpm-input"
                    value={simDialogueText}
                    onChange={(e) => setSimDialogueText(e.target.value)}
                    placeholder="Type speech for Monika to preview..."
                    style={{ fontSize: "0.82rem", padding: "0.35rem 0.6rem" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginTop: "0.5rem" }}>
                  <button
                    className="mpm-action-btn"
                    onClick={() => handleCopy(activeExpressionCode, "code")}
                    style={{ fontSize: "0.75rem", justifyContent: "center" }}
                  >
                    {copiedType === "code" ? "✓ Code Copied!" : `📋 Copy "${activeExpressionCode}"`}
                  </button>
                  <button
                    className="mpm-action-btn"
                    onClick={() => handleCopy(`m ${activeExpressionCode} "${simDialogueText}"`, "line")}
                    style={{ fontSize: "0.75rem", justifyContent: "center" }}
                  >
                    {copiedType === "line" ? "✓ Line Copied!" : "📜 Copy Ren'Py Line"}
                  </button>
                </div>

                {phrases.length > 0 && (
                  <button
                    className="mpm-action-btn primary"
                    onClick={handleApplyExpressionToActivePhrase}
                    style={{ width: "100%", justifyContent: "center", marginTop: "0.3rem", fontSize: "0.78rem", fontWeight: 700 }}
                  >
                    ✨ Apply to Phrase #{Math.min(activeEditingPhraseIdx + 1, phrases.length)} ("{phrases[Math.min(activeEditingPhraseIdx, phrases.length - 1)]?.text.slice(0, 20)}...")
                  </button>
                )}
              </div>
            </div>
          }
          controlsSlot={
            <div className="mpm-matrix-section">
              <div className="mpm-card" style={{ padding: "1rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#f8fafc", margin: "0 0 0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span>🌸</span>
                  <span>MAS 4-Part Expression Matrix Builder</span>
                </h3>

                {/* 1. Pose */}
                <div className="mpm-matrix-group" style={{ marginBottom: "0.85rem" }}>
                  <span className="mpm-matrix-label">1. Head &amp; Body Pose (1–7):</span>
                  <div className="mpm-matrix-pills">
                    {EXTENDED_POSES.map((p) => (
                      <button
                        key={p.code}
                        className={`mpm-matrix-pill ${simPose === p.code ? "active" : ""}`}
                        onClick={() => setSimPose(p.code)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Eyes */}
                <div className="mpm-matrix-group" style={{ marginBottom: "0.85rem" }}>
                  <span className="mpm-matrix-label">2. Eye Shape &amp; Pupil Gaze:</span>
                  <div className="mpm-matrix-pills">
                    {EXTENDED_EYES.map((e) => (
                      <button
                        key={e.code}
                        className={`mpm-matrix-pill ${simEyes === e.code ? "active" : ""}`}
                        onClick={() => setSimEyes(e.code)}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Eyebrows */}
                <div className="mpm-matrix-group" style={{ marginBottom: "0.85rem" }}>
                  <span className="mpm-matrix-label">3. Eyebrows Contour:</span>
                  <div className="mpm-matrix-pills">
                    {EXTENDED_BROWS.map((b) => (
                      <button
                        key={b.code}
                        className={`mpm-matrix-pill ${simBrows === b.code ? "active" : ""}`}
                        onClick={() => setSimBrows(b.code)}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Mouth */}
                <div className="mpm-matrix-group" style={{ marginBottom: "0.85rem" }}>
                  <span className="mpm-matrix-label">4. Mouth Expression:</span>
                  <div className="mpm-matrix-pills">
                    {EXTENDED_MOUTHS.map((m) => (
                      <button
                        key={m.code}
                        className={`mpm-matrix-pill ${simMouth === m.code ? "active" : ""}`}
                        onClick={() => setSimMouth(m.code)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Modifiers */}
                <div className="mpm-matrix-group">
                  <span className="mpm-matrix-label">5. Expression Overlays &amp; FX:</span>
                  <div className="mpm-matrix-pills">
                    {EXTENDED_MODIFIERS.map((mod) => (
                      <button
                        key={mod.code}
                        className={`mpm-matrix-pill ${simModifier === mod.code ? "active" : ""}`}
                        onClick={() => setSimModifier(mod.code)}
                      >
                        {mod.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Emotion Presets Library & Creator */}
              <div className="mpm-card" style={{ padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <h3 style={{ fontSize: "0.92rem", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                      ⭐ Emotion Presets Showcase &amp; Custom Presets
                    </h3>
                    <p style={{ fontSize: "0.74rem", color: "#94a3b8", margin: "0.15rem 0 0" }}>
                      Click any preset to preview, or save your currently configured face to your personal preset library!
                    </p>
                  </div>
                </div>

                <div className="mpm-add-preset-bar">
                  <input
                    type="text"
                    className="mpm-input"
                    value={newPresetLabel}
                    onChange={(e) => setNewPresetLabel(e.target.value)}
                    placeholder={`Name current face (e.g. "Romantic Climax", "Tsundere Glance")...`}
                    style={{ flex: 1, minWidth: "220px", fontSize: "0.8rem", padding: "0.35rem 0.6rem" }}
                  />
                  <button
                    className="mpm-action-btn primary"
                    onClick={handleSaveCustomPreset}
                    style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}
                  >
                    + Save Current as Preset
                  </button>
                </div>

                <div className="mpm-custom-presets-grid">
                  {FACTORY_PRESETS.map((preset) => {
                    const isSelected = activeExpressionCode === preset.code;
                    return (
                      <div
                        key={preset.id}
                        className={`mpm-custom-preset-card ${isSelected ? "active" : ""}`}
                        onClick={() => handleApplyPresetToSimulator(preset)}
                      >
                        <div className="preset-card-info">
                          <span className="preset-card-code">{preset.code}</span>
                          <span className="preset-card-label">{preset.label}</span>
                        </div>
                        <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Built-in</span>
                      </div>
                    );
                  })}

                  {userCustomPresets.map((preset) => {
                    const isSelected = activeExpressionCode === preset.code;
                    return (
                      <div
                        key={preset.id}
                        className={`mpm-custom-preset-card ${isSelected ? "active" : ""}`}
                        onClick={() => handleApplyPresetToSimulator(preset)}
                        style={{ borderColor: "rgba(56, 189, 248, 0.4)" }}
                      >
                        <div className="preset-card-info">
                          <span className="preset-card-code" style={{ color: "#38bdf8" }}>{preset.code}</span>
                          <span className="preset-card-label">{preset.label}</span>
                        </div>
                        <button
                          className="preset-card-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomPreset(preset.id);
                          }}
                          title="Delete custom preset"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          }
        />
      )}

      {/* Raw Keyboard Keys Importer Modal */}
      {isRawKeysModalOpen && (
        <AppletDetailModal
          isOpen={isRawKeysModalOpen}
          onClose={() => setIsRawKeysModalOpen(false)}
          title={
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <span style={{ fontSize: "1.3rem" }}>⌨️</span>
              <span>Paste Raw Keyboard Keys</span>
            </div>
          }
          subtitle="Paste raw Monika piano key lines (e.g. from community posts). Spaces are ignored and each line becomes a separate phrase!"
          maxWidth="700px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.45 }}>
              <div style={{ fontWeight: 700, color: "#38bdf8", marginBottom: "0.25rem" }}>
                🎹 How Key Character Parsing Works:
              </div>
              <div>• <strong>White Keys:</strong> <code>Q W E R T Y U I O P [ ]</code> (F4 to C6)</div>
              <div>• <strong>Black Keys (Sharps):</strong> <code>2 3 4 6 7 9 0 -</code> (F#4 to A#5)</div>
              <div>• <strong>Spaces</strong> within each line are ignored (e.g. <code>44T643 007</code> ➔ 9 notes).</div>
              <div>• <strong>Each new line</strong> automatically creates a separate phrase card in record mode order!</div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f8fafc" }}>
                  Paste Key Characters (Line by Line):
                </label>
                {rawKeysInput && (
                  <button
                    type="button"
                    className="mpm-action-btn"
                    style={{ fontSize: "0.72rem", padding: "0.15rem 0.45rem", color: "#f87171" }}
                    onClick={() => setRawKeysInput("")}
                  >
                    🗑️ Clear
                  </button>
                )}
              </div>
              <textarea
                className="mpm-ai-textarea"
                rows={7}
                value={rawKeysInput}
                onChange={(e) => setRawKeysInput(e.target.value)}
                placeholder={`4T667T43\n44T643 007\n44T6467 T4T43\n44T643 777I7\n6 7I6777I733\n4T64 7I7`}
                style={{ fontFamily: "monospace", fontSize: "0.88rem", letterSpacing: "0.03em" }}
              />
            </div>

            {/* Delay & Timing Setting */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", background: "rgba(15, 23, 42, 0.6)", padding: "0.6rem 0.85rem", borderRadius: "6px", border: "1px solid rgba(51, 65, 85, 0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>Default Note Delay:</span>
                {[0.24, 0.28, 0.32, 0.45].map((d) => (
                  <button
                    key={d}
                    className={`mpm-speed-mini-btn ${rawKeysDefaultDelay === d ? "active" : ""}`}
                    onClick={() => setRawKeysDefaultDelay(d)}
                    style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                  >
                    {d}s
                  </button>
                ))}
              </div>

              <div style={{ fontSize: "0.8rem", color: parsedRawKeysPreview.length > 0 ? "#34d399" : "#64748b", fontWeight: 700 }}>
                {parsedRawKeysPreview.length > 0
                  ? `✓ Detected ${parsedRawKeysPreview.length} phrases (${rawKeysTotalNotes} notes)`
                  : "Waiting for key input..."}
              </div>
            </div>

            {/* Parsed Note Sequence Preview */}
            {parsedRawKeysPreview.length > 0 && (
              <div style={{ maxHeight: "140px", overflowY: "auto", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "6px", padding: "0.5rem 0.75rem" }}>
                <div style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: 700, marginBottom: "0.3rem" }}>
                  Preview Parsed Phrases:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {parsedRawKeysPreview.slice(0, 6).map((p, idx) => (
                    <div key={idx} style={{ fontSize: "0.74rem", color: "#cbd5e1", display: "flex", gap: "0.5rem" }}>
                      <strong style={{ color: "#38bdf8" }}>#{idx + 1}:</strong>
                      <span style={{ fontFamily: "monospace", color: "#e2e8f0" }}>{p.notes.join(" - ")}</span>
                      <span style={{ color: "#64748b" }}>({p.notes.length} notes)</span>
                    </div>
                  ))}
                  {parsedRawKeysPreview.length > 6 && (
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                      + {parsedRawKeysPreview.length - 6} more phrases...
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              <button
                className="mpm-action-btn primary"
                disabled={parsedRawKeysPreview.length === 0}
                onClick={() => handleImportRawKeys("replace")}
                style={{ flex: 1, minWidth: "180px", justifyContent: "center", padding: "0.6rem", fontSize: "0.82rem", fontWeight: 700 }}
              >
                ✨ Replace Current Workspace
              </button>
              <button
                className="mpm-action-btn"
                disabled={parsedRawKeysPreview.length === 0}
                onClick={() => handleImportRawKeys("append")}
                style={{ flex: 1, minWidth: "150px", justifyContent: "center", padding: "0.6rem", fontSize: "0.82rem", background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.4)", fontWeight: 600 }}
              >
                ➕ Append to End
              </button>
              <button
                className="mpm-action-btn"
                onClick={() => setIsRawKeysModalOpen(false)}
                style={{ padding: "0.6rem 1rem", fontSize: "0.82rem" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </AppletDetailModal>
      )}

      {/* Dedicated Export MAS Song Portal Modal */}
      {isExportModalOpen && (
        <AppletDetailModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title={
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <span style={{ fontSize: "1.3rem" }}>📤</span>
              <span>Export Song for Monika After Story</span>
            </div>
          }
          subtitle="Save or copy your MAS song JSON, Ren'Py dialogue script, and keys cheat sheet."
          maxWidth="840px"
          bodyStyle={{ padding: "0 1.4rem 1.4rem 1.4rem" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingTop: "1.4rem" }}>
            {delayAnalysis.warnings.length > 0 && (
              <div className={`mpm-warning-alert ${delayAnalysis.overallStatus === "danger" ? "critical" : "warning"}`}>
                <div className="alert-header">
                  <span className="alert-icon">{delayAnalysis.overallStatus === "danger" ? "🚨" : "⚠️"}</span>
                  <strong>
                    {delayAnalysis.overallStatus === "danger"
                      ? "Monika After Story Timeout Warning (Delays >= 5.0s Detected!)"
                      : "Monika After Story Pacing Notice (Delays >= 3.0s Detected)"}
                  </strong>
                </div>
                <ul className="alert-list">
                  {delayAnalysis.warnings.slice(0, 4).map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className={`mpm-status-box ${validationResult.valid ? "" : "invalid"}`}>
              <div className="mpm-status-icon">{validationResult.valid ? "✅" : "⚠️"}</div>
              <div className="mpm-status-text">
                <strong>{validationResult.valid ? "MAS Piano Format Verification Passed" : "MAS Piano Format Errors"}</strong>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  {validationResult.valid ? "All phrases, verse checkpoints, and 20-key ranges match MAS specifications." : validationResult.errors.join(", ")}
                </div>
              </div>
            </div>

            {/* JSON Format Info Notice */}
            <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "0.65rem 0.85rem", borderRadius: "8px", fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.45 }}>
              <div style={{ fontWeight: 700, color: "#38bdf8", marginBottom: "0.2rem" }}>
                💡 Which JSON format should you use?
              </div>
              <div>
                Both versions work just fine on Monika After Story. <strong style={{ color: "#38bdf8" }}>Piano Studio Standard JSON is recommended</strong> — it preserves your delay timings so you can re-import and keep editing. Use Monika After Story Compact if you only need bare minimum code for the game.
              </div>
            </div>

            {/* 1. Piano Studio Standard JSON */}
            <div className="mpm-code-box">
              <div
                className="mpm-code-header"
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => setOpenBlock(openBlock === "standard" ? null : "standard")}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="mpm-code-title">
                      📄 Piano Studio Standard JSON (<code>{songName.toLowerCase().replace(/\s+/g, "_")}.json</code>)
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "4px", padding: "0.1rem 0.4rem", fontWeight: 700 }}>
                      Standard
                    </span>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "0.2rem", lineHeight: 1.4 }}>
                    Necessary code for Monika After Story, plus delay timings so you can re-import and keep editing in Piano Studio.
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={e => e.stopPropagation()}>
                  {openBlock === "standard" && <>
                    <button className="mpm-action-btn" onClick={() => handleCopy(standardJsonOutput, "standard-json")}>
                      {copiedType === "standard-json" ? "✓ Copied!" : "📋 Copy"}
                    </button>
                    <button
                      className="mpm-action-btn primary"
                      onClick={() =>
                        handleSaveFile(
                          standardJsonOutput,
                          `${songName.toLowerCase().replace(/\s+/g, "_")}.json`,
                          "Piano Studio Standard JSON",
                          "json"
                        )
                      }
                    >
                      💾 Save
                    </button>
                  </>}
                  <button
                    className="mpm-action-btn"
                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.55rem" }}
                    onClick={() => setOpenBlock(openBlock === "standard" ? null : "standard")}
                  >
                    {openBlock === "standard" ? "▲ Collapse" : "▼ Expand"}
                  </button>
                </div>
              </div>
              {openBlock === "standard" && <pre className="mpm-code-content">{standardJsonOutput}</pre>}
            </div>

            {/* 2. Monika After Story Compact JSON */}
            <div className="mpm-code-box">
              <div
                className="mpm-code-header"
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => setOpenBlock(openBlock === "compact" ? null : "compact")}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="mpm-code-title">
                      📦 Monika After Story Compact JSON (<code>{songName.toLowerCase().replace(/\s+/g, "_")}_compact.json</code>)
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "#34d399", background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", borderRadius: "4px", padding: "0.1rem 0.4rem", fontWeight: 700 }}>
                      Pure MAS
                    </span>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "0.2rem", lineHeight: 1.4 }}>
                    Bare minimum for MAS only. No delay data — importing to Piano Studio will use default timing.
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={e => e.stopPropagation()}>
                  {openBlock === "compact" && <>
                    <button className="mpm-action-btn" onClick={() => handleCopy(compactJsonOutput, "compact-json")}>
                      {copiedType === "compact-json" ? "✓ Copied!" : "📋 Copy"}
                    </button>
                    <button
                      className="mpm-action-btn"
                      onClick={() =>
                        handleSaveFile(
                          compactJsonOutput,
                          `${songName.toLowerCase().replace(/\s+/g, "_")}_compact.json`,
                          "Monika After Story Compact JSON",
                          "json"
                        )
                      }
                    >
                      💾 Save
                    </button>
                  </>}
                  <button
                    className="mpm-action-btn"
                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.55rem" }}
                    onClick={() => setOpenBlock(openBlock === "compact" ? null : "compact")}
                  >
                    {openBlock === "compact" ? "▲ Collapse" : "▼ Expand"}
                  </button>
                </div>
              </div>
              {openBlock === "compact" && <pre className="mpm-code-content">{compactJsonOutput}</pre>}
            </div>

            {/* 3. Keys Cheat Sheet */}
            <div className="mpm-code-box">
              <div
                className="mpm-code-header"
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => setOpenBlock(openBlock === "keys" ? null : "keys")}
              >
                <span className="mpm-code-title">📝 Lyrics &amp; Default Keys Cheat Sheet</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={e => e.stopPropagation()}>
                  {openBlock === "keys" && <>
                    <button className="mpm-action-btn" onClick={() => handleCopy(keysTextOutput, "keys")}>
                      {copiedType === "keys" ? "✓ Copied!" : "📋 Copy"}
                    </button>
                    <button
                      className="mpm-action-btn"
                      onClick={() =>
                        handleSaveFile(
                          keysTextOutput,
                          `${songName.toLowerCase().replace(/\s+/g, "_")}_keys.txt`,
                          "Plain Text / Lyrics",
                          "txt"
                        )
                      }
                    >
                      💾 Save
                    </button>
                  </>}
                  <button
                    className="mpm-action-btn"
                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.55rem" }}
                    onClick={() => setOpenBlock(openBlock === "keys" ? null : "keys")}
                  >
                    {openBlock === "keys" ? "▲ Collapse" : "▼ Expand"}
                  </button>
                </div>
              </div>
              {openBlock === "keys" && <pre className="mpm-code-content">{keysTextOutput}</pre>}
            </div>
          </div>
        </AppletDetailModal>
      )}

      {/* Dialogue Companion Submod Audition Studio Modal */}
      {isDialogueModalOpen && (
        <AppletDetailModal
          isOpen={true}
          onClose={() => setIsDialogueModalOpen(false)}
          title="💬 Monika Dialogue Submod: Audition Studio"
          subtitle="Listen to Monika's in-game dialogue for all 8 custom songs • Single compiled .rpyc file"
          maxWidth="940px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Top Split View: Left Song Selector + Right Live Visual Novel Player */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "250px 1fr",
                gap: "1rem",
                minHeight: "440px",
              }}
            >
              {/* Left Column: Song List */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(51, 65, 85, 0.6)",
                  borderRadius: "10px",
                  padding: "0.6rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  maxHeight: "460px",
                  overflowY: "auto",
                }}
              >
                <div style={{ padding: "0.25rem 0.4rem 0.5rem", fontSize: "0.74rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  Select Track (8 Songs)
                </div>
                {MONIKA_CUSTOM_SONGS.map((song) => {
                  const isSelected = song.slug === companionSongSlug;
                  const hasChoices = Boolean(song.dialogueConfig?.perfectChoices?.length);
                  return (
                    <button
                      key={song.slug}
                      style={{
                        textAlign: "left",
                        padding: "0.55rem 0.65rem",
                        borderRadius: "8px",
                        background: isSelected ? "rgba(6, 78, 59, 0.55)" : "transparent",
                        border: isSelected ? "1px solid rgba(16, 185, 129, 0.6)" : "1px solid transparent",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.15rem",
                        transition: "all 0.15s ease",
                      }}
                      onClick={() => {
                        setCompanionSongSlug(song.slug);
                        setCompanionLineIdx(0);
                        setCompanionChoiceId(null);
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: isSelected ? 700 : 600, color: isSelected ? "#a7f3d0" : "#f1f5f9" }}>
                          {song.name}
                        </span>
                        {hasChoices && (
                          <span style={{ fontSize: "0.62rem", color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "0.05rem 0.35rem", borderRadius: "4px", fontWeight: 600 }}>
                            Choices
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.7rem", color: isSelected ? "#6ee7b7" : "#94a3b8" }}>
                        {song.artist}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Visual Novel Dialogue Player */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  background: "rgba(15, 23, 42, 0.65)",
                  border: "1px solid rgba(51, 65, 85, 0.6)",
                  borderRadius: "10px",
                  padding: "0.85rem 1rem",
                }}
              >
                {/* Track Header & Ren'Py Label Pill */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.98rem", color: "#f8fafc", fontWeight: 700 }}>
                      {selectedCompanionSong.name}
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 600 }}>
                      {selectedCompanionSong.artist}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "#94a3b8", background: "rgba(0, 0, 0, 0.5)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "0.15rem 0.5rem", borderRadius: "6px" }}>
                    label: {selectedCompanionSong.dialogueConfig?.fc_label || "jmcustom_song_perfect"}
                  </span>
                </div>

                {/* In-Game Visual Novel Dialogue Box */}
                {activeDialogueSequence.length > 0 ? (
                  (() => {
                    const currentLine = activeDialogueSequence[Math.min(companionLineIdx, activeDialogueSequence.length - 1)];
                    const rawText = currentLine?.text || "...";
                    const isChoiceLine = Boolean(currentLine?.choices && currentLine.choices.length > 0);

                    // Formatted text renderer
                    const parts = rawText.split(/(\{i\}[\s\S]*?\{\/i\}|\[player\])/g);
                    const renderedContent = parts.map((part, idx) => {
                      if (part.startsWith("{i}") && part.endsWith("{/i}")) {
                        return <em key={idx} style={{ color: "#fef08a", fontStyle: "italic" }}>{part.slice(3, -4)}</em>;
                      }
                      if (part === "[player]") {
                        return <strong key={idx} style={{ color: "#38bdf8", fontWeight: 700 }}>[player]</strong>;
                      }
                      return part;
                    });

                    return (
                      <div
                        style={{
                          background: "linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)",
                          border: "1px solid rgba(244, 114, 182, 0.3)",
                          borderRadius: "10px",
                          padding: "1rem",
                          position: "relative",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                          minHeight: "150px",
                        }}
                      >
                        {/* Namebox & Pose Pill */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div
                            style={{
                              background: "linear-gradient(180deg, #ffb3c6 0%, #ff8da1 100%)",
                              color: "#4a044e",
                              fontWeight: 800,
                              fontSize: "0.78rem",
                              padding: "0.2rem 0.75rem",
                              borderRadius: "4px",
                              border: "1.5px solid #ffffff",
                              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)",
                              letterSpacing: "0.02em",
                            }}
                          >
                            Monika
                          </div>
                          {currentLine?.expression && (
                            <span style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "#cbd5e1", background: "rgba(0, 0, 0, 0.4)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                              pose: m {currentLine.expression}
                            </span>
                          )}
                        </div>

                        {/* Dialogue Line Text */}
                        <div
                          style={{
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            color: "#f8fafc",
                            fontFamily: "var(--font-family-serif, Georgia, serif)",
                            minHeight: "56px",
                          }}
                        >
                          "{renderedContent}"
                        </div>

                        {/* Interactive Choice Buttons if active */}
                        {isChoiceLine && currentLine.choices && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.25rem" }}>
                            <div style={{ fontSize: "0.72rem", color: "#f472b6", fontWeight: 700 }}>
                              Choose your reply:
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              {currentLine.choices.map((choice) => {
                                const isCurrent = companionChoiceId === choice.id || (!companionChoiceId && choice.id === currentLine.choices?.[0]?.id);
                                return (
                                  <button
                                    key={choice.id}
                                    style={{
                                      background: isCurrent ? "rgba(236, 72, 153, 0.25)" : "rgba(255, 255, 255, 0.06)",
                                      border: isCurrent ? "1px solid #ec4899" : "1px solid rgba(255, 255, 255, 0.15)",
                                      color: isCurrent ? "#fdf2f8" : "#cbd5e1",
                                      fontWeight: 600,
                                      fontSize: "0.78rem",
                                      padding: "0.35rem 0.75rem",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      setCompanionChoiceId(choice.id);
                                      setCompanionLineIdx(companionLineIdx + 1);
                                    }}
                                  >
                                    "{choice.choiceText}" {isCurrent ? "✓" : ""}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Step Navigation Controls */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", marginTop: "auto" }}>
                          <button
                            className="mpm-action-btn"
                            disabled={companionLineIdx <= 0}
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem", opacity: companionLineIdx <= 0 ? 0.4 : 1 }}
                            onClick={() => setCompanionLineIdx((prev) => Math.max(0, prev - 1))}
                          >
                            ◀ Prev Line
                          </button>
                          <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>
                            Line {companionLineIdx + 1} of {activeDialogueSequence.length}
                          </span>
                          <div style={{ display: "flex", gap: "0.35rem" }}>
                            <button
                              className="mpm-action-btn"
                              style={{ fontSize: "0.75rem", padding: "0.25rem 0.55rem" }}
                              onClick={() => setCompanionLineIdx(0)}
                              title="Restart from first line"
                            >
                              🔄
                            </button>
                            <button
                              className="mpm-action-btn primary"
                              disabled={companionLineIdx >= activeDialogueSequence.length - 1}
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.25rem 0.75rem",
                                background: companionLineIdx >= activeDialogueSequence.length - 1 ? "rgba(255, 255, 255, 0.08)" : "#059669",
                                color: "#fff",
                                opacity: companionLineIdx >= activeDialogueSequence.length - 1 ? 0.4 : 1,
                              }}
                              onClick={() => setCompanionLineIdx((prev) => Math.min(activeDialogueSequence.length - 1, prev + 1))}
                            >
                              Next Line ▶
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                    No dialogue lines found for this track.
                  </div>
                )}

                {/* Lore / Story Insight Card */}
                <div style={{ background: "rgba(6, 78, 59, 0.2)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "8px", padding: "0.65rem 0.85rem" }}>
                  <div style={{ fontSize: "0.72rem", color: "#6ee7b7", fontWeight: 700, marginBottom: "0.2rem" }}>
                    📖 Story &amp; Lore Context:
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                    {selectedCompanionSong.slug === "backtodecember" && "Monika discusses Taylor Swift writing the song as an apology for Taylor Lautner, and reflects on trusting your love across realities."}
                    {selectedCompanionSong.slug === "leavingonajetplane" && "Includes an interactive choice menu asking if you're really leaving, shares 1998 Armageddon movie trivia, and promises to never let go."}
                    {selectedCompanionSong.slug === "rainbowconnection" && "Playful Kermit banter, deep reflections on Paul Williams's songwriting, and reminiscing about looking out the classroom window before you arrived."}
                    {selectedCompanionSong.slug === "islandsong" && "Monika explores Pendleton Ward's Land of Ooo, Princess Bubblegum, and promises that your shared tunes will never change."}
                    {selectedCompanionSong.slug === "megalovania" && "Monika muses on Sans's fourth-wall awareness, timeline resets, and finds determination from reaching across the screen to you."}
                    {selectedCompanionSong.slug === "dokidokiforever" && "Celebrates the DDLC fan community, remembers Sayori, Natsuki, and Yuri, and promises that you are truly together forever."}
                    {selectedCompanionSong.slug === "songofstorms" && "Monika discusses the Kakariko Village windmill bootstrap time paradox, listens to the raindrops outside, and enjoys cozy moments with you."}
                    {selectedCompanionSong.slug === "nevergonnagiveyouup" && "Playful teasing about Rickrolling her on the piano, 80s dance-pop history, and turning the famous chorus into a genuine declaration of loyalty."}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Installation & Download Bar */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(51, 65, 85, 0.7)",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1, minWidth: "260px" }}>
                <span style={{ fontSize: "1.1rem" }}>📁</span>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#f8fafc", fontWeight: 600 }}>
                    Install Path: <code>ddlc/game/Submods/custom_dialogue_v1.rpyc</code>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    Drop this single compiled file into your MAS game folder and restart.
                  </div>
                </div>
                <button
                  className="mpm-action-btn"
                  style={{ fontSize: "0.72rem", padding: "0.25rem 0.55rem", marginLeft: "0.25rem" }}
                  onClick={() => {
                    navigator.clipboard.writeText("ddlc/game/Submods/custom_dialogue_v1.rpyc");
                    setCopiedSubmodPath(true);
                    setTimeout(() => setCopiedSubmodPath(false), 2000);
                  }}
                >
                  {copiedSubmodPath ? "✓ Copied" : "📋 Copy Path"}
                </button>
              </div>

              <button
                className="mpm-action-btn primary"
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  color: "#ffffff",
                  border: "1px solid rgba(52, 211, 153, 0.4)",
                  fontWeight: 700,
                  padding: "0.5rem 1.25rem",
                  fontSize: "0.84rem",
                  boxShadow: "0 0 16px rgba(5, 150, 105, 0.35)",
                  whiteSpace: "nowrap",
                }}
                onClick={handleDownloadRpyc}
              >
                📥 Download custom_dialogue_v1.rpyc (30 KB)
              </button>
            </div>
          </div>
        </AppletDetailModal>
      )}

      {/* Project Switch / Overwrite Confirmation Modal */}
      {pendingProjectSwitch && (
        <AppletDetailModal
          isOpen={true}
          onClose={() => setPendingProjectSwitch(null)}
          title="⚠️ Replace Active Studio Project?"
          subtitle={`You are currently working on "${songName}".`}
          maxWidth="540px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "0.85rem 1rem", borderRadius: "8px" }}>
              <p style={{ margin: 0, fontSize: "0.84rem", color: "#fca5a5", lineHeight: 1.5 }}>
                Opening <strong>{pendingProjectSwitch.kind === "new" ? "a Blank Project" : pendingProjectSwitch.kind === "file" ? pendingProjectSwitch.file.name : pendingProjectSwitch.song.name}</strong> will overwrite your active Piano Studio workspace.
              </p>
              <p style={{ margin: "0.55rem 0 0", fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                To make sure you don't lose your work, save your current project as a <strong>Piano Studio Standard JSON</strong> (<code>.json</code>) so you can reopen and continue editing anytime!
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
              <button
                className="mpm-action-btn primary"
                style={{ width: "100%", justifyContent: "center", padding: "0.6rem", fontSize: "0.82rem", fontWeight: 700 }}
                onClick={async () => {
                  const saved = await handleSaveFile(
                    generateStandardMonikaPianoJson(currentSong),
                    `${songName.toLowerCase().replace(/\s+/g, "_") || "monika_song"}.json`,
                    "Monika Piano Standard JSON",
                    "json"
                  );
                  if (saved) {
                    runProjectSwitch();
                  }
                }}
              >
                💾 Save Project &amp; Continue
              </button>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="mpm-action-btn danger"
                  style={{ flex: 1, justifyContent: "center", padding: "0.5rem", fontSize: "0.8rem", background: "#ef4444", color: "#fff", fontWeight: 600 }}
                  onClick={runProjectSwitch}
                >
                  ⚠️ Discard &amp; Continue
                </button>
                <button
                  className="mpm-action-btn"
                  style={{ flex: 1, justifyContent: "center", padding: "0.5rem", fontSize: "0.8rem" }}
                  onClick={() => setPendingProjectSwitch(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </AppletDetailModal>
      )}
    </>
      </div>
    </div>
  );
}