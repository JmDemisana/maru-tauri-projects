/**
 * Marucast Client and Lossless PCM Audio Stream Player for MAudio Windows.
 * Connects to Marucast Receiver/Broadcaster APIs and streams 44.1kHz/48kHz 16-bit Stereo PCM audio.
 */

const PRIMARY_API = "https://maru-website.onrender.com/api/auth";
const FALLBACK_API = "https://maruchansquigle.vercel.app/api/auth";

export interface MarucastSessionData {
  token: string;
  pairingCode: string;
  expiresAt: string;
}

export interface MarucastReceiverStatus {
  status: "pending" | "ready" | "expired";
  expiresAt: string;
  relayUrl?: string | null;
  deviceName?: string | null;
  serviceName?: string | null;
  mediaAppLabel?: string | null;
  mediaArtist?: string | null;
  mediaTitle?: string | null;
  artworkUrl?: string | null;
  mediaPlaying?: boolean;
  mediaDurationMs?: number | null;
  mediaPositionMs?: number | null;
  sampleRate?: number | null;
  channelCount?: number | null;
  relayMode?: string | null;
  error?: string | null;
}

export interface MarucastLyricLine {
  startMs: number | null;
  text: string;
  romanizedText?: string;
}

export interface MarucastLyricsData {
  lines: MarucastLyricLine[];
  synced: boolean;
  source: string;
}

// Resilient API Fetcher with Fallback
async function apiRequest<T>(route: string, options: RequestInit = {}): Promise<T> {
  const urlPrimary = `${PRIMARY_API}?route=${route}`;
  const urlFallback = `${FALLBACK_API}?route=${route}`;

  try {
    const res = await fetch(urlPrimary, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch {
    // Primary failed, try fallback
  }

  const resFallback = await fetch(urlFallback, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!resFallback.ok) {
    const errBody = await resFallback.json().catch(() => null);
    throw new Error(errBody?.error || `API returned status ${resFallback.status}`);
  }

  return (await resFallback.json()) as T;
}

export async function createReceiverSession(): Promise<MarucastSessionData> {
  return await apiRequest<MarucastSessionData>("marucast/receiver-start", {
    method: "POST",
    body: JSON.stringify({ receiverSurface: "desktop-web" }),
  });
}

export async function fetchReceiverStatus(token: string): Promise<MarucastReceiverStatus> {
  const encodedToken = encodeURIComponent(token);
  return await apiRequest<MarucastReceiverStatus>(`marucast/receiver-status&token=${encodedToken}`, {
    method: "GET",
  });
}

export async function lookupReceiverPin(pin: string): Promise<{ success: boolean; token: string }> {
  const cleanPin = pin.replace(/\s+/g, "").trim();
  return await apiRequest<{ success: boolean; token: string }>("marucast/receiver-lookup-pin", {
    method: "POST",
    body: JSON.stringify({ pin: cleanPin }),
  });
}

export async function completeReceiverHandoff(payload: {
  token: string;
  relayUrl?: string | null;
  deviceName?: string;
  mediaArtist?: string;
  mediaTitle?: string;
  mediaAppLabel?: string;
  relayMode?: string;
}): Promise<{ success: boolean }> {
  return await apiRequest<{ success: boolean }>("marucast/receiver-complete", {
    method: "POST",
    body: JSON.stringify({
      serviceName: "maudio-windows",
      deviceName: payload.deviceName || "MAudio Windows Desktop",
      relayMode: payload.relayMode || "lan",
      ...payload,
    }),
  });
}

export async function sendRemoteCommand(
  token: string,
  command: "play" | "pause" | "previous" | "next",
  relayUrl?: string | null
): Promise<boolean> {
  // If we have direct LAN relay URL, try sending direct HTTP control first
  if (relayUrl) {
    try {
      const parsed = new URL(relayUrl);
      const directControlUrl = `${parsed.origin}/control?cmd=${encodeURIComponent(command)}`;
      await fetch(directControlUrl, { method: "POST", mode: "no-cors" });
      return true;
    } catch {
      // Fall through to server-relayed command
    }
  }

  try {
    await apiRequest("marucast/receiver-command", {
      method: "POST",
      body: JSON.stringify({
        token,
        command,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function fetchTrackLyrics(title: string, artist: string): Promise<MarucastLyricsData | null> {
  try {
    const qTitle = encodeURIComponent(title.trim());
    const qArtist = encodeURIComponent(artist.trim());
    const data = await apiRequest<{ lyrics?: { lines: MarucastLyricLine[]; synced: boolean; source: string } }>(
      `marucast/lyrics&title=${qTitle}&artist=${qArtist}`,
      { method: "GET" }
    );
    if (data.lyrics && Array.isArray(data.lyrics.lines) && data.lyrics.lines.length > 0) {
      return data.lyrics;
    }
  } catch {
    // Try LRCLIB directly
    try {
      const lrcRes = await fetch(
        `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`
      );
      if (lrcRes.ok) {
        const lrcData = await lrcRes.json();
        if (lrcData.syncedLyrics) {
          const lines = parseLrcString(lrcData.syncedLyrics);
          return { lines, synced: true, source: "lrclib" };
        } else if (lrcData.plainLyrics) {
          const lines = lrcData.plainLyrics
            .split("\n")
            .map((line: string) => ({ startMs: null, text: line.trim() }))
            .filter((l: { text: string }) => l.text.length > 0);
          return { lines, synced: false, source: "lrclib" };
        }
      }
    } catch {
      // Ignore
    }
  }
  return null;
}

function parseLrcString(lrcText: string): MarucastLyricLine[] {
  const result: MarucastLyricLine[] = [];
  const lines = lrcText.split("\n");
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
      const totalMs = min * 60000 + sec * 1000 + ms;
      const text = line.replace(timeRegex, "").trim();
      if (text) {
        result.push({ startMs: totalMs, text });
      }
    }
  }
  return result;
}

/**
 * Web Audio PCM Stream Player
 * Streams 16-bit little-endian stereo PCM chunks directly from HTTP readable stream.
 */
export class MarucastPcmStreamPlayer {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private abortController: AbortController | null = null;
  private pendingBytes: Uint8Array = new Uint8Array(0);
  private scheduledTime = 0;
  private isStreaming = false;
  private sampleRate = 44100;
  private channelCount = 2;
  private volume = 1.0;
  private latencyOffsetMs = 0;

  public init(): AudioContext {
    if (this.ctx && this.ctx.state !== "closed") {
      return this.ctx;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = this.volume;

    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 64;

    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);

    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1.5, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public setLatencyOffset(offsetMs: number) {
    this.latencyOffsetMs = offsetMs;
  }

  public async startStream(streamUrl: string, onConnected?: () => void, onError?: (err: Error) => void) {
    this.stop();
    this.init();

    if (this.ctx?.state === "suspended") {
      await this.ctx.resume();
    }

    this.abortController = new AbortController();
    this.isStreaming = true;
    this.pendingBytes = new Uint8Array(0);
    this.scheduledTime = 0;

    try {
      const response = await fetch(streamUrl, {
        cache: "no-store",
        mode: "cors",
        signal: this.abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP Stream failed with status: ${response.status}`);
      }

      // Check headers for dynamic audio parameters
      const headerRate = parseInt(response.headers.get("X-Maru-Sample-Rate") || "", 10);
      const headerChannels = parseInt(response.headers.get("X-Maru-Channel-Count") || "", 10);
      if (headerRate && headerRate >= 8000) this.sampleRate = headerRate;
      if (headerChannels && (headerChannels === 1 || headerChannels === 2)) this.channelCount = headerChannels;

      onConnected?.();

      const reader = response.body.getReader();
      let isFirstChunk = true;

      while (this.isStreaming) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value || value.length === 0) continue;

        let chunk = value;
        // Strip 44-byte WAV header if first chunk has 'RIFF'
        if (isFirstChunk) {
          isFirstChunk = false;
          if (
            chunk.length >= 44 &&
            chunk[0] === 0x52 &&
            chunk[1] === 0x49 &&
            chunk[2] === 0x46 &&
            chunk[3] === 0x46
          ) {
            chunk = chunk.slice(44);
          }
        }

        if (chunk.length > 0) {
          this.appendPcmChunk(chunk);
        }
      }
    } catch (err) {
      if (!this.abortController?.signal.aborted) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  private appendPcmChunk(chunk: Uint8Array) {
    const merged = new Uint8Array(this.pendingBytes.length + chunk.length);
    merged.set(this.pendingBytes);
    merged.set(chunk, this.pendingBytes.length);
    this.pendingBytes = merged;

    const bytesPerFrame = this.channelCount * 2;
    const chunkFrames = 4096; // ~93ms chunks at 44.1kHz
    const chunkByteLength = chunkFrames * bytesPerFrame;

    while (this.pendingBytes.length >= chunkByteLength) {
      const nextChunk = this.pendingBytes.slice(0, chunkByteLength);
      this.pendingBytes = this.pendingBytes.slice(chunkByteLength);
      this.scheduleChunk(nextChunk);
    }
  }

  private scheduleChunk(rawChunk: Uint8Array) {
    if (!this.ctx || this.ctx.state === "closed") return;

    const frameCount = Math.floor(rawChunk.length / (this.channelCount * 2));
    if (frameCount <= 0) return;

    const audioBuffer = this.ctx.createBuffer(this.channelCount, frameCount, this.sampleRate);
    const view = new DataView(rawChunk.buffer, rawChunk.byteOffset, frameCount * this.channelCount * 2);

    for (let frame = 0; frame < frameCount; frame++) {
      for (let ch = 0; ch < this.channelCount; ch++) {
        const sampleInt16 = view.getInt16((frame * this.channelCount + ch) * 2, true);
        audioBuffer.getChannelData(ch)[frame] = sampleInt16 / 32768;
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode!);

    const lookahead = 0.06; // 60ms safe lookahead
    const delaySec = Math.max(0, this.latencyOffsetMs / 1000);
    const currentTime = this.ctx.currentTime;
    const startTime = Math.max(currentTime + lookahead + delaySec, this.scheduledTime || (currentTime + lookahead + delaySec));

    this.scheduledTime = startTime + audioBuffer.duration;
    source.start(startTime);
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(32);
    const buffer = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(buffer);
    return buffer;
  }

  public stop() {
    this.isStreaming = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.pendingBytes = new Uint8Array(0);
    this.scheduledTime = 0;
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.gainNode = null;
    this.analyserNode = null;
  }
}
