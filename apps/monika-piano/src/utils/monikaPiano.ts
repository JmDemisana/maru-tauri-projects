// Monika After Story Piano definitions, modulo math octave folding, and export generators.

export interface MonikaPianoKey {
  note: string; // e.g. "F4", "F4SH", "C5", "C5SH"
  label: string; // e.g. "F4", "F#4", "C5", "C#5"
  key: string; // e.g. "q", "2", "w", "3"
  displayKey: string; // uppercase or symbol e.g. "Q", "2", "W", "3"
  midi: number; // MIDI pitch 65..84
  isSharp: boolean;
  frequency: number; // in Hz
}

// 20 notes available in Monika's Piano (F4 to C6 inclusive)
export const MONIKA_PIANO_KEYS: readonly MonikaPianoKey[] = [
  { note: "F4", label: "F4", key: "q", displayKey: "Q", midi: 65, isSharp: false, frequency: 349.23 },
  { note: "F4SH", label: "F#4", key: "2", displayKey: "2", midi: 66, isSharp: true, frequency: 369.99 },
  { note: "G4", label: "G4", key: "w", displayKey: "W", midi: 67, isSharp: false, frequency: 392.00 },
  { note: "G4SH", label: "G#4", key: "3", displayKey: "3", midi: 68, isSharp: true, frequency: 415.30 },
  { note: "A4", label: "A4", key: "e", displayKey: "E", midi: 69, isSharp: false, frequency: 440.00 },
  { note: "A4SH", label: "A#4", key: "4", displayKey: "4", midi: 70, isSharp: true, frequency: 466.16 },
  { note: "B4", label: "B4", key: "r", displayKey: "R", midi: 71, isSharp: false, frequency: 493.88 },
  { note: "C5", label: "C5", key: "t", displayKey: "T", midi: 72, isSharp: false, frequency: 523.25 },
  { note: "C5SH", label: "C#5", key: "6", displayKey: "6", midi: 73, isSharp: true, frequency: 554.37 },
  { note: "D5", label: "D5", key: "y", displayKey: "Y", midi: 74, isSharp: false, frequency: 587.33 },
  { note: "D5SH", label: "D#5", key: "7", displayKey: "7", midi: 75, isSharp: true, frequency: 622.25 },
  { note: "E5", label: "E5", key: "u", displayKey: "U", midi: 76, isSharp: false, frequency: 659.25 },
  { note: "F5", label: "F5", key: "i", displayKey: "I", midi: 77, isSharp: false, frequency: 698.46 },
  { note: "F5SH", label: "F#5", key: "9", displayKey: "9", midi: 78, isSharp: true, frequency: 739.99 },
  { note: "G5", label: "G5", key: "o", displayKey: "O", midi: 79, isSharp: false, frequency: 783.99 },
  { note: "G5SH", label: "G#5", key: "0", displayKey: "0", midi: 80, isSharp: true, frequency: 830.61 },
  { note: "A5", label: "A5", key: "p", displayKey: "P", midi: 81, isSharp: false, frequency: 880.00 },
  { note: "A5SH", label: "A#5", key: "-", displayKey: "-", midi: 82, isSharp: true, frequency: 932.33 },
  { note: "B5", label: "B5", key: "[", displayKey: "[", midi: 83, isSharp: false, frequency: 987.77 },
  { note: "C6", label: "C6", key: "]", displayKey: "]", midi: 84, isSharp: false, frequency: 1046.50 },
] as const;

export const MONIKA_MIN_MIDI = 65; // F4
export const MONIKA_MAX_MIDI = 84; // C6

const MIDI_TO_KEY_MAP = new Map<number, MonikaPianoKey>(
  MONIKA_PIANO_KEYS.map((k) => [k.midi, k])
);

const NOTE_NAME_TO_KEY_MAP = new Map<string, MonikaPianoKey>(
  MONIKA_PIANO_KEYS.map((k) => [k.note, k])
);

const CHAR_KEY_TO_PIANO_KEY = new Map<string, MonikaPianoKey>();
MONIKA_PIANO_KEYS.forEach((k) => {
  CHAR_KEY_TO_PIANO_KEY.set(k.key.toLowerCase(), k);
  CHAR_KEY_TO_PIANO_KEY.set(k.displayKey.toLowerCase(), k);
});

export function getMonikaKeyByMidi(midi: number): MonikaPianoKey | undefined {
  return MIDI_TO_KEY_MAP.get(midi);
}

export function getMonikaKeyByNoteName(noteName: string): MonikaPianoKey | undefined {
  return NOTE_NAME_TO_KEY_MAP.get(noteName.trim().toUpperCase());
}

export function getMonikaKeyByChar(char: string): MonikaPianoKey | undefined {
  return CHAR_KEY_TO_PIANO_KEY.get(char.toLowerCase());
}

const VALID_QWERTY_KEYS = new Set("q2w3e4rt6y7ui9o0p-[]".split(""));

const NOTE_NAME_NORM_MAP: Record<string, string> = {
  "F4": "F4", "F#4": "F4SH", "F4SH": "F4SH", "GB4": "F4SH",
  "G4": "G4", "G#4": "G4SH", "G4SH": "G4SH", "AB4": "G4SH",
  "A4": "A4", "A#4": "A4SH", "A4SH": "A4SH", "BB4": "A4SH",
  "B4": "B4", "C5": "C5",
  "C#5": "C5SH", "C5SH": "C5SH", "DB5": "C5SH",
  "D5": "D5", "D#5": "D5SH", "D5SH": "D5SH", "EB5": "D5SH",
  "E5": "E5", "F5": "F5",
  "F#5": "F5SH", "F5SH": "F5SH", "GB5": "F5SH",
  "G5": "G5", "G#5": "G5SH", "G5SH": "G5SH", "AB5": "G5SH",
  "A5": "A5", "A#5": "A5SH", "A5SH": "A5SH", "BB5": "A5SH",
  "B5": "B5", "C6": "C6",
};

export interface ParsedMonikaSongResult {
  success: boolean;
  songName: string;
  songArtist: string;
  phrases: MonikaPhrase[];
}

export function parseNoteToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  const clean = token.trim().toUpperCase();
  if (NOTE_NAME_NORM_MAP[clean]) return NOTE_NAME_NORM_MAP[clean];

  // Try note with or without octave, e.g. C, F#, Bb, C4, D#5
  const m = clean.match(/^([A-G])([#B♯♭]?)([0-9])?$/);
  if (m) {
    const noteLetter = m[1];
    const acc = m[2] === "#" || m[2] === "♯" ? 1 : (m[2] === "B" || m[2] === "♭" ? -1 : 0);
    const oct = m[3] !== undefined ? parseInt(m[3], 10) : 5;
    const baseClass = ({ "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 } as Record<string, number>)[noteLetter] || 0;
    const pitch = 12 * (oct + 1) + baseClass + acc;
    const foldedMidi = foldPitchToMonikaRange(pitch, 0, false);
    const k = getMonikaKeyByMidi(foldedMidi);
    if (k) return k.note;
  }

  // Try single key char
  if (clean.length === 1) {
    const k = getMonikaKeyByChar(clean);
    if (k) return k.note;
  }
  return null;
}

export function parseRawKeys(str: string): string[] {
  const clean = str.replace(/\s+/g, "");
  const notes: string[] = [];
  for (const c of clean) {
    const k = getMonikaKeyByChar(c);
    if (k) notes.push(k.note);
  }
  return notes;
}

export function cleanJsonInputString(raw: string): string {
  let str = raw.replace(/^\uFEFF/, "").trim();

  // Strip block comments /* ... */
  str = str.replace(/\/\*[\s\S]*?\*\//g, "").trim();

  // Strip line comments // ... outside of quotes
  str = str.replace(/("(?:\\.|[^"\\])*")|\/\/[^\r\n]*/g, (match, group1) => {
    if (group1) return group1;
    return "";
  });

  // Strip Python-style # comments outside of quotes
  str = str.replace(/("(?:\\.|[^"\\])*")|#[^\r\n]*/g, (match, group1) => {
    if (group1) return group1;
    return "";
  });

  // Replace Python True/False/None outside of quotes
  str = str.replace(/("(?:\\.|[^"\\])*")|\bTrue\b|\bFalse\b|\bNone\b/g, (match, group1) => {
    if (group1) return group1;
    if (match === "True") return "true";
    if (match === "False") return "false";
    if (match === "None") return "null";
    return match;
  });

  // Remove trailing commas before } or ]
  str = str.replace(/,\s*([\}\]])/g, "$1");

  return str.trim();
}

export function parseMonikaSongInput(
  rawInput: string,
  options?: {
    defaultNoteDelay?: number;
    phraseDelay?: number;
    existingLyrics?: string[];
  }
): {
  success: boolean;
  songName?: string;
  songArtist?: string;
  phrases: MonikaPhrase[];
} {
  const defaultDelay = options?.defaultNoteDelay ?? 0.32;
  const defaultPhraseDelay = options?.phraseDelay ?? 0.85;
  const existingLyrics = options?.existingLyrics ?? [];

  if (!rawInput || !rawInput.trim()) {
    return { success: false, songName: "Custom Piano Song", songArtist: "Monika", phrases: [] };
  }

  // 1. Check if input is JSON (or JSON array) after stripping comments / BOM / annotations
  const cleanedJson = cleanJsonInputString(rawInput);
  if (cleanedJson.startsWith("{") || cleanedJson.startsWith("[")) {
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(cleanedJson);
      } catch {
        // Fallback for single-quoted keys/strings: {'name': 'Song'} -> {"name": "Song"}
        const quotedJson = cleanedJson.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
        parsed = JSON.parse(quotedJson);
      }

      let songName = "Imported Song";
      let songArtist = "Monika";
      let rawList: any[] = [];

      if (Array.isArray(parsed)) {
        rawList = parsed;
      } else if (parsed && typeof parsed === "object") {
        if (typeof parsed.name === "string" && parsed.name.trim()) songName = parsed.name.trim();
        else if (typeof parsed.title === "string" && parsed.title.trim()) songName = parsed.title.trim();

        if (typeof parsed.author === "string" && parsed.author.trim()) songArtist = parsed.author.trim();
        else if (typeof parsed.artist === "string" && parsed.artist.trim()) songArtist = parsed.artist.trim();

        if (Array.isArray(parsed.pnm_list)) {
          rawList = parsed.pnm_list;
        } else if (Array.isArray(parsed.phrases)) {
          rawList = parsed.phrases;
        } else if (parsed.song && Array.isArray(parsed.song.pnm_list)) {
          rawList = parsed.song.pnm_list;
        }
      }

      if (rawList.length > 0) {
        const phrases: MonikaPhrase[] = rawList.map((p: any, idx: number) => {
          let notes: string[] = [];
          if (Array.isArray(p.notes)) {
            notes = p.notes.map((n: unknown) => parseNoteToken(String(n))).filter((n: string | null): n is string => Boolean(n));
          } else if (typeof p.keys === "string") {
            notes = parseRawKeys(p.keys);
          } else if (typeof p.notes === "string") {
            notes = p.notes.split(/\s+/).map((n: string) => parseNoteToken(n)).filter((n: string | null): n is string => Boolean(n));
          }

          const rawDelays = Array.isArray(p.noteDelays)
            ? p.noteDelays
            : Array.isArray(p._comment_note_delays_sec)
            ? p._comment_note_delays_sec
            : notes.map((_, i) => (i === notes.length - 1 ? Number((defaultDelay * 1.6).toFixed(3)) : defaultDelay));

          return {
            id: p.id || `phrase-${idx}-${Date.now()}`,
            text: p.text || existingLyrics[idx] || "",
            style: p.style || "monika_credits_text",
            notes,
            noteDelays: rawDelays,
            phraseDelay: typeof p.phraseDelay === "number" ? p.phraseDelay : defaultPhraseDelay,
            express: p.express || (idx % 2 === 0 ? "1eua" : "1eub"),
            postexpress: p.postexpress || "1eua",
            vis_timeout: typeof p.vis_timeout === "number" ? p.vis_timeout : 2.0,
            verse: p.verse !== undefined ? p.verse : (idx === 0 ? 0 : undefined),
            posttext: p.posttext !== undefined ? p.posttext : true,
          };
        }).filter((p) => p.notes.length > 0);

        if (phrases.length > 0) {
          return { success: true, songName, songArtist, phrases };
        }
      }
    } catch {
      // Not valid JSON, proceed to text parsing
    }
  }

  // 2. Parse as Plain Text / Cheat Sheet / Note Names / Raw Keys
  const trimmed = rawInput.trim();
  const lines = trimmed.split(/\r?\n/);
  const phrases: MonikaPhrase[] = [];
  let songName = "Custom Piano Song";
  let songArtist = "Monika";
  let currentLyrics = "";
  let pIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Detect metadata comments
    if (rawLine.startsWith("#") || rawLine.startsWith("//")) {
      const titleMatch = rawLine.match(/(?:title|name|song)[:=]\s*(.+)/i);
      if (titleMatch) songName = titleMatch[1].trim();
      const artistMatch = rawLine.match(/(?:artist|author|composer)[:=]\s*(.+)/i);
      if (artistMatch) songArtist = artistMatch[1].trim();
      continue;
    }

    // Section markers like [Verse 1]
    if (/^\[.*?\]$/.test(rawLine)) {
      continue;
    }

    // 1. Check for tokenized note names like "C5 D5 E5 F#4"
    const tokens = rawLine.split(/[\s,]+/);
    const tokenNotes = tokens.map((t) => parseNoteToken(t)).filter((n): n is string => Boolean(n));
    if (tokenNotes.length >= 2 || (tokens.length === 1 && tokenNotes.length === 1 && tokens[0].length >= 2)) {
      const phraseText = currentLyrics || existingLyrics[pIdx] || "";
      phrases.push({
        id: `phrase-keys-${pIdx}-${Date.now()}`,
        text: phraseText,
        style: "monika_credits_text",
        notes: tokenNotes,
        noteDelays: tokenNotes.map((_, idx) => (idx === tokenNotes.length - 1 ? Number((defaultDelay * 1.6).toFixed(3)) : defaultDelay)),
        phraseDelay: defaultPhraseDelay,
        express: pIdx % 2 === 0 ? "1eua" : "1eub",
        postexpress: "1eua",
        vis_timeout: 2.0,
        verse: pIdx === 0 ? 0 : undefined,
        posttext: true,
      });
      pIdx++;
      currentLyrics = "";
      continue;
    }

    // 2. Check for prefix: "Keys: 4 T 6 6" or "Notes: C5 D5 E5"
    const prefixMatch = rawLine.match(/^(?:keys?|notes?|piano|phrase\s*\d+|line\s*\d+)[:\s]+(.+)$/i);
    if (prefixMatch) {
      const raw = prefixMatch[1].trim();
      const notes = parseRawKeys(raw);
      if (notes.length > 0) {
        const phraseText = currentLyrics || existingLyrics[pIdx] || "";
        phrases.push({
          id: `phrase-keys-${pIdx}-${Date.now()}`,
          text: phraseText,
          style: "monika_credits_text",
          notes,
          noteDelays: notes.map((_, idx) => (idx === notes.length - 1 ? Number((defaultDelay * 1.6).toFixed(3)) : defaultDelay)),
          phraseDelay: defaultPhraseDelay,
          express: pIdx % 2 === 0 ? "1eua" : "1eub",
          postexpress: "1eua",
          vis_timeout: 2.0,
          verse: pIdx === 0 ? 0 : undefined,
          posttext: true,
        });
        pIdx++;
        currentLyrics = "";
        continue;
      }
    }

    // 3. Inline format: "Lyrics [4T667]"
    const inlineMatch = rawLine.match(/^(.*?)\s*[\[\(]([0-9a-zA-Z\s\-\[\]]+)[\]\)]$/);
    if (inlineMatch && inlineMatch[1].trim() && inlineMatch[2].trim()) {
      const notes = parseRawKeys(inlineMatch[2].trim());
      if (notes.length > 0) {
        phrases.push({
          id: `phrase-keys-${pIdx}-${Date.now()}`,
          text: inlineMatch[1].trim(),
          style: "monika_credits_text",
          notes,
          noteDelays: notes.map((_, idx) => (idx === notes.length - 1 ? Number((defaultDelay * 1.6).toFixed(3)) : defaultDelay)),
          phraseDelay: defaultPhraseDelay,
          express: pIdx % 2 === 0 ? "1eua" : "1eub",
          postexpress: "1eua",
          vis_timeout: 2.0,
          verse: pIdx === 0 ? 0 : undefined,
          posttext: true,
        });
        pIdx++;
        currentLyrics = "";
        continue;
      }
    }

    // 4. Check if line has non-piano characters -> Lyrics line
    const cleanChars = rawLine.replace(/\s+/g, "").toLowerCase();
    let invalidCount = 0;
    for (const c of cleanChars) {
      if (!VALID_QWERTY_KEYS.has(c)) invalidCount++;
    }
    if ((invalidCount / cleanChars.length) > 0.15) {
      currentLyrics = rawLine;
      continue;
    }

    // 5. Otherwise parse as pure QWERTY keys
    const notes = parseRawKeys(cleanChars);
    if (notes.length > 0) {
      const phraseText = currentLyrics || existingLyrics[pIdx] || "";
      phrases.push({
        id: `phrase-keys-${pIdx}-${Date.now()}`,
        text: phraseText,
        style: "monika_credits_text",
        notes,
        noteDelays: notes.map((_, idx) => (idx === notes.length - 1 ? Number((defaultDelay * 1.6).toFixed(3)) : defaultDelay)),
        phraseDelay: defaultPhraseDelay,
        express: pIdx % 2 === 0 ? "1eua" : "1eub",
        postexpress: "1eua",
        vis_timeout: 2.0,
        verse: pIdx === 0 ? 0 : undefined,
        posttext: true,
      });
      pIdx++;
      currentLyrics = "";
    } else {
      currentLyrics = rawLine;
    }
  }

  return {
    success: phrases.length > 0,
    songName,
    songArtist,
    phrases,
  };
}

export function parseRawKeyCharactersToPhrases(
  rawText: string,
  options?: {
    defaultNoteDelay?: number;
    phraseDelay?: number;
    existingLyrics?: string[];
  }
): MonikaPhrase[] {
  const res = parseMonikaSongInput(rawText, options);
  return res.phrases;
}

/**
 * Modulo Octave Folding:
 * Folds any MIDI pitch (0-127) into Monika's 20-note range [65, 84] (F4 to C6).
 * Pitch classes:
 * 0 (C) -> 72 (C5) or 84 (C6)
 * 1 (C#) -> 73 (C5SH)
 * 2 (D) -> 74 (D5)
 * 3 (D#) -> 75 (D5SH)
 * 4 (E) -> 76 (E5)
 * 5 (F) -> 65 (F4) or 77 (F5)
 * 6 (F#) -> 66 (F4SH) or 78 (F5SH)
 * 7 (G) -> 67 (G4) or 79 (G5)
 * 8 (G#) -> 68 (G4SH) or 80 (G5SH)
 * 9 (A) -> 69 (A4) or 81 (A5)
 * 10 (A#) -> 70 (A4SH) or 82 (A5SH)
 * 11 (B) -> 71 (B4) or 83 (B5)
 */
export function foldPitchToMonikaRange(
  rawMidiPitch: number,
  transposeSemitones = 0,
  preferHigherOctave = false
): number {
  let pitch = rawMidiPitch + transposeSemitones;

  // If already within Monika's range, keep it directly
  if (pitch >= MONIKA_MIN_MIDI && pitch <= MONIKA_MAX_MIDI) {
    return pitch;
  }

  // Octave shift using modulo math
  // Shift by 12 semitones until in range [65, 84]
  while (pitch < MONIKA_MIN_MIDI) {
    pitch += 12;
  }
  while (pitch > MONIKA_MAX_MIDI) {
    pitch -= 12;
  }

  // If pitch is still outside because of edge overflow, clamp to valid range
  if (pitch < MONIKA_MIN_MIDI) {
    // For pitch classes 0..4 (C, C#, D, D#, E), they map into 72..76
    const pc = ((pitch % 12) + 12) % 12;
    if (pc >= 0 && pc <= 4) {
      pitch = 72 + pc;
    } else {
      pitch = 65 + (pc - 5);
    }
  }

  // For pitch classes that exist in two octaves (C: 72/84, F..B: 65..71 and 77..83)
  if (preferHigherOctave && pitch + 12 <= MONIKA_MAX_MIDI) {
    pitch += 12;
  }

  return Math.min(MONIKA_MAX_MIDI, Math.max(MONIKA_MIN_MIDI, pitch));
}

export interface MonikaPhrase {
  id?: string;
  text: string;
  style: string;
  notes: string[]; // MAS note strings e.g. ["D5", "C5SH", "B4"]
  postnotes?: string[];
  express?: string;
  postexpress?: string;
  vis_timeout?: number;
  ev_timeout?: number;
  verse?: number;
  posttext?: boolean;
  // Delay Timing Metadata (in seconds)
  noteDelays?: number[]; // delay in seconds before each subsequent note
  phraseDelay?: number; // pause in seconds before the next phrase starts
  bpm?: number; // tempo at this phrase
  _comment_note_delays_sec?: number[];
  _comment_phrase_pause_sec?: number;
  excludeFromGroupSync?: boolean; // ignore this phrase during group timing updates
}

export interface MonikaPianoSong {
  name: string;
  verse_list: number[];
  pnm_list: MonikaPhrase[];
}

// MAS Timing Thresholds
export const MAS_MAX_RECOMMENDED_NOTE_DELAY = 3.0; // Seconds before Monika gets bored
export const MAS_CRITICAL_NOTE_DELAY = 5.0; // Seconds where MAS triggers escape / timeout

export interface DelayAnalysisResult {
  hasTimingData: boolean;
  overallStatus: "good" | "warning" | "danger";
  maxNoteDelay: number;
  maxPhraseDelay: number;
  avgNoteDelay: number;
  warnings: string[];
}

/**
 * Analyzes MIDI delay times across all phrases and checks against MAS timeout thresholds.
 */
export function analyzeSongDelays(song: MonikaPianoSong): DelayAnalysisResult {
  const warnings: string[] = [];
  let maxNoteDelay = 0;
  let maxPhraseDelay = 0;
  let totalDelay = 0;
  let delayCount = 0;
  let hasTiming = false;

  song.pnm_list.forEach((phrase, phraseIdx) => {
    // Check note delays
    if (Array.isArray(phrase.noteDelays) && phrase.noteDelays.length > 0) {
      hasTiming = true;
      phrase.noteDelays.forEach((delay, noteIdx) => {
        if (typeof delay === "number" && delay >= 0) {
          totalDelay += delay;
          delayCount += 1;
          if (delay > maxNoteDelay) maxNoteDelay = delay;

          const currentNote = phrase.notes[noteIdx] || `Note ${noteIdx + 1}`;
          const nextNote = phrase.notes[noteIdx + 1] || "next note";

          if (delay >= MAS_CRITICAL_NOTE_DELAY) {
            warnings.push(
              `⚠️ CRITICAL TIMEOUT: Phrase ${phraseIdx + 1} ("${phrase.text.slice(0, 25)}...") has a delay of ${delay.toFixed(2)}s between ${currentNote} and ${nextNote}. In MAS, delays > 5.0s cause Monika to trigger an escape / practice timeout!`
            );
          } else if (delay >= MAS_MAX_RECOMMENDED_NOTE_DELAY) {
            warnings.push(
              `⚠️ Slow Note Delay: Phrase ${phraseIdx + 1} has a delay of ${delay.toFixed(2)}s between ${currentNote} and ${nextNote}. Monika might find this too slow (recommended < 3.0s).`
            );
          }
        }
      });
    }

    // Check phrase delay
    if (typeof phrase.phraseDelay === "number" && phrase.phraseDelay > 0) {
      hasTiming = true;
      if (phrase.phraseDelay > maxPhraseDelay) maxPhraseDelay = phrase.phraseDelay;

      if (phrase.phraseDelay >= MAS_CRITICAL_NOTE_DELAY) {
        warnings.push(
          `⚠️ Long Pause: A pause of ${phrase.phraseDelay.toFixed(2)}s after Phrase ${phraseIdx + 1} ("${phrase.text.slice(0, 25)}...") exceeds 5.0s and may cause MAS to reset the minigame.`
        );
      }
    }
  });

  const avgNoteDelay = delayCount > 0 ? totalDelay / delayCount : 0;
  let overallStatus: "good" | "warning" | "danger" = "good";
  if (maxNoteDelay >= MAS_CRITICAL_NOTE_DELAY || maxPhraseDelay >= MAS_CRITICAL_NOTE_DELAY) {
    overallStatus = "danger";
  } else if (maxNoteDelay >= MAS_MAX_RECOMMENDED_NOTE_DELAY || warnings.length > 0) {
    overallStatus = "warning";
  }

  return {
    hasTimingData: hasTiming,
    overallStatus,
    maxNoteDelay,
    maxPhraseDelay,
    avgNoteDelay,
    warnings,
  };
}

export const MONIKA_EXPRESSION_PRESETS = [
  { code: "1eua", label: "Happy / Smile (1eua)" },
  { code: "1eub", label: "Singing Open Mouth (1eub)" },
  { code: "1hua", label: "Gentle Smile (1hua)" },
  { code: "1hub", label: "Cheerfully Open (1hub)" },
  { code: "1sua", label: "Focused / Soft (1sua)" },
  { code: "1sub", label: "Singing Soft (1sub)" },
  { code: "2eua", label: "Attentive Smile (2eua)" },
  { code: "2eub", label: "Singing Leaning (2eub)" },
  { code: "3eua", label: "Warm Gaze (3eua)" },
  { code: "3eub", label: "Emotional Singing (3eub)" },
  { code: "4eua", label: "Sweet Smile (4eua)" },
  { code: "4eub", label: "Passionate Singing (4eub)" },
];

/**
 * Generate MAS Standard JSON (Preserve Delays):
 * Standard valid JSON format preserving _comment_note_delays_sec and _comment_phrase_pause_sec.
 */
export function generateStandardMonikaPianoJson(song: MonikaPianoSong): string {
  // Compute unique sorted verse indices
  const verseIndices = Array.from(
    new Set(
      song.pnm_list
        .map((p, idx) => (p.verse !== undefined ? idx : null))
        .filter((v): v is number => v !== null)
    )
  ).sort((a, b) => a - b);

  // Default to verse [0] if none specified
  const finalVerseList = verseIndices.length > 0 ? verseIndices : [0];

  const payload = {
    name: song.name.trim() || "Untitled Song",
    verse_list: finalVerseList,
    pnm_list: song.pnm_list.map((phrase, idx) => {
      const item: Record<string, unknown> = {
        text: phrase.text || "",
        style: phrase.style || "monika_credits_text",
        notes: phrase.notes || [],
      };

      if (phrase.postnotes && phrase.postnotes.length > 0) {
        item.postnotes = phrase.postnotes;
      }
      if (phrase.express) {
        item.express = phrase.express;
      }
      if (phrase.postexpress) {
        item.postexpress = phrase.postexpress;
      }
      if (typeof phrase.vis_timeout === "number" && phrase.vis_timeout > 0) {
        item.vis_timeout = phrase.vis_timeout;
      }
      if (typeof phrase.ev_timeout === "number" && phrase.ev_timeout > 0) {
        item.ev_timeout = phrase.ev_timeout;
      }

      // If this phrase is marked as a verse start, record its verse index
      if (finalVerseList.includes(idx)) {
        item.verse = idx;
      }

      if (phrase.posttext !== undefined) {
        item.posttext = phrase.posttext;
      }

      // Commented timing delays in JSON property for persistent MAS referencing
      if (Array.isArray(phrase.noteDelays) && phrase.noteDelays.length > 0) {
        item._comment_note_delays_sec = phrase.noteDelays.map((d) => Number(d.toFixed(3)));
      }
      if (typeof phrase.phraseDelay === "number" && phrase.phraseDelay > 0) {
        item._comment_phrase_pause_sec = Number(phrase.phraseDelay.toFixed(3));
      }

      return item;
    }),
  };

  return JSON.stringify(payload, null, 2);
}

export const generateMonikaPianoJson = generateStandardMonikaPianoJson;

/**
 * Generate MAS Compact JSON (Necessary for MAS only):
 * Pure official MAS minigame JSON stripped of all delay comments and extra metadata.
 */
export function generateCompactMonikaPianoJson(song: MonikaPianoSong): string {
  const verseIndices = Array.from(
    new Set(
      song.pnm_list
        .map((p, idx) => (p.verse !== undefined ? idx : null))
        .filter((v): v is number => v !== null)
    )
  ).sort((a, b) => a - b);

  const finalVerseList = verseIndices.length > 0 ? verseIndices : [0];

  const payload = {
    name: song.name.trim() || "Untitled Song",
    verse_list: finalVerseList,
    pnm_list: song.pnm_list.map((phrase, idx) => {
      const item: Record<string, unknown> = {
        text: phrase.text || "",
        style: phrase.style || "monika_credits_text",
        notes: phrase.notes || [],
      };

      if (phrase.postnotes && phrase.postnotes.length > 0) {
        item.postnotes = phrase.postnotes;
      }
      if (phrase.express) {
        item.express = phrase.express;
      }
      if (phrase.postexpress) {
        item.postexpress = phrase.postexpress;
      }
      if (typeof phrase.vis_timeout === "number" && phrase.vis_timeout > 0) {
        item.vis_timeout = phrase.vis_timeout;
      }
      if (typeof phrase.ev_timeout === "number" && phrase.ev_timeout > 0) {
        item.ev_timeout = phrase.ev_timeout;
      }
      if (finalVerseList.includes(idx)) {
        item.verse = idx;
      }
      if (phrase.posttext !== undefined) {
        item.posttext = phrase.posttext;
      }

      return item;
    }),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Generate Annotated JSON with formatted inline line comments detailing MIDI delay times,
 * QWERTY keyboard characters, studio metadata, and MAS timeout warnings.
 */
export function generateAnnotatedMonikaPianoJson(song: MonikaPianoSong): string {
  const analysis = analyzeSongDelays(song);
  const totalNotes = song.pnm_list.reduce((acc, p) => acc + (p.notes?.length || 0), 0);

  // Calculate total estimated duration in seconds
  let totalDurationSec = 0;
  song.pnm_list.forEach((phrase) => {
    if (Array.isArray(phrase.noteDelays) && phrase.noteDelays.length > 0) {
      totalDurationSec += phrase.noteDelays.reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
    } else {
      totalDurationSec += (phrase.notes?.length || 0) * 0.28;
    }
    if (typeof phrase.phraseDelay === "number" && phrase.phraseDelay > 0) {
      totalDurationSec += phrase.phraseDelay;
    }
  });

  const lines: string[] = [];

  lines.push("/*");
  lines.push(` * Monika Piano Studio Master: ${song.name}`);
  lines.push(" * Piano Studio Annotation Version: 1");
  lines.push(` * Project Stats: ${song.pnm_list.length} Phrases | ${totalNotes} Notes | Est. Duration: ~${totalDurationSec.toFixed(1)}s`);
  if (analysis.hasTimingData) {
    lines.push(` * Timing Stats: Avg Delay: ${analysis.avgNoteDelay.toFixed(2)}s | Max Delay: ${analysis.maxNoteDelay.toFixed(2)}s | Max Pause: ${analysis.maxPhraseDelay.toFixed(2)}s`);
    if (analysis.overallStatus === "danger") {
      lines.push(" * ⚠️ MAS TIMEOUT WARNING: Contains delays >= 5.0s which will trigger Monika's escape/timeout in MAS!");
    } else if (analysis.overallStatus === "warning") {
      lines.push(" * ⚠️ MAS PACING NOTICE: Contains delays >= 3.0s (slower than standard MAS piano pace).");
    } else {
      lines.push(" * Timing Status: All delays within optimal Monika pace (< 3.0s) ✅");
    }
  }
  lines.push(" */");
  lines.push("{");
  lines.push(`  "name": ${JSON.stringify(song.name)},`);

  // Studio Metadata Object
  lines.push('  "_studio_metadata": {');
  lines.push('    "annotation_version": 1, // Schema version for future compatibility');
  lines.push(`    "total_phrases": ${song.pnm_list.length}, // Total phrase count in song`);
  lines.push(`    "total_notes": ${totalNotes}, // Total playable notes count`);
  lines.push(`    "estimated_duration_sec": ${Number(totalDurationSec.toFixed(1))}, // Estimated total playthrough duration in seconds`);
  lines.push('    "timing_profile": {');
  lines.push(`      "avg_note_delay_sec": ${Number(analysis.avgNoteDelay.toFixed(3))}, // Average delay between consecutive notes`);
  lines.push(`      "max_note_delay_sec": ${Number(analysis.maxNoteDelay.toFixed(3))}, // Longest single note delay`);
  lines.push(`      "max_phrase_pause_sec": ${Number(analysis.maxPhraseDelay.toFixed(3))}, // Longest pause between phrases`);
  lines.push(`      "pacing_status": ${JSON.stringify(analysis.overallStatus)} // MAS rhythm pace rating`);
  lines.push("    },");
  lines.push(`    "exported_at": ${JSON.stringify(new Date().toISOString())}`);
  lines.push("  },");

  const verseIndices = Array.from(
    new Set(
      song.pnm_list
        .map((p, idx) => (p.verse !== undefined ? idx : null))
        .filter((v): v is number => v !== null)
    )
  ).sort((a, b) => a - b);
  const finalVerseList = verseIndices.length > 0 ? verseIndices : [0];

  lines.push(`  "verse_list": ${JSON.stringify(finalVerseList)}, // Starting phrase indices for each verse/checkpoint`);
  lines.push('  "pnm_list": [');

  const documentedKeys = new Set<string>();
  const commentOnce = (key: string, commentText: string): string => {
    if (!documentedKeys.has(key)) {
      documentedKeys.add(key);
      return ` // ${commentText}`;
    }
    return "";
  };

  song.pnm_list.forEach((phrase, idx) => {
    const isLastPhrase = idx === song.pnm_list.length - 1;
    const noteDelays = phrase.noteDelays || [];
    const avgDelay = noteDelays.length > 0 ? noteDelays.reduce((a, b) => a + b, 0) / noteDelays.length : null;


    lines.push(`    // --- Phrase ${idx + 1} ---`);
    if (avgDelay !== null) {
      const delayStatus = avgDelay >= 5.0 ? "⚠️ DANGER (>5s timeout!)" : avgDelay >= 3.0 ? "⚠️ SLOW (>3s)" : "Optimal";
      const pauseStr = typeof phrase.phraseDelay === "number" ? ` | Pause after: ${phrase.phraseDelay.toFixed(2)}s` : "";
      lines.push(`    // Timing: Avg ${avgDelay.toFixed(2)}s (${delayStatus})${pauseStr}`);
    }

    // Build key sequence summary for notes array opener
    const keySeq = phrase.notes.map((n) => {
      const k = getMonikaKeyByNoteName(n);
      return k ? k.displayKey : "?";
    }).join(" ");

    const expressionPreset = MONIKA_EXPRESSION_PRESETS.find((e) => e.code === phrase.express);
    const postexpressionPreset = MONIKA_EXPRESSION_PRESETS.find((e) => e.code === phrase.postexpress);

    lines.push("    {");
    lines.push(`      "text": ${JSON.stringify(phrase.text)},`);
    lines.push(`      "style": ${JSON.stringify(phrase.style || "monika_credits_text")},${commentOnce("style", "Ren'Py text style — controls font, size, colour")}`);

    // notes opener includes the full key sequence so you can read the phrase at a glance
    lines.push(`      "notes": [ // ${keySeq}`);
    phrase.notes.forEach((n, nIdx) => {
      const isLastNote = nIdx === phrase.notes.length - 1;
      const d = noteDelays[nIdx];
      const keyObj = getMonikaKeyByNoteName(n);
      const keyTag = keyObj ? `[Key: ${keyObj.displayKey}] ` : "";
      let delayComment = "";
      if (typeof d === "number") {
        if (d >= 5.0) {
          delayComment = ` // ${keyTag}⚠️ ${d.toFixed(2)}s — MAS TIMEOUT!`;
        } else if (d >= 3.0) {
          delayComment = ` // ${keyTag}⚠️ ${d.toFixed(2)}s — pacing warning`;
        } else {
          delayComment = ` // ${keyTag}${d.toFixed(2)}s`;
        }
      } else if (keyTag) {
        delayComment = ` // ${keyTag}`;
      }
      lines.push(`        ${JSON.stringify(n)}${isLastNote ? "" : ","}${delayComment}`);
    });
    lines.push("      ],");

    if (phrase.postnotes && phrase.postnotes.length > 0) {
      lines.push(`      "postnotes": ${JSON.stringify(phrase.postnotes)},${commentOnce("postnotes", "Extra notes played softly after the main phrase")}`);
    }
    if (phrase.express) {
      // Always show the human-readable label — this code is opaque without it
      const exprLabel = expressionPreset ? expressionPreset.label : phrase.express;
      lines.push(`      "express": ${JSON.stringify(phrase.express)}, // ${exprLabel}`);
    }
    if (phrase.postexpress) {
      const postExprLabel = postexpressionPreset ? postexpressionPreset.label : phrase.postexpress;
      lines.push(`      "postexpress": ${JSON.stringify(phrase.postexpress)}, // ${postExprLabel}`);
    }
    if (typeof phrase.vis_timeout === "number" && phrase.vis_timeout > 0) {
      lines.push(`      "vis_timeout": ${phrase.vis_timeout},${commentOnce("vis_timeout", `Lyric fades after ${phrase.vis_timeout}s of silence`)}`);
    }
    if (typeof phrase.ev_timeout === "number" && phrase.ev_timeout > 0) {
      lines.push(`      "ev_timeout": ${phrase.ev_timeout},${commentOnce("ev_timeout", `MAS auto-skips this phrase if idle for ${phrase.ev_timeout}s`)}`);
    }
    if (finalVerseList.includes(idx)) {
      lines.push(`      "verse": ${idx},${commentOnce("verse", "Players can restart the song from this phrase")}`);
    }
    if (phrase.posttext !== undefined) {
      lines.push(`      "posttext": ${phrase.posttext},${commentOnce("posttext", "Keep subtitle visible during the silence after notes")}`);
    }

    if (noteDelays.length > 0) {
      lines.push(`      "_comment_note_delays_sec": ${JSON.stringify(noteDelays.map((d) => Number(d.toFixed(3))))},${commentOnce("_comment_note_delays_sec", "Studio timing data — stripped on MAS export")}`);
    }
    if (typeof phrase.phraseDelay === "number" && phrase.phraseDelay > 0) {
      lines.push(`      "_comment_phrase_pause_sec": ${Number(phrase.phraseDelay.toFixed(3))},${commentOnce("_comment_phrase_pause_sec", "Silence before next phrase begins")}`);
    }

    // Remove trailing comma from last property in phrase object if needed
    const lastLineIdx = lines.length - 1;
    if (lines[lastLineIdx].endsWith(",")) {
      lines[lastLineIdx] = lines[lastLineIdx].slice(0, -1);
    }

    lines.push(`    }${isLastPhrase ? "" : ","}`);
  });

  lines.push("  ]");
  lines.push("}");

  return lines.join("\n");
}

/**
 * Generate formatted Lyrics + Default Keys text.
 * Example format:
 * I'm so glad you made time to see me
 * 2 U Y 6 6 6 6 6 Y
 *
 * How's life, Tell me how's your fam'ly
 * U Y 6 6 6 6 6 Y
 */
export function generateLyricsKeysText(song: MonikaPianoSong): string {
  const blocks: string[] = [];

  song.pnm_list.forEach((phrase) => {
    const textLine = (phrase.text || "").trim();
    const keyChars = (phrase.notes || []).map((noteStr) => {
      const keyObj = getMonikaKeyByNoteName(noteStr);
      return keyObj ? keyObj.displayKey : noteStr;
    });

    const keysLine = keyChars.join(" ");

    if (textLine && keysLine) {
      blocks.push(`${textLine}\n${keysLine}`);
    } else if (textLine) {
      blocks.push(textLine);
    } else if (keysLine) {
      blocks.push(keysLine);
    }
  });

  return blocks.join("\n\n");
}

/**
 * Validate a Monika Piano JSON structure against MAS requirements.
 */
export function validateMonikaPianoJson(jsonString: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const obj = JSON.parse(jsonString);

    if (typeof obj !== "object" || obj === null) {
      return { valid: false, errors: ["Root JSON must be an object."], warnings: [] };
    }

    if (!obj.name || typeof obj.name !== "string" || !obj.name.trim()) {
      errors.push("Missing or invalid 'name' property.");
    }

    if (!Array.isArray(obj.verse_list)) {
      errors.push("Missing or invalid 'verse_list' property (must be an array of integers).");
    }

    if (!Array.isArray(obj.pnm_list) || obj.pnm_list.length === 0) {
      errors.push("Missing or empty 'pnm_list' property (must contain at least one note phrase).");
    } else {
      obj.pnm_list.forEach((phrase: unknown, idx: number) => {
        if (typeof phrase !== "object" || phrase === null) {
          errors.push(`pnm_list[${idx}] must be an object.`);
          return;
        }

        const p = phrase as Record<string, unknown>;

        if (typeof p.text !== "string") {
          errors.push(`pnm_list[${idx}].text must be a string.`);
        }

        if (typeof p.style !== "string") {
          errors.push(`pnm_list[${idx}].style must be a string.`);
        }

        if (!Array.isArray(p.notes) || p.notes.length === 0) {
          warnings.push(`pnm_list[${idx}].notes is empty.`);
        } else {
          p.notes.forEach((noteName: unknown, noteIdx: number) => {
            if (typeof noteName !== "string" || !NOTE_NAME_TO_KEY_MAP.has(noteName.trim().toUpperCase())) {
              errors.push(
                `pnm_list[${idx}].notes[${noteIdx}] '${String(noteName)}' is not a valid Monika piano note (allowed: F4 to C6).`
              );
            }
          });
        }

        // Delay checking if present in parsed JSON
        if (Array.isArray(p._comment_note_delays_sec)) {
          p._comment_note_delays_sec.forEach((d: unknown, nIdx: number) => {
            if (typeof d === "number") {
              if (d >= MAS_CRITICAL_NOTE_DELAY) {
                warnings.push(
                  `⚠️ Phrase ${idx + 1} note ${nIdx + 1} delay of ${d.toFixed(2)}s is too slow for Monika and will trigger an MAS timeout!`
                );
              } else if (d >= MAS_MAX_RECOMMENDED_NOTE_DELAY) {
                warnings.push(
                  `⚠️ Phrase ${idx + 1} note ${nIdx + 1} delay of ${d.toFixed(2)}s is slow (recommended < 3.0s).`
                );
              }
            }
          });
        }
      });
    }
  } catch (err) {
    errors.push(`JSON syntax error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Postpiano Dialogue & Expression Generator Support
// ---------------------------------------------------------------------------

export interface PostpianoDialogueLine {
  id: string;
  speaker: string; // usually "m"
  expression?: string; // e.g. "1sua", "7eua"
  text: string;
}

export interface PostpianoMenuChoice {
  id: string;
  choiceText: string;
  lines: PostpianoDialogueLine[];
}

export interface PostpianoScriptConfig {
  prefix?: string; // default "jmcustom"
  songSlug?: string; // e.g. "backtodecember"
  songName?: string;
  songArtist?: string;
  dialoguePrefix?: string;
  fc_label?: string;
  preLines: PostpianoDialogueLine[];
  perfectLines: PostpianoDialogueLine[];
  perfectMenuPrompt?: string;
  perfectChoices?: PostpianoMenuChoice[];
  perfectPostMenuLines?: PostpianoDialogueLine[];
  almostLines?: PostpianoDialogueLine[];
  escapeLines?: PostpianoDialogueLine[];
  includeCommonFallbacks?: boolean;
}

export const MONIKA_POSES = [
  { code: "1", label: "1 - Rest / Hands on desk" },
  { code: "2", label: "2 - Pointing / Thinking" },
  { code: "3", label: "3 - Leaning forward" },
  { code: "4", label: "4 - Crossed arms" },
  { code: "5", label: "5 - Chin on hand" },
  { code: "6", label: "6 - Hand on chest / heart" },
  { code: "7", label: "7 - Hair twirl / playful" },
];

export const MONIKA_EYES = [
  { code: "e", label: "e - Normal / Open" },
  { code: "w", label: "w - Wide / Surprised" },
  { code: "s", label: "s - Sparkly / Happy" },
  { code: "d", label: "d - Downcast / Shy" },
  { code: "t", label: "t - Half-closed / Smug" },
  { code: "h", label: "h - Wink / Closed smiling" },
];

export const MONIKA_BROWS = [
  { code: "u", label: "u - Up / Normal friendly" },
  { code: "d", label: "d - Down / Sad knit" },
  { code: "f", label: "f - Furrowed / Stern" },
  { code: "m", label: "m - Mid / Calm" },
];

export const MONIKA_MOUTHS = [
  { code: "a", label: "a - Smile / Closed" },
  { code: "b", label: "b - Open / Speaking / Singing" },
  { code: "c", label: "c - Neutral / Pout" },
  { code: "d", label: "d - Open sad / Gasp" },
];

export function generatePostpianoRpy(config: PostpianoScriptConfig): string {
  const prefix = config.prefix?.trim() || "jmcustom";
  const slug = config.songSlug?.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "song";
  const blocks: string[] = [];

  // Common fallbacks if enabled
  if (config.includeCommonFallbacks) {
    blocks.push(`# Custom Postpiano Dialogue Common Fallbacks
# To be used by all song JSONs with custom dialogue unless the song has one of its own.
label ${prefix}_common_complete:
    m 1wua "That was great, [player]."
    m 7eub "Just a little more and you'll be able to perfect it."
    m 5euc "As much as I want to talk about what I think of this song now, I don't want my thoughts to interfere with you practicing it."
    m 5eub "So we can talk about it once you played the song to me without any mistakes."
    m 5eua "I hope that's okay with you."
    return

label ${prefix}_common_escape:
    m 1euc "..."
    m 1eua "Aww, At least you tried."
    m 5eud "I really wanted to tell you how I feel about this song, but I guess I'll just have to do it when you played it better; maybe next time."
    m 1eub "Actually, consider it your goal, okay? But don't worry if it takes time. I'm confident that you'll be able to do it."
    return

label ${prefix}_common_almost:
    m 1wub "That was great."
    m 4eua "Just more practice and you will perfect it sooner."
    m 1eua "I'll be rooting for it. No rush though."
    m 1eua "Take your time."
    return`);
  }

  // Pre-song label
  if (config.preLines && config.preLines.length > 0) {
    const lines = config.preLines
      .map((l) => `    ${l.speaker || "m"} ${l.expression ? l.expression + " " : ""}"${l.text.replace(/"/g, '\\"')}"`)
      .join("\n");
    blocks.push(`# ${config.songSlug} Pre-Song
label ${prefix}_${slug}_pre:
${lines}
    return`);
  }

  // Perfect / Full Combo label
  const perfectBody: string[] = [];
  (config.perfectLines || []).forEach((l) => {
    perfectBody.push(`    ${l.speaker || "m"} ${l.expression ? l.expression + " " : ""}"${l.text.replace(/"/g, '\\"')}"`);
  });

  if (config.perfectChoices && config.perfectChoices.length > 0) {
    perfectBody.push("");
    perfectBody.push("    menu:");
    if (config.perfectMenuPrompt) {
      perfectBody.push(`        m "${config.perfectMenuPrompt.replace(/"/g, '\\"')}"\n`);
    }
    config.perfectChoices.forEach((choice) => {
      perfectBody.push(`        "${choice.choiceText.replace(/"/g, '\\"')}":`);
      choice.lines.forEach((l) => {
        perfectBody.push(`            ${l.speaker || "m"} ${l.expression ? l.expression + " " : ""}"${l.text.replace(/"/g, '\\"')}"`);
      });
      perfectBody.push("");
    });
  }

  if (config.perfectPostMenuLines && config.perfectPostMenuLines.length > 0) {
    config.perfectPostMenuLines.forEach((l) => {
      perfectBody.push(`    ${l.speaker || "m"} ${l.expression ? l.expression + " " : ""}"${l.text.replace(/"/g, '\\"')}"`);
    });
  }

  if (perfectBody.length > 0) {
    blocks.push(`# ${config.songSlug} Perfect Full Combo
label ${prefix}_${slug}_perfect:
${perfectBody.join("\n")}
    return`);
  }

  // Optional Almost label
  if (config.almostLines && config.almostLines.length > 0) {
    const lines = config.almostLines
      .map((l) => `    ${l.speaker || "m"} ${l.expression ? l.expression + " " : ""}"${l.text.replace(/"/g, '\\"')}"`)
      .join("\n");
    blocks.push(`# ${config.songSlug} Almost
label ${prefix}_${slug}_almost:
${lines}
    return`);
  }

  // Optional Escape label
  if (config.escapeLines && config.escapeLines.length > 0) {
    const lines = config.escapeLines
      .map((l) => `    ${l.speaker || "m"} ${l.expression ? l.expression + " " : ""}"${l.text.replace(/"/g, '\\"')}"`)
      .join("\n");
    blocks.push(`# ${config.songSlug} Escape / Quit Early
label ${prefix}_${slug}_escape:
${lines}
    return`);
  }

  return blocks.join("\n\n");
}

