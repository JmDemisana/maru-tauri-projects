// Pure TypeScript Standard MIDI File (SMF) binary parser.
// Supports MIDI format 0 and 1, tracks, tempos, GM instruments, notes, and embedded lyrics.

export interface ParsedMidiNote {
  pitch: number; // 0..127
  midi: number; // 0..127 (alias for pitch)
  velocity: number; // 0..127
  channel: number; // 0..15
  startTick: number;
  endTick: number;
  durationTicks: number;
  startTimeSec: number;
  endTimeSec: number;
  durationSec: number;
  monikaNote?: string;
  monikaKey?: string;
}

export interface ParsedMidiTrack {
  index: number;
  name: string;
  instrumentName: string;
  programNumber: number; // 0..127
  channel: number;
  notes: ParsedMidiNote[];
  totalNotes: number;
  minPitch: number;
  maxPitch: number;
  lyrics: Array<{ tick: number; timeSec: number; text: string }>;
}

export interface ParsedMidiFile {
  format: number; // 0, 1, 2
  trackCount: number;
  division: number; // ticks per quarter note
  initialBpm: number;
  durationSec: number;
  tracks: ParsedMidiTrack[];
  allLyrics: string[];
  melodyTrackIndex: number;
  lyricsFound: string[];
}

export const GM_INSTRUMENTS = [
  "Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano",
  "Electric Piano 1 (Rhodes)", "Electric Piano 2 (Chorused)", "Harpsichord", "Clavinet",
  "Celesta", "Glockenspiel", "Music Box", "Vibraphone",
  "Marimba", "Xylophone", "Tubular Bells", "Dulcimer",
  "Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ",
  "Reed Organ", "Accordion", "Harmonica", "Tango Accordion",
  "Acoustic Guitar (nylon)", "Acoustic Guitar (steel)", "Electric Guitar (jazz)", "Electric Guitar (clean)",
  "Electric Guitar (muted)", "Overdriven Guitar", "Distortion Guitar", "Guitar Harmonics",
  "Acoustic Bass", "Electric Bass (finger)", "Electric Bass (pick)", "Fretless Bass",
  "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2",
  "Violin", "Viola", "Cello", "Contrabass",
  "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani",
  "String Ensemble 1", "String Ensemble 2", "Synth Strings 1", "Synth Strings 2",
  "Choir Aahs", "Voice Oohs", "Synth Voice", "Orchestra Hit",
  "Trumpet", "Trombone", "Tuba", "Muted Trumpet",
  "French Horn", "Brass Section", "Synth Brass 1", "Synth Brass 2",
  "Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax",
  "Oboe", "English Horn", "Bassoon", "Clarinet",
  "Piccolo", "Flute", "Recorder", "Pan Flute",
  "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina",
  "Lead 1 (square)", "Lead 2 (sawtooth)", "Lead 3 (calliope)", "Lead 4 (chiff)",
  "Lead 5 (charang)", "Lead 6 (voice)", "Lead 7 (fifths)", "Lead 8 (bass + lead)",
  "Pad 1 (new age)", "Pad 2 (warm)", "Pad 3 (polysynth)", "Pad 4 (choir)",
  "Pad 5 (bowed)", "Pad 6 (metallic)", "Pad 7 (halo)", "Pad 8 (sweep)",
  "FX 1 (rain)", "FX 2 (soundtrack)", "FX 3 (crystal)", "FX 4 (atmosphere)",
  "FX 5 (brightness)", "FX 6 (goblins)", "FX 7 (echoes)", "FX 8 (sci-fi)",
  "Sitar", "Banjo", "Shamisen", "Koto",
  "Kalimba", "Bag pipe", "Fiddle", "Shanai",
  "Tinkle Bell", "Agogo", "Steel Drums", "Woodblock",
  "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal",
  "Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet",
  "Telephone Ring", "Helicopter", "Applause", "Gunshot",
];

class BinaryReader {
  private view: DataView;
  public offset = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  get length(): number {
    return this.view.byteLength;
  }

  hasMore(bytes = 1): boolean {
    return this.offset + bytes <= this.view.byteLength;
  }

  readUint8(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  readUint16(): number {
    const val = this.view.getUint16(this.offset, false);
    this.offset += 2;
    return val;
  }

  readUint32(): number {
    const val = this.view.getUint32(this.offset, false);
    this.offset += 4;
    return val;
  }

  readString(length: number): string {
    let str = "";
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(this.readUint8());
    }
    return str;
  }

  readBytes(length: number): Uint8Array {
    const arr = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, length);
    this.offset += length;
    return arr;
  }

  readVarLength(): number {
    let result = 0;
    let byte: number;
    do {
      byte = this.readUint8();
      result = (result << 7) | (byte & 0x7f);
    } while ((byte & 0x80) !== 0);
    return result;
  }
}

interface TempoEvent {
  tick: number;
  microsPerQuarter: number;
}

export function parseMidiFile(arrayBuffer: ArrayBuffer): ParsedMidiFile {
  const reader = new BinaryReader(arrayBuffer);

  // 1. Header chunk
  const headerId = reader.readString(4);
  if (headerId !== "MThd") {
    throw new Error("Invalid MIDI file header (expected 'MThd').");
  }

  const headerLength = reader.readUint32();
  if (headerLength < 6) {
    throw new Error("Invalid MIDI header chunk length.");
  }

  const format = reader.readUint16();
  const trackCount = reader.readUint16();
  const division = reader.readUint16();

  if (headerLength > 6) {
    reader.offset += headerLength - 6;
  }

  const tempoEvents: TempoEvent[] = [{ tick: 0, microsPerQuarter: 500000 }]; // default 120 BPM
  const rawTracks: Array<{
    name: string;
    programNumber: number;
    channel: number;
    notes: Array<{
      pitch: number;
      velocity: number;
      channel: number;
      startTick: number;
      endTick: number;
    }>;
    lyrics: Array<{ tick: number; text: string }>;
  }> = [];

  // 2. Read each track
  for (let t = 0; t < trackCount && reader.hasMore(8); t++) {
    const trackId = reader.readString(4);
    const trackLength = reader.readUint32();

    if (trackId !== "MTrk") {
      // Skip unknown chunk
      reader.offset += trackLength;
      continue;
    }

    const trackEnd = reader.offset + trackLength;
    let currentTick = 0;
    let runningStatus = 0;

    let trackName = `Track ${t + 1}`;
    let trackProgram = 0;
    let trackChannel = 0;

    const openNotes = new Map<string, { pitch: number; velocity: number; channel: number; startTick: number }>();
    const trackNotes: Array<{
      pitch: number;
      velocity: number;
      channel: number;
      startTick: number;
      endTick: number;
    }> = [];
    const trackLyrics: Array<{ tick: number; text: string }> = [];

    while (reader.offset < trackEnd && reader.hasMore()) {
      const delta = reader.readVarLength();
      currentTick += delta;

      let status = reader.readUint8();

      if ((status & 0x80) === 0) {
        // Running status
        if (runningStatus === 0) {
          continue;
        }
        reader.offset -= 1;
        status = runningStatus;
      } else {
        runningStatus = status;
      }

      const eventType = status & 0xf0;
      const channel = status & 0x0f;

      if (status === 0xff) {
        // Meta event
        const metaType = reader.readUint8();
        const metaLength = reader.readVarLength();

        if (metaType === 0x03) {
          // Track Name
          const text = reader.readString(metaLength);
          if (text.trim()) trackName = text.trim();
        } else if (metaType === 0x04) {
          // Instrument Name
          const text = reader.readString(metaLength);
          if (text.trim() && trackName === `Track ${t + 1}`) trackName = text.trim();
        } else if (metaType === 0x05 || metaType === 0x01) {
          // Lyric or text marker
          const text = reader.readString(metaLength);
          if (text.trim()) {
            trackLyrics.push({ tick: currentTick, text: text.trim() });
          }
        } else if (metaType === 0x51 && metaLength === 3) {
          // Set Tempo
          const b1 = reader.readUint8();
          const b2 = reader.readUint8();
          const b3 = reader.readUint8();
          const micros = (b1 << 16) | (b2 << 8) | b3;
          tempoEvents.push({ tick: currentTick, microsPerQuarter: micros });
        } else {
          // Skip other meta events
          reader.offset += metaLength;
        }
      } else if (status === 0xf0 || status === 0xf7) {
        // SysEx
        const sysexLength = reader.readVarLength();
        reader.offset += sysexLength;
      } else if (eventType === 0x90) {
        // Note On
        const pitch = reader.readUint8();
        const velocity = reader.readUint8();
        trackChannel = channel;
        const key = `${channel}:${pitch}`;

        if (velocity > 0) {
          // If note was already open, close it
          if (openNotes.has(key)) {
            const prev = openNotes.get(key)!;
            trackNotes.push({ ...prev, endTick: currentTick });
          }
          openNotes.set(key, { pitch, velocity, channel, startTick: currentTick });
        } else {
          // Velocity 0 is Note Off
          if (openNotes.has(key)) {
            const prev = openNotes.get(key)!;
            trackNotes.push({ ...prev, endTick: currentTick });
            openNotes.delete(key);
          }
        }
      } else if (eventType === 0x80) {
        // Note Off
        const pitch = reader.readUint8();
        reader.readUint8(); // release velocity
        const key = `${channel}:${pitch}`;
        if (openNotes.has(key)) {
          const prev = openNotes.get(key)!;
          trackNotes.push({ ...prev, endTick: currentTick });
          openNotes.delete(key);
        }
      } else if (eventType === 0xc0) {
        // Program change
        const program = reader.readUint8();
        trackProgram = program;
        trackChannel = channel;
      } else if (eventType === 0xa0 || eventType === 0xb0 || eventType === 0xe0) {
        // 2 data bytes
        reader.readUint8();
        reader.readUint8();
      } else if (eventType === 0xd0) {
        // 1 data byte
        reader.readUint8();
      }
    }

    // Close any dangling open notes
    openNotes.forEach((prev) => {
      trackNotes.push({ ...prev, endTick: currentTick + (division / 2) });
    });

    rawTracks.push({
      name: trackName,
      programNumber: trackProgram,
      channel: trackChannel,
      notes: trackNotes.sort((a, b) => a.startTick - b.startTick),
      lyrics: trackLyrics,
    });
  }

  // 3. Time converter helper (ticks -> seconds)
  tempoEvents.sort((a, b) => a.tick - b.tick);

  const tickToSeconds = (targetTick: number): number => {
    let elapsedSec = 0;
    let lastTick = 0;
    let currentMicros = tempoEvents[0].microsPerQuarter;

    for (let i = 0; i < tempoEvents.length; i++) {
      const te = tempoEvents[i];
      if (targetTick <= te.tick) {
        break;
      }
      const tickDelta = te.tick - lastTick;
      elapsedSec += (tickDelta / division) * (currentMicros / 1000000);
      lastTick = te.tick;
      currentMicros = te.microsPerQuarter;
    }

    const remainingTicks = targetTick - lastTick;
    elapsedSec += (remainingTicks / division) * (currentMicros / 1000000);
    return elapsedSec;
  };

  const initialBpm = Math.round(60000000 / tempoEvents[0].microsPerQuarter);

  // 4. Assemble final tracks
  let maxFileTimeSec = 0;
  const allLyricsList: string[] = [];

  const tracks: ParsedMidiTrack[] = rawTracks
    .map((raw, idx) => {
      const notes: ParsedMidiNote[] = raw.notes.map((n) => {
        const startTimeSec = tickToSeconds(n.startTick);
        const endTimeSec = Math.max(startTimeSec + 0.05, tickToSeconds(n.endTick));
        if (endTimeSec > maxFileTimeSec) maxFileTimeSec = endTimeSec;

        return {
          pitch: n.pitch,
          midi: n.pitch,
          velocity: n.velocity,
          channel: n.channel,
          startTick: n.startTick,
          endTick: n.endTick,
          durationTicks: n.endTick - n.startTick,
          startTimeSec,
          endTimeSec,
          durationSec: endTimeSec - startTimeSec,
        };
      });

      const lyrics = raw.lyrics.map((l) => ({
        tick: l.tick,
        timeSec: tickToSeconds(l.tick),
        text: l.text,
      }));

      lyrics.forEach((l) => {
        if (!allLyricsList.includes(l.text)) {
          allLyricsList.push(l.text);
        }
      });

      let minPitch = 127;
      let maxPitch = 0;
      notes.forEach((n) => {
        if (n.pitch < minPitch) minPitch = n.pitch;
        if (n.pitch > maxPitch) maxPitch = n.pitch;
      });

      if (notes.length === 0) {
        minPitch = 0;
        maxPitch = 0;
      }

      const instrumentName =
        GM_INSTRUMENTS[raw.programNumber] || `Instrument ${raw.programNumber}`;

      return {
        index: idx,
        name: raw.name,
        instrumentName,
        programNumber: raw.programNumber,
        channel: raw.channel,
        notes,
        totalNotes: notes.length,
        minPitch,
        maxPitch,
        lyrics,
      };
    })
    .filter((t) => t.totalNotes > 0 || t.lyrics.length > 0);

  // Auto-detect melody track: choose track with the highest note count (excluding channel 9 drum track)
  let melodyTrackIndex = 0;
  let maxNotes = -1;
  tracks.forEach((t, i) => {
    if (t.channel !== 9 && t.totalNotes > maxNotes) {
      maxNotes = t.totalNotes;
      melodyTrackIndex = i;
    }
  });

  return {
    format,
    trackCount,
    division,
    initialBpm,
    durationSec: maxFileTimeSec,
    tracks,
    allLyrics: allLyricsList,
    melodyTrackIndex: tracks.length > 0 ? melodyTrackIndex : 0,
    lyricsFound: allLyricsList,
  };
}
