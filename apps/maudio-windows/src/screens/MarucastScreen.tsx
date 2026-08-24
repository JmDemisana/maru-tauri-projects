import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  createReceiverSession,
  fetchReceiverStatus,
  sendRemoteCommand,
  fetchTrackLyrics,
  MarucastPcmStreamPlayer,
  MarucastSessionData,
  MarucastReceiverStatus,
  MarucastLyricLine,
  MarucastLyricsData,
} from "../utils/marucastClient";

// ── Style constants (mirroring the web applet) ───────────────────────────────

const sectionEyebrowStyle: React.CSSProperties = {
  letterSpacing: "0.1em",
  fontSize: "0.78rem",
  fontWeight: 700,
  marginBottom: "0.9rem",
  opacity: 0.72,
  textTransform: "uppercase",
};

const bodyCopyStyle: React.CSSProperties = {
  margin: 0,
  lineHeight: 1.68,
  color: "rgba(245,248,255,0.84)",
};

const cardStyle: React.CSSProperties = {
  borderRadius: "1.25rem",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(10,14,24,0.86)",
  padding: "1.15rem",
  boxShadow: "0 18px 44px rgba(0,0,0,0.2)",
};

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.14)",
  padding: "0.48rem 0.82rem",
  fontSize: "0.82rem",
  fontWeight: 700,
  color: "rgba(245,248,255,0.88)",
  background: "rgba(15,18,28,0.82)",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPlaybackTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "--:--";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatReceiverExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) return "Refreshing PIN...";
  const totalSec = Math.max(1, Math.ceil(remaining / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m <= 0 ? `PIN refreshes in ${s}s` : `PIN refreshes in ${m}m ${String(s).padStart(2, "0")}s`;
}

function findActiveLyricIndex(lines: MarucastLyricLine[], posMs: number | null): number {
  if (posMs === null) return -1;
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    const start = lines[i].startMs;
    if (start === null) continue;
    if (start <= posMs) {
      active = i;
      continue;
    }
    break;
  }
  return active;
}

// ── Lyric CSS animations as inline <style> ───────────────────────────────────

const LYRIC_KEYFRAMES = `
@keyframes marucastLyricHeadlineIn {
  0% { opacity: 0; transform: translate3d(0, 20px, 0) scale(0.985); filter: blur(10px); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
}
@keyframes marucastLyricSideIn {
  0% { opacity: 0; transform: translate3d(0, 10px, 0); filter: blur(6px); }
  100% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); }
}
`;

// ── SVG glyphs (same ones from the web applet) ───────────────────────────────

function renderGlyph(
  glyph: "previous" | "playpause" | "next" | "disc" | "back" | "speaker",
  size: number,
  playing = false,
  color = "currentColor"
) {
  const common = {
    fill: "none" as const,
    stroke: color,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
  };

  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} style={{ display: "block" }}>
      {glyph === "playpause" && !playing && (
        <path d="M9 7.5 17 12l-8 4.5z" fill={color} stroke="none" />
      )}
      {glyph === "playpause" && playing && (
        <>
          <rect x="8" y="7" width="2.8" height="10" rx="1" fill={color} stroke="none" />
          <rect x="13.2" y="7" width="2.8" height="10" rx="1" fill={color} stroke="none" />
        </>
      )}
      {glyph === "previous" && (
        <>
          <path d="M16 7.5 9.5 12 16 16.5z" fill={color} stroke="none" />
          <path d="M9.5 7.5 3 12l6.5 4.5z" fill={color} stroke="none" />
          <path d="M19.5 7v10" {...common} />
        </>
      )}
      {glyph === "next" && (
        <>
          <path d="M8 7.5 14.5 12 8 16.5z" fill={color} stroke="none" />
          <path d="M14.5 7.5 21 12l-6.5 4.5z" fill={color} stroke="none" />
          <path d="M4.5 7v10" {...common} />
        </>
      )}
      {glyph === "disc" && (
        <>
          <circle cx="12" cy="12" r="7.4" {...common} />
          <circle cx="12" cy="12" r="2.1" {...common} />
        </>
      )}
      {glyph === "back" && (
        <>
          <path d="M10.5 7.2 5.7 12l4.8 4.8" {...common} />
          <path d="M6.2 12h12.1" {...common} />
        </>
      )}
      {glyph === "speaker" && (
        <>
          <path d="M4.5 10h3.2l4.3-3.4v10.8L7.7 14H4.5z" {...common} />
          <path d="M15.4 9.2a4.1 4.1 0 0 1 0 5.6" {...common} />
          <path d="M17.8 7a7 7 0 0 1 0 10" {...common} />
        </>
      )}
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export const MarucastScreen: React.FC = () => {
  // Session state
  const [session, setSession] = useState<MarucastSessionData | null>(null);
  const [expiryLabel, setExpiryLabel] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Receiver status & stream
  const [status, setStatus] = useState<MarucastReceiverStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Playback tracking
  const [playbackPosMs, setPlaybackPosMs] = useState<number>(0);
  const [anchoredAtMs, setAnchoredAtMs] = useState<number | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Lyrics
  const [lyricsData, setLyricsData] = useState<MarucastLyricsData | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const currentTrackKeyRef = useRef<string>("");

  // Volume / latency
  const [volume, setVolume] = useState(1.0);
  const [manualDelayMs, setManualDelayMs] = useState(0);

  // Player
  const playerRef = useRef<MarucastPcmStreamPlayer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────

  const receiverDevice = status?.deviceName ?? null;
  const receiverApp = status?.mediaAppLabel ?? null;
  const receiverTitle = status?.mediaTitle ?? null;
  const receiverArtist = status?.mediaArtist ?? null;
  const receiverArtworkUrl = status?.artworkUrl ?? null;
  const remoteMediaPlaying = status?.mediaPlaying ?? false;
  const receiverDuration = status?.mediaDurationMs ?? null;

  // Live playback position estimation
  const displayedPosition = useMemo(() => {
    if (!isAdvancing || anchoredAtMs === null) return playbackPosMs;
    const elapsed = Date.now() - anchoredAtMs;
    return Math.max(0, playbackPosMs + elapsed);
  }, [isAdvancing, anchoredAtMs, playbackPosMs]);

  const progressRatio =
    receiverDuration && receiverDuration > 0
      ? Math.min(1, displayedPosition / receiverDuration)
      : 0;

  // Active lyric lines
  const activeIndex = useMemo(
    () => findActiveLyricIndex(lyricsData?.lines ?? [], displayedPosition - (manualDelayMs < 0 ? -manualDelayMs : 0)),
    [lyricsData, displayedPosition, manualDelayMs]
  );
  const prevLyricLine = activeIndex > 0 ? lyricsData?.lines[activeIndex - 1] ?? null : null;
  const activeLyricLine = activeIndex >= 0 ? lyricsData?.lines[activeIndex] ?? null : null;
  const nextLyricLine =
    lyricsData && activeIndex < lyricsData.lines.length - 1
      ? lyricsData.lines[activeIndex + 1] ?? null
      : null;
  const syncedLyricsAvailable =
    lyricsData?.synced === true &&
    lyricsData.lines.length > 0 &&
    (activeLyricLine !== null || nextLyricLine !== null);

  // Formatted pairing code with individual digit boxes
  const pairingDigits = useMemo(() => {
    const raw = session?.pairingCode ?? "";
    return raw.split("");
  }, [session?.pairingCode]);

  // ── Session initialization ────────────────────────────────────────────────

  const startNewSession = useCallback(async () => {
    setIsLoadingSession(true);
    setSessionError(null);
    try {
      const data = await createReceiverSession();
      setSession(data);
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : "Failed to generate PIN.");
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    playerRef.current = new MarucastPcmStreamPlayer();
    startNewSession();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      playerRef.current?.stop();
    };
  }, []);

  // ── Expiry countdown ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!session || isConnected) return;

    const tick = () => {
      const label = formatReceiverExpiry(session.expiresAt);
      setExpiryLabel(label);

      const remaining = new Date(session.expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        startNewSession();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session, isConnected, startNewSession]);

  // ── Status polling ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session?.token || isConnected) return;

    const poll = async () => {
      try {
        const s = await fetchReceiverStatus(session.token);
        setStatus(s);

        if (s.status === "ready" && s.relayUrl && !isConnected) {
          setIsConnected(true);
          handleConnectToStream(s.relayUrl, s);
        }
      } catch {
        // Ignore polling errors
      }
    };

    const interval = setInterval(poll, 1300);
    return () => clearInterval(interval);
  }, [session?.token, isConnected]);

  // ── Status sync when connected ────────────────────────────────────────────

  useEffect(() => {
    if (!session?.token || !isConnected) return;

    const poll = async () => {
      try {
        const s = await fetchReceiverStatus(session.token);
        setStatus((prev) => {
          // Update playback anchor when position changes
          if (
            s.mediaPositionMs !== null &&
            s.mediaPositionMs !== undefined &&
            s.mediaPositionMs !== prev?.mediaPositionMs
          ) {
            setPlaybackPosMs(s.mediaPositionMs);
            setAnchoredAtMs(Date.now());
            setIsAdvancing(s.mediaPlaying ?? false);
          } else if ((s.mediaPlaying ?? false) !== (prev?.mediaPlaying ?? false)) {
            setIsAdvancing(s.mediaPlaying ?? false);
            setAnchoredAtMs(Date.now());
          }
          return s;
        });
      } catch {
        // Ignore
      }
    };

    const interval = setInterval(poll, 1300);
    return () => clearInterval(interval);
  }, [session?.token, isConnected]);

  // ── Connect to PCM stream ─────────────────────────────────────────────────

  const handleConnectToStream = useCallback(
    async (relayUrl: string, s: MarucastReceiverStatus) => {
      if (!playerRef.current) return;
      setStreamError(null);

      // Seed initial position
      if (s.mediaPositionMs != null) {
        setPlaybackPosMs(s.mediaPositionMs);
        setAnchoredAtMs(Date.now());
        setIsAdvancing(s.mediaPlaying ?? false);
      }

      try {
        playerRef.current.setVolume(volume);
        playerRef.current.setLatencyOffset(manualDelayMs);
        await playerRef.current.startStream(
          relayUrl,
          () => setIsStreamActive(true),
          (err) => {
            setStreamError(err.message);
            setIsStreamActive(false);
          }
        );
      } catch (e) {
        setStreamError(e instanceof Error ? e.message : "Stream connection failed.");
      }
    },
    [volume, manualDelayMs]
  );

  // ── Fetch lyrics on track change ──────────────────────────────────────────

  useEffect(() => {
    const title = status?.mediaTitle?.trim();
    const artist = status?.mediaArtist?.trim();
    if (!title || !isConnected) return;

    const key = `${title}::${artist ?? ""}`;
    if (currentTrackKeyRef.current === key) return;
    currentTrackKeyRef.current = key;

    setLyricsLoading(true);
    setLyricsData(null);
    fetchTrackLyrics(title, artist ?? "")
      .then((data) => setLyricsData(data))
      .finally(() => setLyricsLoading(false));
  }, [status?.mediaTitle, status?.mediaArtist, isConnected]);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const handleDisconnect = useCallback(() => {
    playerRef.current?.stop();
    setIsConnected(false);
    setIsStreamActive(false);
    setStatus(null);
    setLyricsData(null);
    setPlaybackPosMs(0);
    setAnchoredAtMs(null);
    setIsAdvancing(false);
    currentTrackKeyRef.current = "";
    startNewSession();
  }, [startNewSession]);

  // ── Remote transport ──────────────────────────────────────────────────────

  const handleCommand = useCallback(
    async (cmd: "play" | "pause" | "previous" | "next") => {
      if (!session?.token) return;
      await sendRemoteCommand(session.token, cmd, status?.relayUrl);
      if (status) {
        if (cmd === "play") {
          setStatus({ ...status, mediaPlaying: true });
          setIsAdvancing(true);
          setAnchoredAtMs(Date.now());
        }
        if (cmd === "pause") {
          setStatus({ ...status, mediaPlaying: false });
          setIsAdvancing(false);
          setPlaybackPosMs(displayedPosition);
        }
      }
    },
    [session?.token, status, displayedPosition]
  );

  // ── Resolved output label (mirrors "Playing on ...") ─────────────────────

  const nowPlayingOutputLabel = "Playing on This PC";

  // ── Render: waiting state ─────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "clamp(1rem, 4vw, 2rem)",
          overflowY: "auto",
          flex: 1,
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <section
            style={{
              ...cardStyle,
              padding: "clamp(1.2rem, 4vw, 1.8rem)",
            }}
          >
            <div style={sectionEyebrowStyle}>Marucast Wireless Receiver</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
                gap: "clamp(1.2rem, 3vw, 1.8rem)",
                alignItems: "stretch",
              }}
            >
              {/* Left: PIN Pairing Card */}
              <div
                style={{
                  ...cardStyle,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "1.2rem",
                  minHeight: "340px",
                  padding: "1.4rem",
                  background: "linear-gradient(145deg, rgba(255, 107, 157, 0.08) 0%, rgba(22, 16, 38, 0.75) 100%)",
                  border: "1px solid rgba(255, 107, 157, 0.35)",
                  borderRadius: "1.2rem",
                  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
                  textAlign: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.3rem" }}>📻</span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "#ff6b9d",
                    }}
                  >
                    Pairing PIN
                  </span>
                </div>

                {isLoadingSession || pairingDigits.length === 0 ? (
                  <div
                    style={{
                      width: "100%",
                      minHeight: "120px",
                      borderRadius: "1rem",
                      border: "1px dashed rgba(255,255,255,0.16)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(245,248,255,0.84)",
                    }}
                  >
                    Creating fresh 6-digit PIN...
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.85rem",
                      width: "100%",
                    }}
                  >
                    {/* Individual digit boxes — matches the web applet exactly */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.45rem",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "0.85rem 1rem",
                        background: "rgba(0, 0, 0, 0.45)",
                        borderRadius: "1rem",
                        border: "1px solid rgba(255, 107, 157, 0.3)",
                      }}
                    >
                      {pairingDigits.map((digit, i) => (
                        <span
                          key={i}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "clamp(2rem, 4.5vw, 2.5rem)",
                            height: "clamp(2.6rem, 5.5vw, 3.3rem)",
                            fontSize: "clamp(1.6rem, 3.8vw, 2.1rem)",
                            fontWeight: 900,
                            fontFamily: "monospace",
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 107, 157, 0.45)",
                            borderRadius: "0.5rem",
                            color: "#ffffff",
                            textShadow: "0 0 12px rgba(255, 107, 157, 0.6)",
                          }}
                        >
                          {digit}
                        </span>
                      ))}
                    </div>

                    <p style={{ ...bodyCopyStyle, margin: "0.2rem 0 0 0", fontSize: "0.92rem", opacity: 0.9 }}>
                      Enter this 6-digit PIN in MAudio to connect this receiver.
                    </p>

                    {expiryLabel && (
                      <span
                        style={{
                          ...statusBadgeStyle,
                          background: "rgba(255, 107, 157, 0.15)",
                          border: "1px solid rgba(255, 107, 157, 0.35)",
                          color: "#ff6b9d",
                        }}
                      >
                        ⏱ {expiryLabel}
                      </span>
                    )}
                  </div>
                )}

                {sessionError && (
                  <p style={{ ...bodyCopyStyle, color: "#f87171", fontSize: "0.84rem" }}>
                    {sessionError}
                  </p>
                )}

                <button
                  onClick={startNewSession}
                  disabled={isLoadingSession}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "rgba(245,248,255,0.88)",
                    borderRadius: "999px",
                    padding: "0.5rem 1.1rem",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Get New PIN
                </button>
              </div>

              {/* Right: Ways to use Marucast */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h2
                    style={{
                      marginTop: 0,
                      marginBottom: "0.4rem",
                      fontSize: "clamp(1.7rem, 3.2vw, 2.2rem)",
                      lineHeight: 1.08,
                      fontWeight: 800,
                      color: "rgba(250,252,255,0.96)",
                    }}
                  >
                    Ways to use Marucast
                  </h2>
                  <p style={{ ...bodyCopyStyle, fontSize: "0.92rem", margin: "0 0 1rem 0", opacity: 0.8 }}>
                    Cast lossless wireless audio, synchronized lyrics, and media metadata across screens.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    {/* MAudio Android */}
                    <div
                      style={{
                        ...cardStyle,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.85rem 1rem",
                        borderRadius: "0.85rem",
                        border: "1px solid rgba(77, 218, 142, 0.4)",
                        background: "rgba(77, 218, 142, 0.06)",
                        gap: "0.8rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "1.5rem" }}>📱</span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#ffffff" }}>
                              MAudio for Android
                            </span>
                            <span
                              style={{
                                fontSize: "0.65rem",
                                padding: "0.12rem 0.4rem",
                                borderRadius: "999px",
                                background: "rgba(77, 218, 142, 0.22)",
                                color: "#4dda8e",
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
                              Available
                            </span>
                          </div>
                          <p style={{ ...bodyCopyStyle, margin: "0.1rem 0 0 0", fontSize: "0.8rem", opacity: 0.75 }}>
                            Lossless streaming, live scrobbling & notification mirroring.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Marucast for Android TV */}
                    <div
                      style={{
                        ...cardStyle,
                        display: "flex",
                        alignItems: "center",
                        padding: "0.85rem 1rem",
                        borderRadius: "0.85rem",
                        border: "1px solid rgba(100, 180, 255, 0.25)",
                        background: "rgba(100, 180, 255, 0.04)",
                        gap: "0.8rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "1.5rem" }}>📺</span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#ffffff" }}>
                              Marucast for Android TV
                            </span>
                            <span
                              style={{
                                fontSize: "0.65rem",
                                padding: "0.12rem 0.4rem",
                                borderRadius: "999px",
                                background: "rgba(100, 180, 255, 0.18)",
                                color: "#64b4ff",
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
                              Coming Soon
                            </span>
                          </div>
                          <p style={{ ...bodyCopyStyle, margin: "0.1rem 0 0 0", fontSize: "0.8rem", opacity: 0.75 }}>
                            Living room big-screen receiver with full remote navigation.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Marucast for Windows */}
                    <div
                      style={{
                        ...cardStyle,
                        display: "flex",
                        alignItems: "center",
                        padding: "0.85rem 1rem",
                        borderRadius: "0.85rem",
                        border: "1px solid rgba(200, 140, 255, 0.4)",
                        background: "rgba(200, 140, 255, 0.08)",
                        gap: "0.8rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{ fontSize: "1.5rem" }}>🪟</span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#ffffff" }}>
                              MAudio for Windows
                            </span>
                            <span
                              style={{
                                fontSize: "0.65rem",
                                padding: "0.12rem 0.4rem",
                                borderRadius: "999px",
                                background: "rgba(200, 140, 255, 0.22)",
                                color: "#c88cff",
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
                              This App
                            </span>
                          </div>
                          <p style={{ ...bodyCopyStyle, margin: "0.1rem 0 0 0", fontSize: "0.8rem", opacity: 0.75 }}>
                            Native desktop receiver with system tray audio & lossless PCM playback.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Volume */}
                <div
                  style={{
                    ...cardStyle,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.9rem",
                    padding: "0.85rem 1rem",
                  }}
                >
                  <span style={{ fontSize: "1.1rem", opacity: 0.8 }}>🔊</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "rgba(245,248,255,0.88)", marginBottom: "0.3rem" }}>
                      Receiver Volume — {Math.round(volume * 100)}%
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.01"
                      value={volume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setVolume(v);
                        playerRef.current?.setVolume(v);
                      }}
                      style={{ width: "100%", accentColor: "#ff6b9d", cursor: "pointer" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ── Render: connected / live stream state (full-bleed, no outer card, matches web) ──

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(4,6,14,0.99) 0%, rgba(2,3,9,1) 100%)",
      }}
    >
      <style>{LYRIC_KEYFRAMES}</style>

      {/* Album art ambient blur background */}
      {receiverArtworkUrl && (
        <>
          <img
            src={receiverArtworkUrl}
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              inset: "-16%",
              width: "132%",
              height: "132%",
              objectFit: "cover",
              filter: "blur(72px) saturate(1.16)",
              opacity: 0.26,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 72% 28%, rgba(255,107,157,0.18) 0%, transparent 28%), linear-gradient(180deg, rgba(4,6,14,0.76) 0%, rgba(2,3,9,0.92) 100%)",
            }}
          />
        </>
      )}

      {/* Grid layout: header / content / footer */}
      <div
        style={{
          position: "relative",
          minHeight: 0,
          height: "100%",
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
          gap: "clamp(0.75rem, 2vh, 1.2rem)",
          padding: "clamp(1rem, 2.6vw, 2rem)",
        }}
      >
        {/* Header row: output label + live badge + disconnect */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.72rem", minWidth: 0 }}>
            <span
              style={{
                width: "2.15rem",
                height: "2.15rem",
                borderRadius: "999px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(180deg, rgba(30,36,58,0.94) 0%, rgba(10,13,24,0.98) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {renderGlyph("disc", 16, false, "rgba(250,252,255,0.96)")}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.08rem", minWidth: 0 }}>
              <div style={{ ...sectionEyebrowStyle, marginBottom: 0 }}>{nowPlayingOutputLabel}</div>
              <div
                style={{
                  fontSize: "0.86rem",
                  lineHeight: 1.4,
                  color: "rgba(245,248,255,0.72)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {receiverApp
                  ? `From ${receiverApp}${receiverDevice ? ` | Broadcast from ${receiverDevice}` : ""}`
                  : receiverDevice
                  ? `Broadcast from ${receiverDevice}`
                  : "Broadcast from MAudio"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                padding: "0.4rem 0.85rem",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "rgba(245,248,255,0.85)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "999px",
                  background: "#ff71a2",
                  boxShadow: "0 0 10px #ff71a2",
                }}
              />
              Marucast Live
            </div>

            <button
              onClick={handleDisconnect}
              style={{
                background: "rgba(239,68,68,0.18)",
                border: "1px solid rgba(239,68,68,0.4)",
                color: "#f87171",
                borderRadius: "999px",
                padding: "0.4rem 0.9rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Middle: lyrics (left) + artwork + track info (right) */}
        <div
          style={{
            minHeight: 0,
            display: "grid",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.44fr) minmax(210px, 0.58fr)",
              gap: "clamp(1rem, 2.8vw, 1.8rem)",
              alignItems: "stretch",
              width: "100%",
              minHeight: 0,
            }}
          >
            {/* Left: Lyrics */}
            <div
              style={{
                minWidth: 0,
                minHeight: 0,
                alignSelf: "stretch",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                aria-live="polite"
                style={{
                  width: "min(100%, 1120px)",
                  minHeight: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "clamp(0.78rem, 2vh, 1.2rem)",
                  textAlign: "left",
                  paddingBlock: "clamp(0.35rem, 1.2vh, 0.8rem)",
                }}
              >
                <div
                  style={{
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    flex: 1,
                    gap: "clamp(0.78rem, 2vh, 1.2rem)",
                  }}
                >
                  <div style={{ ...sectionEyebrowStyle, marginBottom: 0, opacity: 0.54 }}>Lyrics</div>

                  {syncedLyricsAvailable ? (
                    <>
                      {prevLyricLine ? (
                        <div
                          key={`prev-${prevLyricLine.startMs ?? prevLyricLine.text}`}
                          style={{
                            fontSize: "clamp(1.02rem, 1.22vw, 1.28rem)",
                            lineHeight: 1.36,
                            color: "rgba(244,247,255,0.34)",
                            textWrap: "balance" as never,
                            animation: "marucastLyricSideIn 360ms cubic-bezier(0.22, 0.8, 0.22, 1) both",
                            willChange: "transform, opacity, filter",
                          }}
                        >
                          {prevLyricLine.text}
                        </div>
                      ) : (
                        <div style={{ minHeight: "1.5rem" }} />
                      )}

                      <div
                        key={`active-${(activeLyricLine || nextLyricLine)?.startMs ?? (activeLyricLine || nextLyricLine)?.text ?? "empty"}`}
                        style={{
                          fontSize: "clamp(3.2rem, 6.2vw, 5.6rem)",
                          lineHeight: 0.96,
                          fontWeight: 760,
                          color: "rgba(250,252,255,0.92)",
                          textWrap: "balance" as never,
                          letterSpacing: "-0.03em",
                          textShadow: "0 0 28px rgba(255,255,255,0.06)",
                          animation: "marucastLyricHeadlineIn 460ms cubic-bezier(0.2, 0.82, 0.2, 1) both",
                          willChange: "transform, opacity, filter",
                        }}
                      >
                        {(activeLyricLine || nextLyricLine)?.text ?? ""}
                      </div>

                      {nextLyricLine ? (
                        <div
                          key={`next-${nextLyricLine.startMs ?? nextLyricLine.text}`}
                          style={{
                            fontSize: "clamp(1.02rem, 1.22vw, 1.28rem)",
                            lineHeight: 1.36,
                            color: "rgba(244,247,255,0.34)",
                            textWrap: "balance" as never,
                            animation: "marucastLyricSideIn 400ms cubic-bezier(0.22, 0.8, 0.22, 1) both",
                            willChange: "transform, opacity, filter",
                          }}
                        >
                          {nextLyricLine.text}
                        </div>
                      ) : (
                        <div style={{ minHeight: "1.5rem" }} />
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        fontSize: "clamp(0.92rem, 1vw, 1.02rem)",
                        lineHeight: 1.55,
                        color: "rgba(245,248,255,0.46)",
                        maxWidth: "40rem",
                      }}
                    >
                      {lyricsLoading
                        ? "Finding synced lyrics..."
                        : lyricsData && !lyricsData.synced
                        ? "Lyrics found, but they are not time-coded."
                        : "No synced lyrics yet."}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Artwork + track metadata + option rows */}
            <div
              style={{
                minWidth: 0,
                alignSelf: "center",
                display: "flex",
                alignItems: "center",
                gap: "clamp(0.9rem, 1.8vw, 1.25rem)",
              }}
            >
              {/* Artwork */}
              <div
                style={{
                  position: "relative",
                  width: "132px",
                  minWidth: "132px",
                  borderRadius: "0.92rem",
                  overflow: "hidden",
                  aspectRatio: "1 / 1",
                  border: "1px solid rgba(255,255,255,0.16)",
                  boxShadow: "0 18px 38px rgba(0,0,0,0.24)",
                  background:
                    "radial-gradient(circle at top left, rgba(255,107,157,0.24), rgba(6,10,20,0.96) 62%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {receiverArtworkUrl ? (
                  <img
                    src={receiverArtworkUrl}
                    alt={receiverTitle ? `${receiverTitle} artwork` : "Current artwork"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span
                    style={{
                      width: "3.6rem",
                      height: "3.6rem",
                      borderRadius: "999px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,107,157,0.18)",
                    }}
                  >
                    {renderGlyph("disc", 24, false, "rgba(250,252,255,0.96)")}
                  </span>
                )}
              </div>

              {/* Track text */}
              <div
                style={{
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "0.48rem",
                  textAlign: "left",
                }}
              >
                <div style={{ ...sectionEyebrowStyle, marginBottom: 0, opacity: 0.5 }}>Now Playing</div>
                <div
                  style={{
                    fontSize: "clamp(1.12rem, 1.9vw, 1.58rem)",
                    fontWeight: 700,
                    lineHeight: 1.08,
                    letterSpacing: "-0.02em",
                    overflowWrap: "anywhere",
                    maxWidth: "min(240px, 100%)",
                    color: "rgba(250,252,255,0.84)",
                  }}
                >
                  {receiverTitle ?? "Live Audio Stream"}
                </div>
                <div
                  style={{
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                    color: "rgba(248,250,255,0.66)",
                    maxWidth: "min(220px, 100%)",
                  }}
                >
                  {receiverArtist ?? receiverApp ?? "Waiting for source details from the phone."}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: progress bar + transport controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.48rem" }}>
          {/* Progress bar */}
          <div
            style={{
              height: "4px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.12)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max(progressRatio * 100, progressRatio > 0 ? 1.2 : 0)}%`,
                height: "100%",
                borderRadius: "inherit",
                background:
                  "linear-gradient(90deg, rgba(255,107,157,0.9) 0%, rgba(235,240,255,0.95) 100%)",
                boxShadow: "0 0 14px rgba(255,107,157,0.3)",
                transition: "width 180ms linear",
              }}
            />
          </div>

          {/* Timestamp + status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.8rem",
              flexWrap: "wrap",
              fontSize: "0.82rem",
              lineHeight: 1.5,
              color: "rgba(245,248,255,0.65)",
            }}
          >
            <span>Cast active</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatPlaybackTime(displayedPosition)} / {formatPlaybackTime(receiverDuration)}
            </span>
          </div>

          {/* Transport controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.55rem",
              paddingTop: "0.3rem",
            }}
          >
            {/* Left: Previous / Play-Pause / Next */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <button
                onClick={() => handleCommand("previous")}
                aria-label="Previous"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "rgba(250,252,255,0.97)",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: "3.75rem",
                    height: "3.75rem",
                    borderRadius: "999px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(180deg, rgba(27,34,58,0.92) 0%, rgba(8,12,24,0.96) 100%)",
                    border: "1px solid rgba(130,170,255,0.42)",
                    boxShadow: "0 14px 28px rgba(0,0,0,0.2)",
                  }}
                >
                  {renderGlyph("previous", 24, false, "rgba(250,252,255,0.96)")}
                </span>
              </button>

              <button
                onClick={() => handleCommand(remoteMediaPlaying ? "pause" : "play")}
                aria-label={remoteMediaPlaying ? "Pause" : "Play"}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "rgba(250,252,255,0.97)",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: "4.6rem",
                    height: "4.6rem",
                    borderRadius: "999px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "linear-gradient(180deg, rgba(255,107,157,0.44) 0%, rgba(11,16,30,0.96) 100%)",
                    border: "1px solid rgba(130,170,255,0.42)",
                    boxShadow: "0 18px 34px rgba(0,0,0,0.26)",
                  }}
                >
                  {renderGlyph("playpause", 30, remoteMediaPlaying, "rgba(250,252,255,0.96)")}
                </span>
              </button>

              <button
                onClick={() => handleCommand("next")}
                aria-label="Next"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "rgba(250,252,255,0.97)",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: "3.75rem",
                    height: "3.75rem",
                    borderRadius: "999px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(180deg, rgba(27,34,58,0.92) 0%, rgba(8,12,24,0.96) 100%)",
                    border: "1px solid rgba(130,170,255,0.42)",
                    boxShadow: "0 14px 28px rgba(0,0,0,0.2)",
                  }}
                >
                  {renderGlyph("next", 24, false, "rgba(250,252,255,0.96)")}
                </span>
              </button>
            </div>

            {/* Right: Latency trim + volume */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "0.55rem",
                  width: "min(100%, 180px)",
                }}
              >
                <button
                  onClick={() => {
                    const next = Math.max(-4000, manualDelayMs - 250);
                    setManualDelayMs(next);
                    playerRef.current?.setLatencyOffset(next);
                  }}
                  style={{
                    height: "2.4rem",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "linear-gradient(180deg, rgba(20,24,38,0.48) 0%, rgba(8,11,20,0.72) 100%)",
                    color: "rgba(252,252,255,0.97)",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  − Delay
                </button>
                <button
                  onClick={() => {
                    const next = Math.min(4000, manualDelayMs + 250);
                    setManualDelayMs(next);
                    playerRef.current?.setLatencyOffset(next);
                  }}
                  style={{
                    height: "2.4rem",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "linear-gradient(180deg, rgba(20,24,38,0.48) 0%, rgba(8,11,20,0.72) 100%)",
                    color: "rgba(252,252,255,0.97)",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  + Delay
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "140px" }}>
                {renderGlyph("speaker", 20, false, "rgba(245,248,255,0.7)")}
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    playerRef.current?.setVolume(v);
                  }}
                  style={{ flex: 1, accentColor: "#ff71a2", cursor: "pointer" }}
                />
              </div>
            </div>
          </div>

          {/* Delay status */}
          {manualDelayMs !== 0 && (
            <div style={{ fontSize: "0.74rem", color: "rgba(245,248,255,0.56)", lineHeight: 1.45 }}>
              Current trim: {manualDelayMs > 0 ? `+${manualDelayMs}ms` : `${manualDelayMs}ms`} — This trims this receiver's seekbar and lyric timing.
            </div>
          )}

          {streamError && (
            <div style={{ fontSize: "0.78rem", color: "#f87171", lineHeight: 1.45 }}>
              Stream error: {streamError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
