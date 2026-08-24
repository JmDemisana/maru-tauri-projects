import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  createReceiverSession,
  fetchReceiverStatus,
  fetchLocalRelayStatus,
  fetchTrackLyrics,
  MarucastPcmStreamPlayer,
  MarucastSessionData,
  MarucastReceiverStatus,
  LocalRelayStatus,
  MarucastLyricLine,
  MarucastLyricsData,
} from "../utils/marucastClient";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "--:--";
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const rem = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(rem) || rem <= 0) return "Refreshing PIN...";
  const s = Math.max(1, Math.ceil(rem / 1000));
  const m = Math.floor(s / 60);
  return m <= 0 ? `Refreshes in ${s}s` : `Refreshes in ${m}m ${String(s % 60).padStart(2, "0")}s`;
}

function findActiveLyric(lines: MarucastLyricLine[], posMs: number | null): number {
  if (posMs === null) return -1;
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].startMs;
    if (t === null) continue;
    if (t <= posMs) { active = i; continue; }
    break;
  }
  return active;
}

// ── SVG player glyphs matching the web applet exactly ────────────────────────

function Glyph({ glyph, size = 24, color = "currentColor" }: {
  glyph: "disc";
  size?: number;
  color?: string;
}) {
  const s = { fill: "none" as const, stroke: color, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.9 };
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} style={{ display: "block" }}>
      {glyph === "disc" && <>
        <circle cx="12" cy="12" r="7.4" {...s} />
        <circle cx="12" cy="12" r="2.1" {...s} />
      </>}
    </svg>
  );
}

// ── Lyric animations ─────────────────────────────────────────────────────────
const LYRIC_CSS = `
@keyframes lyricHeadIn {
  from { opacity:0; transform:translate3d(0,20px,0) scale(0.985); filter:blur(10px); }
  to   { opacity:1; transform:translate3d(0,0,0)   scale(1);     filter:blur(0);    }
}
@keyframes lyricSideIn {
  from { opacity:0; transform:translate3d(0,10px,0); filter:blur(6px); }
  to   { opacity:1; transform:translate3d(0,0,0);    filter:blur(0);   }
}
`;

// ── Shared card style ─────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  borderRadius: "1.25rem",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(10,14,24,0.86)",
  padding: "1.15rem",
  boxShadow: "0 18px 44px rgba(0,0,0,0.2)",
};

const eyebrow: React.CSSProperties = {
  letterSpacing: "0.1em",
  fontSize: "0.78rem",
  fontWeight: 700,
  opacity: 0.72,
  textTransform: "uppercase",
  marginBottom: 0,
};

// ── Main Component ────────────────────────────────────────────────────────────
export const MarucastScreen: React.FC = () => {
  const [session, setSession] = useState<MarucastSessionData | null>(null);
  const [expiryLabel, setExpiryLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [serverStatus, setServerStatus] = useState<MarucastReceiverStatus | null>(null);
  const [relayStatus, setRelayStatus] = useState<LocalRelayStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Live position tracking
  const [posMs, setPosMs] = useState(0);
  const [anchorMs, setAnchorMs] = useState<number | null>(null);
  const [advancing, setAdvancing] = useState(false);

  // Lyrics
  const [lyrics, setLyrics] = useState<MarucastLyricsData | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const lyricTrackRef = useRef("");

  const playerRef = useRef<MarucastPcmStreamPlayer | null>(null);
  const relayUrlRef = useRef<string | null>(null);

  // ── Derived metadata: local relay wins over server status ─────────────────
  const title    = relayStatus?.mediaTitle    ?? serverStatus?.mediaTitle    ?? null;
  const artist   = relayStatus?.mediaArtist   ?? serverStatus?.mediaArtist   ?? null;
  const appLabel = relayStatus?.mediaAppLabel ?? serverStatus?.mediaAppLabel ?? null;
  const artwork  = relayStatus?.artworkUrl    ?? serverStatus?.artworkUrl    ?? null;
  const device   = relayStatus?.deviceName    ?? serverStatus?.deviceName    ?? null;
  const duration = relayStatus?.mediaDurationMs ?? serverStatus?.mediaDurationMs ?? null;
  const sourceLabel =
    appLabel && device ? `${appLabel} from ${device}` : appLabel ?? device ?? "MAudio";

  // Live estimated position
  const displayPos = useMemo(() => {
    if (!advancing || anchorMs === null) return posMs;
    return Math.max(0, posMs + (Date.now() - anchorMs));
  }, [advancing, anchorMs, posMs]);

  const progressRatio =
    duration && duration > 0 ? Math.min(1, displayPos / duration) : 0;

  // Panning lyric lines
  const lines = lyrics?.lines ?? [];
  const activeIdx = useMemo(() => findActiveLyric(lines, displayPos), [lines, displayPos]);
  const prevLine   = activeIdx > 0 ? lines[activeIdx - 1] : null;
  const activeLine = activeIdx >= 0 ? lines[activeIdx]     : null;
  const nextLine   = activeIdx >= 0 && activeIdx < lines.length - 1 ? lines[activeIdx + 1] : null;
  const hasSynced  = lyrics?.synced === true && (activeLine !== null || nextLine !== null);

  const pairingDigits = session?.pairingCode?.split("") ?? [];

  // ── New session ───────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setLoading(true);
    setSessionError(null);
    try {
      setSession(await createReceiverSession());
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : "Failed to generate PIN.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    playerRef.current = new MarucastPcmStreamPlayer();
    startSession();
    return () => { playerRef.current?.stop(); };
  }, []);

  // ── Expiry countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!session || isConnected) return;
    const tick = () => {
      setExpiryLabel(formatExpiry(session.expiresAt));
      if (new Date(session.expiresAt).getTime() - Date.now() <= 0) startSession();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session, isConnected, startSession]);

  // ── Connect stream ────────────────────────────────────────────────────────
  const connectStream = useCallback(async (relayUrl: string, s: MarucastReceiverStatus) => {
    relayUrlRef.current = relayUrl;
    setStreamError(null);
    if (s.mediaPositionMs != null) {
      setPosMs(s.mediaPositionMs);
      setAnchorMs(Date.now());
      setAdvancing(s.mediaPlaying ?? false);
    }
    try {
      playerRef.current?.setVolume(1);
      await playerRef.current?.startStream(
        relayUrl,
        undefined,
        (err) => setStreamError(err.message),
      );
    } catch (e) {
      setStreamError(e instanceof Error ? e.message : "Stream failed.");
    }
  }, []);

  // ── Pre-connect polling ───────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.token || isConnected) return;
    const poll = async () => {
      try {
        const s = await fetchReceiverStatus(session.token);
        setServerStatus(s);
        if (s.status === "ready" && s.relayUrl && !isConnected) {
          setIsConnected(true);
          connectStream(s.relayUrl, s);
        }
      } catch { /* ignore */ }
    };
    const id = setInterval(poll, 1300);
    return () => clearInterval(id);
  }, [session?.token, isConnected, connectStream]);

  // ── Connected: poll server status ─────────────────────────────────────────
  useEffect(() => {
    if (!session?.token || !isConnected) return;
    const poll = async () => {
      try {
        const s = await fetchReceiverStatus(session.token);
        setServerStatus(s);
        if (s.mediaPositionMs != null) {
          setPosMs(s.mediaPositionMs);
          setAnchorMs(Date.now());
          setAdvancing(s.mediaPlaying ?? false);
        }
      } catch { /* ignore */ }
    };
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [session?.token, isConnected]);

  // ── Connected: poll local relay status (live metadata) ───────────────────
  useEffect(() => {
    if (!isConnected || !relayUrlRef.current) return;
    const url = relayUrlRef.current;
    const poll = async () => {
      const s = await fetchLocalRelayStatus(url);
      if (s) {
        setRelayStatus(s);
        if (s.mediaPositionMs != null) {
          setPosMs(s.mediaPositionMs);
          setAnchorMs(
            typeof s.mediaPositionCapturedAtMs === "number" && s.mediaPositionCapturedAtMs > 0
              ? s.mediaPositionCapturedAtMs
              : Date.now()
          );
          setAdvancing(s.mediaPlaying ?? false);
        }
      }
    };
    const id = setInterval(poll, 1100);
    return () => clearInterval(id);
  }, [isConnected]);

  // ── Fetch lyrics on track change ──────────────────────────────────────────
  useEffect(() => {
    const t = title?.trim();
    const a = artist?.trim();
    if (!t || !isConnected) return;
    const key = `${t}::${a ?? ""}`;
    if (lyricTrackRef.current === key) return;
    lyricTrackRef.current = key;
    setLyrics(null);
    setLyricsLoading(true);
    fetchTrackLyrics(t, a ?? "")
      .then(setLyrics)
      .finally(() => setLyricsLoading(false));
  }, [title, artist, isConnected]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    playerRef.current?.stop();
    relayUrlRef.current = null;
    setIsConnected(false);
    setServerStatus(null);
    setRelayStatus(null);
    setLyrics(null);
    setPosMs(0);
    setAnchorMs(null);
    setAdvancing(false);
    lyricTrackRef.current = "";
    startSession();
  }, [startSession]);

  // ─────────────────────────────────────────────────────────────────────────
  // WAITING STATE
  // ─────────────────────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div style={{ width: "100%", boxSizing: "border-box", padding: "clamp(1rem, 4vw, 2rem)", overflowY: "auto", flex: 1 }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <section style={{ ...card, padding: "clamp(1.2rem, 4vw, 1.8rem)" }}>
            <div style={eyebrow}>Marucast Wireless Receiver</div>
            <div style={{ height: "0.9rem" }} />

            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
              gap: "clamp(1.2rem, 3vw, 1.8rem)",
              alignItems: "stretch",
            }}>
              {/* Left: PIN card */}
              <div style={{
                ...card,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1.2rem",
                minHeight: "340px",
                padding: "1.4rem",
                background: "linear-gradient(145deg, rgba(255,107,157,0.08) 0%, rgba(22,16,38,0.75) 100%)",
                border: "1px solid rgba(255,107,157,0.35)",
                textAlign: "center",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.3rem" }}>📻</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ff6b9d" }}>
                    Pairing PIN
                  </span>
                </div>

                {loading || pairingDigits.length === 0 ? (
                  <div style={{ width: "100%", minHeight: "120px", borderRadius: "1rem", border: "1px dashed rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(245,248,255,0.84)" }}>
                    Creating fresh 6-digit PIN...
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem", width: "100%" }}>
                    {/* Digit slots — matches web applet */}
                    <div style={{ display: "flex", gap: "0.45rem", justifyContent: "center", padding: "0.85rem 1rem", background: "rgba(0,0,0,0.45)", borderRadius: "1rem", border: "1px solid rgba(255,107,157,0.3)" }}>
                      {pairingDigits.map((d, i) => (
                        <span key={i} style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: "clamp(2rem, 4.5vw, 2.5rem)", height: "clamp(2.6rem, 5.5vw, 3.3rem)",
                          fontSize: "clamp(1.6rem, 3.8vw, 2.1rem)", fontWeight: 900, fontFamily: "monospace",
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,107,157,0.45)",
                          borderRadius: "0.5rem", color: "#ffffff", textShadow: "0 0 12px rgba(255,107,157,0.6)",
                        }}>{d}</span>
                      ))}
                    </div>

                    <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.92rem", opacity: 0.9, lineHeight: 1.68, color: "rgba(245,248,255,0.84)" }}>
                      Enter this PIN in MAudio on your phone to connect.
                    </p>

                    {expiryLabel && (
                      <span style={{ display: "inline-flex", alignItems: "center", borderRadius: "999px", border: "1px solid rgba(255,107,157,0.35)", padding: "0.48rem 0.82rem", fontSize: "0.82rem", fontWeight: 700, background: "rgba(255,107,157,0.15)", color: "#ff6b9d" }}>
                        ⏱ {expiryLabel}
                      </span>
                    )}
                  </div>
                )}

                {sessionError && <p style={{ margin: 0, color: "#f87171", fontSize: "0.84rem" }}>{sessionError}</p>}

                <button onClick={startSession} disabled={loading} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(245,248,255,0.88)", borderRadius: "999px", padding: "0.5rem 1.1rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}>
                  Get New PIN
                </button>
              </div>

              {/* Right: Ways to use */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ marginTop: 0, marginBottom: "0.4rem", fontSize: "clamp(1.7rem, 3.2vw, 2.2rem)", lineHeight: 1.08, fontWeight: 800, color: "rgba(250,252,255,0.96)" }}>
                    Ways to use Marucast
                  </h2>
                  <p style={{ margin: "0 0 1rem 0", fontSize: "0.92rem", opacity: 0.8, lineHeight: 1.68, color: "rgba(245,248,255,0.84)" }}>
                    Cast lossless wireless audio, synchronized lyrics, and media metadata across screens.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    {[
                      { icon: "📱", name: "MAudio for Android",   desc: "Lossless streaming, live scrobbling & notification mirroring.", badge: "Available", color: "#4dda8e", bg: "rgba(77,218,142,0.06)", border: "rgba(77,218,142,0.4)", badgeBg: "rgba(77,218,142,0.22)" },
                      { icon: "📺", name: "Marucast for Android TV", desc: "Living room big-screen receiver with full remote navigation.", badge: "Coming Soon", color: "#64b4ff", bg: "rgba(100,180,255,0.04)", border: "rgba(100,180,255,0.25)", badgeBg: "rgba(100,180,255,0.18)" },
                      { icon: "🪟", name: "MAudio for Windows",   desc: "Native desktop receiver with PCM lossless audio playback.",  badge: "This App",   color: "#c88cff", bg: "rgba(200,140,255,0.08)", border: "rgba(200,140,255,0.4)",  badgeBg: "rgba(200,140,255,0.22)" },
                    ].map((p) => (
                      <div key={p.name} style={{ ...card, display: "flex", alignItems: "center", padding: "0.85rem 1rem", borderRadius: "0.85rem", border: `1px solid ${p.border}`, background: p.bg, gap: "0.8rem" }}>
                        <span style={{ fontSize: "1.5rem" }}>{p.icon}</span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#ffffff" }}>{p.name}</span>
                            <span style={{ fontSize: "0.65rem", padding: "0.12rem 0.4rem", borderRadius: "999px", background: p.badgeBg, color: p.color, fontWeight: 700, textTransform: "uppercase" }}>{p.badge}</span>
                          </div>
                          <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.8rem", opacity: 0.75, lineHeight: 1.68, color: "rgba(245,248,255,0.84)" }}>{p.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONNECTED STATE — full-bleed, matches web applet
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 0, overflow: "hidden", background: "linear-gradient(180deg, rgba(4,6,14,0.99) 0%, rgba(2,3,9,1) 100%)" }}>
      <style>{LYRIC_CSS}</style>

      {/* Ambient art blur */}
      {artwork && <>
        <img src={artwork} alt="" aria-hidden style={{ position: "absolute", inset: "-16%", width: "132%", height: "132%", objectFit: "cover", filter: "blur(72px) saturate(1.16)", opacity: 0.26 }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 72% 28%, rgba(255,107,157,0.18) 0%, transparent 28%), linear-gradient(180deg, rgba(4,6,14,0.76) 0%, rgba(2,3,9,0.92) 100%)" }} />
      </>}

      {/* Layout: header / content / footer */}
      <div style={{ position: "relative", height: "100%", display: "grid", gridTemplateRows: "auto 1fr auto", gap: "clamp(0.75rem, 2vh, 1.2rem)", padding: "clamp(1rem, 2.6vw, 2rem)", boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.72rem", minWidth: 0 }}>
            <span style={{ width: "2.15rem", height: "2.15rem", borderRadius: "999px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, rgba(30,36,58,0.94) 0%, rgba(10,13,24,0.98) 100%)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <Glyph glyph="disc" size={16} color="rgba(250,252,255,0.96)" />
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.08rem", minWidth: 0 }}>
              <div style={eyebrow}>Playing on This PC</div>
              <div style={{ fontSize: "0.86rem", lineHeight: 1.4, color: "rgba(245,248,255,0.72)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {sourceLabel}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
            <button onClick={disconnect} style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", borderRadius: "999px", padding: "0.4rem 0.9rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
              Disconnect
            </button>
          </div>
        </div>

        {/* Content: lyrics (left) + artwork/track (right) */}
        <div style={{ minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, 1.44fr) minmax(210px, 0.58fr)", gap: "clamp(1rem, 2.8vw, 1.8rem)", alignItems: "center" }}>

          {/* Lyrics column */}
          <div style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "clamp(0.78rem, 2vh, 1.2rem)", paddingBlock: "clamp(0.35rem, 1.2vh, 0.8rem)" }}>
            <div style={{ ...eyebrow, opacity: 0.54 }}>Lyrics</div>

            {hasSynced ? (
              <>
                {prevLine ? (
                  <div key={`prev-${prevLine.startMs}`} style={{ fontSize: "clamp(1.02rem, 1.22vw, 1.28rem)", lineHeight: 1.36, color: "rgba(244,247,255,0.34)", animation: "lyricSideIn 360ms cubic-bezier(0.22,0.8,0.22,1) both" }}>
                    {prevLine.text}
                  </div>
                ) : <div style={{ minHeight: "1.5rem" }} />}

                <div key={`active-${(activeLine || nextLine)?.startMs ?? "empty"}`} style={{ fontSize: "clamp(3.2rem, 6.2vw, 5.6rem)", lineHeight: 0.96, fontWeight: 760, color: "rgba(250,252,255,0.92)", letterSpacing: "-0.03em", textShadow: "0 0 28px rgba(255,255,255,0.06)", animation: "lyricHeadIn 460ms cubic-bezier(0.2,0.82,0.2,1) both" }}>
                  {(activeLine || nextLine)?.text ?? ""}
                </div>

                {nextLine ? (
                  <div key={`next-${nextLine.startMs}`} style={{ fontSize: "clamp(1.02rem, 1.22vw, 1.28rem)", lineHeight: 1.36, color: "rgba(244,247,255,0.34)", animation: "lyricSideIn 400ms cubic-bezier(0.22,0.8,0.22,1) both" }}>
                    {nextLine.text}
                  </div>
                ) : <div style={{ minHeight: "1.5rem" }} />}
              </>
            ) : (
              <div style={{ fontSize: "clamp(0.92rem, 1vw, 1.02rem)", lineHeight: 1.55, color: "rgba(245,248,255,0.46)", maxWidth: "40rem" }}>
                {lyricsLoading ? "Finding synced lyrics..." : lyrics && !lyrics.synced ? "Lyrics found, but they are not time-coded." : "No synced lyrics yet."}
              </div>
            )}
          </div>

          {/* Artwork + track info column */}
          <div style={{ minWidth: 0, alignSelf: "center", display: "flex", alignItems: "center", gap: "clamp(0.9rem, 1.8vw, 1.25rem)" }}>
            {/* Artwork */}
            <div style={{ position: "relative", width: "132px", minWidth: "132px", borderRadius: "0.92rem", overflow: "hidden", aspectRatio: "1/1", border: "1px solid rgba(255,255,255,0.16)", boxShadow: "0 18px 38px rgba(0,0,0,0.24)", background: "radial-gradient(circle at top left, rgba(255,107,157,0.24), rgba(6,10,20,0.96) 62%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {artwork
                ? <img src={artwork} alt={title ?? "artwork"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ width: "3.6rem", height: "3.6rem", borderRadius: "999px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(255,107,157,0.18)" }}><Glyph glyph="disc" size={24} color="rgba(250,252,255,0.96)" /></span>
              }
            </div>

            {/* Track text */}
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "0.48rem" }}>
              <div style={{ ...eyebrow, opacity: 0.5 }}>Now Playing</div>
              <div style={{ fontSize: "clamp(1.12rem, 1.9vw, 1.58rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em", overflowWrap: "anywhere", maxWidth: "min(240px, 100%)", color: "rgba(250,252,255,0.84)" }}>
                {title ?? "Live Audio Stream"}
              </div>
              <div style={{ fontSize: "0.9rem", lineHeight: 1.5, color: "rgba(248,250,255,0.66)", maxWidth: "min(220px, 100%)" }}>
                {artist ?? appLabel ?? "MAudio"}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: progress + time */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.48rem" }}>
          {/* Progress bar */}
          <div style={{ height: "4px", borderRadius: "999px", background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(progressRatio * 100, progressRatio > 0 ? 1.2 : 0)}%`, height: "100%", borderRadius: "inherit", background: "linear-gradient(90deg, rgba(255,107,157,0.9) 0%, rgba(235,240,255,0.95) 100%)", boxShadow: "0 0 14px rgba(255,107,157,0.3)", transition: "width 180ms linear" }} />
          </div>

          {/* Time row */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "rgba(245,248,255,0.65)" }}>
            <span>Receiving{streamError ? ` - ${streamError}` : ""}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatTime(displayPos)} / {formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
