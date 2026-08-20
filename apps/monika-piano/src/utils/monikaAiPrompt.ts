// AI Prompt Generator and Shorthand Parser for Monika Piano Maker.
// Enables copying structured prompts to ChatGPT/Claude and parsing shorthand response code directly into MAS format.

import {
  getMonikaKeyByNoteName,
  type MonikaPhrase,
  type MonikaPianoSong,
  type PostpianoDialogueLine,
  type PostpianoMenuChoice,
  type PostpianoScriptConfig,
} from "./monikaPiano";

export function normalizeMonikaNoteName(raw: string): string {
  const clean = raw.trim().toUpperCase();
  return clean.replace("#", "SH").replace("S", "SH");
}

export interface ParsedAiShorthandResult {
  success: boolean;
  songName: string;
  artist: string;
  dialoguePrefix: string;
  phrases: MonikaPhrase[];
  verseList: number[];
  preLines: PostpianoDialogueLine[];
  perfectLines: PostpianoDialogueLine[];
  almostLines: PostpianoDialogueLine[];
  escapeLines: PostpianoDialogueLine[];
  menuPrompt?: string;
  menuChoices?: PostpianoMenuChoice[];
  warnings: string[];
  rawParsedCount: number;
  song?: MonikaPianoSong;
  dialogue?: PostpianoScriptConfig;
}

/**
 * Builds a prompt template to copy into any external AI model.
 * Completely AI-agnostic and structured for precision music transcription and expressive dialogue.
 */
export function generateExternalAiPrompt(
  songTitle = "",
  lyrics = "",
  options?: { tone?: string; difficulty?: string; mode?: "full" | "dialogue_only"; artist?: string; prefix?: string }
): string {
  const sampleTitle = songTitle.trim() || "Your Song Title";
  const sampleArtist = options?.artist?.trim() || "Custom Artist";
  const prefix = options?.prefix?.trim() || "jmcustom";
  const sampleLyrics =
    lyrics.trim() ||
    `[Paste the lyrics or melody syllables for ${sampleTitle} here]`;

  const tone = options?.tone || "Sweet & Romantic";
  const difficulty = options?.difficulty || "Standard Melodic";

  if (options?.mode === "dialogue_only") {
    return generateMonikaDialogueAiPrompt(sampleTitle, sampleArtist, sampleLyrics, { tone, prefix });
  }

  return `Transcribe the vocal melody, lyrics, and expressive Monika dialogue for the song "${sampleTitle}" (${sampleArtist}) into authentic Monika Piano Shorthand format for Monika After Story (DDLC mod).

### 1. PIANO KEY RANGE (F4 to C6 ONLY)
Monika's piano has EXACTLY 20 keys spanning from F4 to C6. Every melody note MUST use one of these pitches:
- White Keys (12): F4, G4, A4, B4, C5, D5, E5, F5, G5, A5, B5, C6
- Sharp/Black Keys (8): F4SH, G4SH, A4SH, C5SH, D5SH, F5SH, G5SH, A5SH
  (You can also write standard sharps like C#5, F#4, G#5 or flats like Db5, Eb5).
- IMPORTANT: If the original song melody is too low (below F4) or too high (above C6), transpose the entire song to a key that fits comfortably between F4 and C6 (e.g. C Major, F Major, or G Major).

### 2. FULL SONG COMPLETENESS (NO SHORTCUTS OR TRUNCATION)
- Transcribe the ENTIRE, FULL SONG from beginning to end (all verses, chorus, bridge, and outro, or all thematic motifs/sections if instrumental).
- Do NOT abbreviate, do NOT stop after just 2 or 4 sample lines, and do NOT write "..." or "[rest of song]".
- Provide the complete set of playable phrases in [PHRASES] so the user can play the full song in Monika After Story.

### 3. MANDATORY NOTE DELAYS & RHYTHMIC TIMINGS (${difficulty})
- Every single note MUST have its delay in seconds in parentheses: \`Note(delay_seconds)\`.
- NEVER output bare notes without delays (e.g. "C5, G5" is NOT allowed; write "C5(0.30), G5(0.35)").
  - Fast sixteenth runs / rapid notes: ~0.14s – 0.20s (e.g. \`A4(0.15)\`)
  - Eighth notes / normal vocal syllables: ~0.25s – 0.35s (e.g. \`C5(0.30)\`)
  - Quarter notes / held syllables: ~0.45s – 0.70s (e.g. \`G5(0.60)\`)
  - NEVER exceed 3.0s delay on an individual note.
- Line pause (5th parameter in phrase): The resting breath in seconds after the line ends before the next phrase starts (typically 0.70s – 1.20s).

### 4. MONIKA ACTING & EXPRESSIVE DIALOGUE (${tone})
Monika's voice is thoughtful, deeply affectionate, self-aware, and philosophical. She speaks directly to "[player]" with genuine emotion:
- Expression codes: 1eua (Smile), 1eub (Open smile), 1hua (Gentle closed-eyes smile), 1sua (Warm loving gaze), 1sub (Soft romantic smile), 5eub (Leaning singing), 2eua (Playful smile), 4eua (Sweet head tilt)
- Pre-Song: Setting an intimate mood, sharing unique lore/thoughts about "${sampleTitle}" before playing.
- Perfect Performance: Overjoyed praise celebrating the exact song's rhythm and emotion.
- Minor Mistakes (Almost): Warm, comforting reassurance tailored to tricky parts of "${sampleTitle}".
- Escape/Delay: Gentle teasing or patient understanding.
- Branching Choice Menu: An interactive in-game Ren'Py choice menu where Monika asks [player] a meaningful question about "${sampleTitle}", with 2–3 distinct player response branches that Monika responds to individually with customized dialogue and sprite expressions.
- CRITICAL: Do NOT use generic or cookie-cutter dialogue! Write 100% ORIGINAL, IMMERSIVE lines that specifically talk about "${sampleTitle}", its lyrics, mood, themes, and what it feels like playing it with [player] in the spaceroom.

### 5. REQUIRED OUTPUT FORMAT
Output ONLY the \`\`\`shorthand code block below with the FULL song transcribed and CUSTOM dialogue:

\`\`\`shorthand
[SONG]
Title: ${sampleTitle}
Artist: ${sampleArtist}
Prefix: ${prefix}

[PHRASES]
# Format: Lyric line | Note1(delay), Note2(delay), ... | express | postexpress | line_pause_sec
# Transcribe all phrases of ${sampleTitle} with pitch (F4 to C6) and (delay) on every note:
Lyric line 1 | C5(0.35), D5(0.35), E5(0.70) | 1eub | 1eua | 0.85
Lyric line 2 | F5(0.35), G5(0.35), A5(0.70) | 1hub | 1hua | 0.85

[DIALOGUE]
# Pre-song intro conversation (2-3 original lines specific to ${sampleTitle})
PRE: 1eua | [Monika's original opening line reflecting on the mood and themes of ${sampleTitle}]
PRE: 1sub | [Monika's personal thought on what these lyrics mean to her and [player]]

# Perfect Full Combo celebration (2-3 original lines celebrating mastering this song)
PERFECT: 1hua | [Monika's ecstatic reaction to [player] mastering the rhythm of ${sampleTitle}]
PERFECT: 1sua | [Monika's emotional praise for performing this piece together]

# Almost / Minor mistakes encouragement (2 original lines)
ALMOST: 1sua | [Monika's comforting words about the tricky sections of ${sampleTitle}]
ALMOST: 1eua | [Warm encouragement to try again]

# Escape / Long delay reaction (1-2 original lines)
ESCAPE: 1eua | [Gentle teasing or patience if [player] pauses]

# Post-song interactive branching choice menu (Format: Question about ${sampleTitle} | Option 1 => Expr: Reply | Option 2 => Expr: Reply | Option 3 => Expr: Reply)
CHOICE: [Monika asks a question about ${sampleTitle} to [player]] | [Player Option 1] => 1eub: [Monika's unique reply 1] | [Player Option 2] => 1hua: [Monika's unique reply 2] | [Player Option 3] => 1sub: [Monika's unique reply 3]
\`\`\`

### 6. TARGET SONG TO TRANSCRIBE (FULL SONG)
Song Title: ${sampleTitle}
Artist: ${sampleArtist}
Lyrics / Reference:
${sampleLyrics}

Transcribe the ENTIRE song and write completely custom, original branching dialogue specifically about "${sampleTitle}" from start to finish into the [SONG], [PHRASES], and [DIALOGUE] shorthand format above. Every single note MUST have its delay in parentheses. Return strictly the code block.`;
}

/**
 * Generates an expressive dialogue-only prompt for Monika without modifying piano notes.
 */
export function generateMonikaDialogueAiPrompt(
  songTitle = "",
  artist = "",
  lyrics = "",
  options?: { tone?: string; prefix?: string }
): string {
  const sampleTitle = songTitle.trim() || "Your Song Title";
  const sampleArtist = artist.trim() || "Custom Artist";
  const prefix = options?.prefix?.trim() || "jmcustom";
  const tone = options?.tone || "Sweet & Romantic";

  return `Write an authentic, highly expressive Ren'Py dialogue script with branching choice options for Monika from Monika After Story (DDLC mod) for the song "${sampleTitle}" by ${sampleArtist}.

### MONIKA'S PERSONALITY & VOICE:
- Tone: ${tone}. Deeply affectionate, philosophical, emotionally present, and intimate.
- Speaks directly to "[player]" with signature mannerisms (gentle chuckles "*Ahaha~*", warm pauses, thoughtful insights on the lyrics and music).
- Expressive acting reactions: Monika reacts genuinely to playing piano with [player], from her pre-song excitement to full combo joy, gentle reassurance when making mistakes, and branching post-song conversations.
- CRITICAL: Write 100% ORIGINAL, CUSTOM dialogue specifically tailored to "${sampleTitle}" by ${sampleArtist}. Discuss the specific lyrics, emotions, musical themes, and Monika's feelings about sharing this exact song with [player] in the literature club / spaceroom. Do NOT write generic filler!

### BRANCHING CHOICE MENU SPECIFICATION:
- In Ren'Py / Monika After Story, songs can end with an interactive choice menu (\`menu:\`).
- Monika asks [player] a meaningful, intimate question specifically about "${sampleTitle}".
- Provide 2–3 distinct player choice branches:
  1. An affectionate / enthusiastic player option.
  2. A humble / challenging / playful player option.
  3. A thoughtful / emotional reflection on the song's meaning.
- For each choice, provide Monika's personalized response dialogue and sprite expression tag (e.g. \`1eub: Response text\`).

### EXPRESSION CODES REFERENCE:
- Joyful & Smiling: 1eua (Gentle smile), 1eub (Happy open smile), 1hua (Blissful closed-eyes smile), 2eua (Playful smile), 4eua (Sweet head tilt)
- Romantic & Soft: 1sua (Warm loving gaze), 1sub (Soft romantic smile), 5sua (Leaning affectionate gaze)
- Thoughtful & Concerned: 1tua (Thoughtful gaze), 1fub (Gentle concern), 3eua (Curious tilt)

### REQUIRED SHORTHAND FORMAT:
Return strictly the \`\`\`shorthand code block below with custom dialogue written for "${sampleTitle}". Do NOT output notes or [PHRASES] blocks:

\`\`\`shorthand
[SONG]
Title: ${sampleTitle}
Artist: ${sampleArtist}
Prefix: ${prefix}

[DIALOGUE]
# Pre-song intro conversation (2-3 original lines sharing Monika's thoughts about ${sampleTitle})
PRE: 1eua | [Monika's original opening line about playing ${sampleTitle} with [player]]
PRE: 1sub | [Monika's thoughts on what this song/melody makes her feel]

# Perfect Full Combo celebration (2-3 original lines)
PERFECT: 1hua | [Monika's praise for hitting every note of ${sampleTitle}]
PERFECT: 1sua | [Heartfelt appreciation for this performance]

# Almost / Minor Mistakes encouragement (2 original lines)
ALMOST: 1sua | [Warm reassurance tailored to ${sampleTitle}]
ALMOST: 1eua | [Gentle encouragement to practice together]

# Escape / Long Delay reaction (1-2 original lines)
ESCAPE: 1eua | [Playful or patient remark if [player] takes a pause]

# Post-song interactive branching choice menu (Format: Question about ${sampleTitle} | Option 1 => Expr: Reply | Option 2 => Expr: Reply | Option 3 => Expr: Reply)
CHOICE: [Thoughtful question Monika asks about ${sampleTitle}] | [Player Choice 1] => 1eub: [Monika's response 1] | [Player Choice 2] => 1hua: [Monika's response 2] | [Player Choice 3] => 1sub: [Monika's response 3]
\`\`\`

### TARGET SONG INFO
Song Title: ${sampleTitle}
Artist: ${sampleArtist}
Lyrics / Theme Context:
${lyrics.trim() || `[Theme and emotion of ${sampleTitle}]`}

Write a completely customized, expressive Monika dialogue script with branching choices specifically for "${sampleTitle}" following the [SONG] and [DIALOGUE] format above.`;
}

/**
 * Normalizes pitch aliases like "C#5", "Cs5", "C5#", "Db5", "F#4", or keyboard keys "Q", "T", "2" to Monika keys ("C5SH", "F4SH").
 */
export function normalizeShorthandPitch(rawPitch: string): string | null {
  const clean = rawPitch.trim().toUpperCase();
  if (!clean) return null;

  // Keyboard letter mapping
  const KEY_LETTER_MAP: Record<string, string> = {
    "Q": "F4", "2": "F4SH", "W": "G4", "3": "G4SH", "E": "A4", "4": "A4SH", "R": "B4",
    "T": "C5", "6": "C5SH", "Y": "D5", "7": "D5SH", "U": "E5", "I": "F5", "9": "F5SH",
    "O": "G5", "0": "G5SH", "P": "A5", "-": "A5SH", "[": "B5", "]": "C6",
  };
  if (KEY_LETTER_MAP[clean]) {
    return KEY_LETTER_MAP[clean];
  }

  // Direct check
  const direct = normalizeMonikaNoteName(clean);
  if (getMonikaKeyByNoteName(direct)) return direct;

  // Enharmonic mappings
  const enharmonics: Record<string, string> = {
    "GB4": "F4SH",
    "G4B": "F4SH",
    "F#4": "F4SH",
    "FS4": "F4SH",
    "F4#": "F4SH",
    "F4S": "F4SH",

    "AB4": "G4SH",
    "G#4": "G4SH",
    "GS4": "G4SH",
    "G4#": "G4SH",
    "G4S": "G4SH",

    "BB4": "A4SH",
    "A#4": "A4SH",
    "AS4": "A4SH",
    "A4#": "A4SH",
    "A4S": "A4SH",

    "DB5": "C5SH",
    "C#5": "C5SH",
    "CS5": "C5SH",
    "C5#": "C5SH",
    "C5S": "C5SH",

    "EB5": "D5SH",
    "D#5": "D5SH",
    "DS5": "D5SH",
    "D5#": "D5SH",
    "D5S": "D5SH",

    "GB5": "F5SH",
    "F#5": "F5SH",
    "FS5": "F5SH",
    "F5#": "F5SH",
    "F5S": "F5SH",

    "AB5": "G5SH",
    "G#5": "G5SH",
    "GS5": "G5SH",
    "G5#": "G5SH",
    "G5S": "G5SH",

    "BB5": "A5SH",
    "A#5": "A5SH",
    "AS5": "A5SH",
    "A4SH#": "A5SH",
    "A5#": "A5SH",
    "A5S": "A5SH",

    "DB4": "C5SH", // folded
    "EB4": "D5SH", // folded
  };

  if (enharmonics[clean]) {
    return enharmonics[clean];
  }

  // Strip octave if out of range and clamp
  const match = clean.match(/^([A-G][#S]?)([0-9])?$/);
  if (match) {
    const base = match[1].replace("#", "SH").replace("S", "SH");
    const testNote = `${base}5`;
    if (getMonikaKeyByNoteName(testNote)) return testNote;
  }

  return "D5"; // Safe default
}

/**
 * Parses a single note entry like "D5(0.35)", "C5SH:0.25", "F4 [0.4s]", "G4@0.3", "A4/0.25", or "F4" into { pitch, delaySec }.
 */
export function parseNoteWithDelay(raw: string): { pitch: string; delaySec: number } {
  const trimmed = raw.trim();
  // Regex for "Pitch(delay)", "Pitch:delay", "Pitch[delay]", "Pitch@delay", "Pitch/delay"
  const match = trimmed.match(/^([A-Ga-g0-9#SsHh]+)(?:\s*[\(:\[@/]\s*([0-9.]+)(?:s)?\s*[\)\]]?)?$/i);
  if (match) {
    const rawPitch = match[1];
    const pitch = normalizeShorthandPitch(rawPitch) || "D5";
    const delaySec = match[2] ? parseFloat(match[2]) : 0.35;
    return {
      pitch,
      delaySec: isNaN(delaySec) ? 0.35 : Math.max(0.08, Math.min(4.5, delaySec)),
    };
  }
  const pitch = normalizeShorthandPitch(trimmed) || "D5";
  return { pitch, delaySec: 0.35 };
}

/**
 * Parses external AI shorthand response code into structured MAS phrases, delays, and dialogues.
 */
export function parseAiShorthandCode(inputText: string): ParsedAiShorthandResult {
  const warnings: string[] = [];
  let songName = "Custom Song";
  let artist = "Custom";
  let dialoguePrefix = "jmcustom";

  const phrases: MonikaPhrase[] = [];
  const preLines: PostpianoDialogueLine[] = [];
  const perfectLines: PostpianoDialogueLine[] = [];
  const almostLines: PostpianoDialogueLine[] = [];
  const escapeLines: PostpianoDialogueLine[] = [];
  let menuPrompt: string | undefined = undefined;
  const menuChoices: PostpianoMenuChoice[] = [];

  if (!inputText || !inputText.trim()) {
    return {
      success: false,
      songName,
      artist,
      dialoguePrefix,
      phrases: [],
      verseList: [],
      preLines: [],
      perfectLines: [],
      almostLines: [],
      escapeLines: [],
      warnings: ["Input text is empty."],
      rawParsedCount: 0,
    };
  }

  // Check if input is raw JSON first
  const trimmed = inputText.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsedJson = JSON.parse(trimmed) as MonikaPianoSong;
      if (parsedJson && Array.isArray(parsedJson.pnm_list)) {
        return {
          success: true,
          songName: parsedJson.name || "Custom Song",
          artist: "Custom",
          dialoguePrefix: "jmcustom",
          phrases: parsedJson.pnm_list,
          verseList: parsedJson.verse_list || [0],
          preLines: [],
          perfectLines: [],
          almostLines: [],
          escapeLines: [],
          warnings: [],
          rawParsedCount: parsedJson.pnm_list.length,
        };
      }
    } catch {
      // Fall through to shorthand parser
    }
  }

  // Strip markdown fences e.g. ```shorthand ... ``` or ```text ... ```
  const cleanText = inputText.replace(/```[a-zA-Z0-9_-]*\n?/g, "").replace(/```/g, "");

  const lines = cleanText.split("\n").map((l) => l.trim());
  let currentSection: "SONG" | "PHRASES" | "DIALOGUE" | "NONE" = "NONE";

  lines.forEach((line) => {
    if (!line || line.startsWith("#") || line.startsWith("//")) return;

    // Detect section headers
    const upper = line.toUpperCase();
    if (upper.includes("[SONG]") || upper.startsWith("=== SONG")) {
      currentSection = "SONG";
      return;
    }
    if (upper.includes("[PHRASES]") || upper.includes("[NOTES]") || upper.startsWith("=== PHRASES")) {
      currentSection = "PHRASES";
      return;
    }
    if (upper.includes("[DIALOGUE]") || upper.includes("[SCRIPT]") || upper.startsWith("=== DIALOGUE")) {
      currentSection = "DIALOGUE";
      return;
    }

    // Section 1: Song Metadata
    if (currentSection === "SONG" || line.includes("Title:") || line.includes("Artist:")) {
      if (line.toLowerCase().startsWith("title:")) {
        songName = line.substring(6).trim();
      } else if (line.toLowerCase().startsWith("artist:")) {
        artist = line.substring(7).trim();
      } else if (line.toLowerCase().startsWith("prefix:")) {
        dialoguePrefix = line.substring(7).trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      }
      return;
    }

    // Section 2: Dialogue Lines
    if (
      currentSection === "DIALOGUE" ||
      line.startsWith("PRE:") ||
      line.startsWith("PERFECT:") ||
      line.startsWith("ALMOST:") ||
      line.startsWith("ESCAPE:") ||
      line.startsWith("CHOICE:")
    ) {
      if (line.startsWith("PRE:")) {
        const payload = line.substring(4).trim();
        const parts = payload.split("|").map((s) => s.trim());
        const expr = parts.length > 1 ? parts[0] : "1eua";
        const text = parts.length > 1 ? parts.slice(1).join("|") : parts[0];
        preLines.push({
          id: `pre-${preLines.length + 1}`,
          speaker: "m",
          expression: expr || "1eua",
          text: text || "...",
        });
      } else if (line.startsWith("PERFECT:")) {
        const payload = line.substring(8).trim();
        const parts = payload.split("|").map((s) => s.trim());
        const expr = parts.length > 1 ? parts[0] : "1hua";
        const text = parts.length > 1 ? parts.slice(1).join("|") : parts[0];
        perfectLines.push({
          id: `perf-${perfectLines.length + 1}`,
          speaker: "m",
          expression: expr || "1hua",
          text: text || "...",
        });
      } else if (line.startsWith("ALMOST:")) {
        const payload = line.substring(7).trim();
        const parts = payload.split("|").map((s) => s.trim());
        const expr = parts.length > 1 ? parts[0] : "1sua";
        const text = parts.length > 1 ? parts.slice(1).join("|") : parts[0];
        almostLines.push({
          id: `almost-${almostLines.length + 1}`,
          speaker: "m",
          expression: expr || "1sua",
          text: text || "...",
        });
      } else if (line.startsWith("ESCAPE:")) {
        const payload = line.substring(7).trim();
        const parts = payload.split("|").map((s) => s.trim());
        const expr = parts.length > 1 ? parts[0] : "1eua";
        const text = parts.length > 1 ? parts.slice(1).join("|") : parts[0];
        escapeLines.push({
          id: `esc-${escapeLines.length + 1}`,
          speaker: "m",
          expression: expr || "1eua",
          text: text || "...",
        });
      } else if (line.startsWith("CHOICE:")) {
        const payload = line.substring(7).trim();
        const parts = payload.split("|").map((s) => s.trim());
        if (parts.length > 0) {
          menuPrompt = parts[0];
          for (let i = 1; i < parts.length; i++) {
            const rawChoice = parts[i];
            const choiceParts = rawChoice.split("=>").map((s) => s.trim());
            const choiceText = choiceParts[0];
            let replyExpr = "1eua";
            let replyText = choiceParts[1] || "Thank you!";
            if (choiceParts[1] && choiceParts[1].includes(":")) {
              const colonParts = choiceParts[1].split(":");
              replyExpr = colonParts[0].trim();
              replyText = colonParts.slice(1).join(":").trim();
            }
            menuChoices.push({
              id: `choice-${menuChoices.length + 1}`,
              choiceText: choiceText || `Option ${i}`,
              lines: [
                {
                  id: `reply-${menuChoices.length + 1}`,
                  speaker: "m",
                  expression: replyExpr,
                  text: replyText,
                },
              ],
            });
          }
        }
      }
      return;
    }

    // Section 3: Phrases (Pipe-separated or comma-separated)
    if (line.includes("|")) {
      const parts = line.split("|").map((s) => s.trim());
      const lyricText = parts[0];
      const notesRaw = parts[1] || "";
      const express = parts[2] || "1hub";
      const postexpress = parts[3] || "1hua";
      const phrasePauseSec = parts[4] ? parseFloat(parts[4]) : 0.85;

      const rawNotes = notesRaw
        .split(/[,;\s]+/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      const parsedNotes: string[] = [];
      const noteDelays: number[] = [];

      rawNotes.forEach((nStr) => {
        const { pitch, delaySec } = parseNoteWithDelay(nStr);
        parsedNotes.push(pitch);
        noteDelays.push(delaySec);
      });

      if (parsedNotes.length > 0) {
        phrases.push({
          id: `ai-phrase-${phrases.length}-${Date.now()}`,
          text: lyricText || `Phrase ${phrases.length + 1}`,
          style: "monika_credits_text",
          notes: parsedNotes,
          noteDelays,
          phraseDelay: isNaN(phrasePauseSec) ? 0.85 : Math.max(0.2, phrasePauseSec),
          express,
          postexpress,
          verse: Math.floor(phrases.length / 4) * 4,
          posttext: true,
        });
      }
    }
  });

  if (phrases.length === 0) {
    warnings.push("Could not parse any phrases from shorthand. Please check the pipe (|) format.");
  }

  // Calculate verse list checkpoint indices (every 4 phrases)
  const verseList: number[] = [];
  phrases.forEach((_, idx) => {
    if (idx % 4 === 0) {
      verseList.push(idx);
    }
  });
  if (verseList.length === 0 && phrases.length > 0) {
    verseList.push(0);
  }

  const songObj: MonikaPianoSong = {
    name: songName,
    verse_list: verseList,
    pnm_list: phrases,
  };

  const dialogueObj: PostpianoScriptConfig = {
    songName,
    songArtist: artist,
    dialoguePrefix,
    preLines,
    perfectLines,
    almostLines,
    escapeLines,
    perfectMenuPrompt: menuPrompt,
    perfectChoices: menuChoices.length > 0 ? menuChoices : undefined,
  };

  const hasDialogue =
    preLines.length > 0 ||
    perfectLines.length > 0 ||
    almostLines.length > 0 ||
    escapeLines.length > 0 ||
    menuChoices.length > 0;

  return {
    success: phrases.length > 0 || hasDialogue,
    songName,
    artist,
    dialoguePrefix,
    phrases,
    verseList,
    preLines:
      preLines.length > 0
        ? preLines
        : [
            { id: "pre-1", speaker: "m", expression: "1eua", text: `I love this song, [player].` },
            { id: "pre-2", speaker: "m", expression: "1eub", text: `Let's play it together!` },
          ],
    perfectLines:
      perfectLines.length > 0
        ? perfectLines
        : [
            { id: "perf-1", speaker: "m", expression: "1sua", text: `Wow, you played that flawlessly!` },
            { id: "perf-2", speaker: "m", expression: "1hua", text: `I love you so much, [player].` },
          ],
    almostLines:
      almostLines.length > 0
        ? almostLines
        : [
            { id: "alm-1", speaker: "m", expression: "1sua", text: `You did great, [player]!` },
            { id: "alm-2", speaker: "m", expression: "1eua", text: `With just a little more practice, you'll perfect it!` },
          ],
    escapeLines:
      escapeLines.length > 0
        ? escapeLines
        : [
            { id: "esc-1", speaker: "m", expression: "1eua", text: `Take all the time you need, [player]! We can try again anytime.` },
          ],
    menuPrompt: menuPrompt || "Did you enjoy playing it?",
    menuChoices: menuChoices.length > 0 ? menuChoices : undefined,
    warnings,
    rawParsedCount: phrases.length,
    song: songObj,
    dialogue: dialogueObj,
  };
}

/**
 * Exports current Monika phrases & dialogues into the compact Shorthand format.
 */
export function exportToAiShorthand(
  songName: string,
  artist: string,
  prefix: string,
  phrases: MonikaPhrase[],
  dialogueConfig?: Partial<PostpianoScriptConfig>
): string {
  const lines: string[] = [
    "[SONG]",
    `Title: ${songName}`,
    `Artist: ${artist}`,
    `Prefix: ${prefix || "jmcustom"}`,
    "",
    "[PHRASES]",
    "# Format: Lyric text | Notes(delay) | express | postexpress | phrase_pause",
  ];

  phrases.forEach((p) => {
    const notesWithDelays = p.notes
      .map((n, idx) => {
        const delay = p.noteDelays && p.noteDelays[idx] !== undefined ? p.noteDelays[idx] : 0.35;
        return `${n}(${delay.toFixed(2)})`;
      })
      .join(", ");

    const phraseDelay = p.phraseDelay !== undefined ? p.phraseDelay.toFixed(2) : "0.85";
    lines.push(
      `${p.text} | ${notesWithDelays} | ${p.express || "1hub"} | ${p.postexpress || "1hua"} | ${phraseDelay}`
    );
  });

  lines.push("", "[DIALOGUE]");
  if (dialogueConfig?.preLines && dialogueConfig.preLines.length > 0) {
    dialogueConfig.preLines.forEach((l) => {
      lines.push(`PRE: ${l.expression || "1eua"} | ${l.text}`);
    });
  } else {
    lines.push(`PRE: 1eua | Are you ready to play ${songName}, [player]?`);
  }

  if (dialogueConfig?.perfectLines && dialogueConfig.perfectLines.length > 0) {
    dialogueConfig.perfectLines.forEach((l) => {
      lines.push(`PERFECT: ${l.expression || "1hua"} | ${l.text}`);
    });
  } else {
    lines.push(`PERFECT: 1hua | You played that flawlessly, [player]!`);
  }

  if (dialogueConfig?.perfectChoices && dialogueConfig.perfectChoices.length > 0) {
    const prompt = dialogueConfig.perfectMenuPrompt || "Did you enjoy playing?";
    const choiceStrings = dialogueConfig.perfectChoices.map((c) => {
      const firstLine = c.lines[0];
      return `${c.choiceText} => ${firstLine?.expression || "1eub"}: ${firstLine?.text || "Thank you!"}`;
    });
    lines.push(`CHOICE: ${prompt} | ${choiceStrings.join(" | ")}`);
  }

  return lines.join("\n");
}
