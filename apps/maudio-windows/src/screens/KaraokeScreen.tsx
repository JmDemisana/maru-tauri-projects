import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MediaState, SongDetailState } from "../types";
import {
  Mic2,
  Music,
  Sparkles,
  Disc,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Activity,
  Play,
} from "lucide-react";

interface KaraokeScreenProps {
  mediaState: MediaState;
  onSongClick?: (song: SongDetailState) => void;
}

interface LyricLine {
  timeMs: number;
  text: string;
}

export const KaraokeScreen: React.FC<KaraokeScreenProps> = ({ mediaState, onSongClick }) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLineIdx, setCurrentLineIdx] = useState<number>(-1);
  const [offsetMs, setOffsetMs] = useState<number>(0);
  const [interpolatedTimeMs, setInterpolatedTimeMs] = useState<number>(0);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastSyncRef = useRef<{ mediaPos: number; timestamp: number }>({
    mediaPos: 0,
    timestamp: performance.now(),
  });

  // Stems & Sing Controls
  const [showStemDrawer, setShowStemDrawer] = useState<boolean>(true);
  const [vocalLevel, setVocalLevel] = useState<number>(() => {
    return parseInt(localStorage.getItem("maudio_karaoke_vocal_level") || "20", 10);
  });
  const [instrumentalLevel, setInstrumentalLevel] = useState<number>(() => {
    return parseInt(localStorage.getItem("maudio_karaoke_inst_level") || "100", 10);
  });
  const [bassPunch, setBassPunch] = useState<number>(() => {
    return parseInt(localStorage.getItem("maudio_karaoke_bass_level") || "100", 10);
  });
  const [activeStemPreset, setActiveStemPreset] = useState<"karaoke" | "duet" | "acapella" | "original">("karaoke");

  const handleApplyPreset = (preset: "karaoke" | "duet" | "acapella" | "original") => {
    setActiveStemPreset(preset);
    if (preset === "karaoke") {
      setVocalLevel(0);
      setInstrumentalLevel(100);
      setBassPunch(100);
    } else if (preset === "duet") {
      setVocalLevel(45);
      setInstrumentalLevel(100);
      setBassPunch(100);
    } else if (preset === "acapella") {
      setVocalLevel(100);
      setInstrumentalLevel(0);
      setBassPunch(0);
    } else if (preset === "original") {
      setVocalLevel(100);
      setInstrumentalLevel(100);
      setBassPunch(100);
    }
  };

  useEffect(() => {
    localStorage.setItem("maudio_karaoke_vocal_level", vocalLevel.toString());
    localStorage.setItem("maudio_karaoke_inst_level", instrumentalLevel.toString());
    localStorage.setItem("maudio_karaoke_bass_level", bassPunch.toString());
  }, [vocalLevel, instrumentalLevel, bassPunch]);

  // Parse .lrc string into structured LyricLine array
  const parseLrc = (lrcText: string): LyricLine[] => {
    const lines = lrcText.split("\n");
    const result: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

    for (const line of lines) {
      const match = [...line.matchAll(timeRegex)];
      if (match.length > 0) {
        const text = line.replace(timeRegex, "").trim();
        if (text) {
          for (const m of match) {
            const min = parseInt(m[1], 10);
            const sec = parseInt(m[2], 10);
            const ms = m[3].length === 2 ? parseInt(m[3], 10) * 10 : parseInt(m[3], 10);
            const totalMs = min * 60000 + sec * 1000 + ms;
            result.push({ timeMs: totalMs, text });
          }
        }
      }
    }

    return result.sort((a, b) => a.timeMs - b.timeMs);
  };

  // Fetch synced lyrics whenever playing song changes
  useEffect(() => {
    if (!mediaState.title) {
      setLyrics([]);
      setPlainLyrics(null);
      return;
    }

    const fetchLyrics = async () => {
      setIsLoading(true);
      try {
        const cleanTitle = mediaState.title!.replace(/\(.*?\)|\[.*?\]/g, "").trim();
        const cleanArtist = mediaState.artist ? mediaState.artist.replace(/\(.*?\)/g, "").trim() : "";
        const durSec = mediaState.duration_ms ? Math.floor(mediaState.duration_ms / 1000) : 0;

        const queryParams = new URLSearchParams({
          track_name: cleanTitle,
          artist_name: cleanArtist,
          duration: durSec.toString(),
        });

        const res = await fetch(`https://lrclib.net/api/get?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.syncedLyrics) {
            setLyrics(parseLrc(data.syncedLyrics));
            setPlainLyrics(null);
          } else if (data.plainLyrics) {
            setPlainLyrics(data.plainLyrics);
            setLyrics([]);
          } else {
            setLyrics([]);
            setPlainLyrics(null);
          }
        } else {
          // Fallback search
          const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (Array.isArray(searchData) && searchData.length > 0) {
              const best = searchData.find((item: any) => item.syncedLyrics) || searchData[0];
              if (best.syncedLyrics) {
                setLyrics(parseLrc(best.syncedLyrics));
                setPlainLyrics(null);
              } else if (best.plainLyrics) {
                setPlainLyrics(best.plainLyrics);
                setLyrics([]);
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to load karaoke lyrics:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, [mediaState.title, mediaState.artist]);

  // High-Precision Playback Position Interpolator
  useEffect(() => {
    if (mediaState.position_ms != null) {
      lastSyncRef.current = {
        mediaPos: mediaState.position_ms,
        timestamp: performance.now(),
      };
      setInterpolatedTimeMs(mediaState.position_ms);
    }
  }, [mediaState.position_ms]);

  useEffect(() => {
    if (!mediaState.is_playing) return;
    const interval = setInterval(() => {
      const elapsed = performance.now() - lastSyncRef.current.timestamp;
      const current = lastSyncRef.current.mediaPos + elapsed;
      setInterpolatedTimeMs(current);
    }, 100);
    return () => clearInterval(interval);
  }, [mediaState.is_playing]);

  // Track live position and update active line
  useEffect(() => {
    if (lyrics.length === 0) return;

    const currentPos = interpolatedTimeMs + offsetMs;
    let activeIdx = -1;

    for (let i = 0; i < lyrics.length; i++) {
      if (currentPos >= lyrics[i].timeMs) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== currentLineIdx) {
      setCurrentLineIdx(activeIdx);
    }
  }, [interpolatedTimeMs, lyrics, offsetMs, currentLineIdx]);

  // Guaranteed Smooth Centered Auto-Scroll to Active Lyric Line
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const element = activeLineRef.current;

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const relativeTop = elementRect.top - containerRect.top;
      const targetScrollTop = container.scrollTop + relativeTop - (containerRect.height / 2) + (elementRect.height / 2);

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      });
    }
  }, [currentLineIdx]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        padding: "16px 28px 24px",
      }}
    >
      {/* 1. Track Header & Sync Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", overflow: "hidden" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.08)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(232, 93, 159, 0.4)",
            }}
          >
            {mediaState.artwork_base64 ? (
              <img src={mediaState.artwork_base64} alt="Artwork" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Mic2 size={26} color="var(--maru-accent-pink)" />
            )}
          </div>

          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontSize: "17px",
                fontWeight: 800,
                color: "#f4f4f9fa",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {mediaState.title || "No Track Playing on PC"}
            </div>
            <div
              style={{
                fontSize: "12.5px",
                color: "var(--maru-accent-pink)",
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginTop: "2px",
              }}
            >
              {mediaState.artist || (mediaState.app_name ? `Active (${mediaState.app_name})` : "Start playing music on Windows")}
            </div>
          </div>
        </div>

        {/* Sync Offset & Stems Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {/* Stem Separation Drawer Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowStemDrawer(!showStemDrawer)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "20px",
              background: showStemDrawer ? "rgba(232, 93, 159, 0.25)" : "rgba(255, 255, 255, 0.08)",
              border: showStemDrawer ? "1.5px solid var(--maru-accent-pink)" : "1px solid rgba(255, 255, 255, 0.1)",
              color: showStemDrawer ? "var(--maru-accent-pink)" : "#fafcff",
              fontSize: "11px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <Layers size={13} />
            <span>STEM SEPARATION</span>
          </motion.button>

          {/* Sync Offset Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "11px",
              fontWeight: 700,
              color: "rgba(235, 235, 245, 0.8)",
            }}
          >
            <span>Offset: {offsetMs > 0 ? `+${offsetMs}ms` : `${offsetMs}ms`}</span>
            <button
              onClick={() => setOffsetMs((prev) => prev - 200)}
              style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontWeight: 800, padding: "0 4px" }}
            >
              -
            </button>
            <button
              onClick={() => setOffsetMs(0)}
              style={{ background: "transparent", border: "none", color: "var(--maru-accent-pink)", cursor: "pointer", fontSize: "10px", padding: "0 2px" }}
            >
              reset
            </button>
            <button
              onClick={() => setOffsetMs((prev) => prev + 200)}
              style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontWeight: 800, padding: "0 4px" }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Content Split: Lyrics Center + Stems Sidebar */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Synced Lyrics Scrollable Viewport */}
        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "100px 24px 160px",
            gap: "28px",
            userSelect: "none",
            scrollBehavior: "smooth",
          }}
        >
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginTop: "60px" }}>
              <RefreshCw size={32} className="animate-spin" color="var(--maru-accent-pink)" />
              <span style={{ fontSize: "13px", color: "rgba(235, 235, 245, 0.72)" }}>
                Fetching synced karaoke lyrics...
              </span>
            </div>
          )}

          {!isLoading && !mediaState.title && (
            <div style={{ textAlign: "center", marginTop: "80px" }}>
              <Disc size={44} color="rgba(235, 235, 245, 0.3)" style={{ margin: "0 auto 14px" }} />
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#f4f4f9fa" }}>
                Waiting for Windows Audio
              </div>
              <div style={{ fontSize: "12.5px", color: "rgba(235, 235, 245, 0.6)", marginTop: "4px" }}>
                Play a song in Apple Music, Spotify, YouTube, or VLC to start Karaoke Mode!
              </div>
            </div>
          )}

          {!isLoading && mediaState.title && lyrics.length === 0 && !plainLyrics && (
            <div style={{ textAlign: "center", marginTop: "80px" }}>
              <Mic2 size={44} color="rgba(235, 235, 245, 0.3)" style={{ margin: "0 auto 14px" }} />
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#f4f4f9fa" }}>
                No Timed Lyrics Available
              </div>
              <div style={{ fontSize: "12.5px", color: "rgba(235, 235, 245, 0.6)", marginTop: "4px" }}>
                No synced lyrics were found for &quot;{mediaState.title}&quot;.
              </div>
            </div>
          )}

          {!isLoading && plainLyrics && lyrics.length === 0 && (
            <div style={{ maxWidth: "680px", textAlign: "center", lineHeight: "2.2", fontSize: "18px", color: "#f4f4f9fa", fontWeight: 600 }}>
              {plainLyrics.split("\n").map((line, idx) => (
                <div key={idx} style={{ marginBottom: "8px" }}>
                  {line}
                </div>
              ))}
            </div>
          )}

          {!isLoading &&
            lyrics.length > 0 &&
            lyrics.map((line, idx) => {
              const isCurrent = idx === currentLineIdx;
              const isPast = idx < currentLineIdx;

              return (
                <motion.div
                  key={idx}
                  ref={isCurrent ? activeLineRef : null}
                  animate={{
                    scale: isCurrent ? 1.07 : 1,
                    opacity: isCurrent ? 1 : isPast ? 0.32 : 0.6,
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontSize: isCurrent ? "26px" : "20px",
                    fontWeight: isCurrent ? 900 : 700,
                    color: isCurrent ? "#ffffff" : "rgba(235, 235, 245, 0.8)",
                    textAlign: "center",
                    cursor: "pointer",
                    maxWidth: "760px",
                    lineHeight: "1.4",
                    textShadow: isCurrent ? "0 0 24px rgba(232, 93, 159, 0.8), 0 2px 12px rgba(0,0,0,0.9)" : "none",
                    padding: "8px 20px",
                    borderRadius: "14px",
                    background: isCurrent ? "rgba(232, 93, 159, 0.2)" : "transparent",
                    border: isCurrent ? "1px solid rgba(232, 93, 159, 0.5)" : "1px solid transparent",
                    transition: "all 0.2s ease",
                  }}
                >
                  {line.text}
                </motion.div>
              );
            })}
        </div>

        {/* 3. Real-Time Stem Separation & Apple Music Sing Slider Panel */}
        <AnimatePresence>
          {showStemDrawer && (
            <motion.div
              initial={{ width: 0, opacity: 0, x: 40 }}
              animate={{ width: "290px", opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: 40 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="glass-card"
              style={{
                marginLeft: "16px",
                marginRight: "4px",
                marginTop: "16px",
                marginBottom: "16px",
                padding: "20px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                flexShrink: 0,
                border: "1px solid rgba(232, 93, 159, 0.4)",
                background: "rgba(18, 12, 32, 0.85)",
                backdropFilter: "blur(20px)",
                borderRadius: "18px",
              }}
            >
              {/* Panel Title */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <SlidersHorizontal size={16} color="var(--maru-accent-pink)" />
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.6px" }}>
                    STEMS &amp; VOCAL SING
                  </span>
                </div>

                <div style={{ fontSize: "10px", color: "rgba(235, 235, 245, 0.5)", fontWeight: 700 }}>
                  DSP ENGINE
                </div>
              </div>

              {/* Stem Preset Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {[
                  { key: "karaoke", label: "🎤 Karaoke" },
                  { key: "duet", label: "👥 Duet (50%)" },
                  { key: "acapella", label: "🎙️ Acapella" },
                  { key: "original", label: "🎵 Original" },
                ].map((p) => {
                  const isSelected = activeStemPreset === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => handleApplyPreset(p.key as any)}
                      style={{
                        padding: "7px 8px",
                        borderRadius: "10px",
                        background: isSelected ? "rgba(232, 93, 159, 0.3)" : "rgba(255, 255, 255, 0.08)",
                        border: isSelected ? "1.5px solid var(--maru-accent-pink)" : "1px solid rgba(255, 255, 255, 0.09)",
                        color: isSelected ? "#ffffff" : "rgba(235, 235, 245, 0.75)",
                        fontSize: "10.5px",
                        fontWeight: isSelected ? 800 : 600,
                        cursor: "pointer",
                        transition: "all 120ms ease",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)" }} />

              {/* 1. Lead Vocals Stem Slider (Apple Music Sing Style) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Mic2 size={14} color="var(--maru-accent-pink)" />
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#f4f4f9fa" }}>
                      Lead Vocals
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--maru-accent-pink)" }}>
                    {vocalLevel === 0 ? "MUTED" : `${vocalLevel}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={vocalLevel}
                  onChange={(e) => {
                    setVocalLevel(parseInt(e.target.value, 10));
                    setActiveStemPreset("karaoke");
                  }}
                  style={{
                    width: "100%",
                    accentColor: "var(--maru-accent-pink)",
                    cursor: "pointer",
                    height: "6px",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "rgba(235, 235, 245, 0.45)" }}>
                  <span>Vocal Off</span>
                  <span>Sing-Along</span>
                  <span>Full Lead</span>
                </div>
              </div>

              {/* 2. Instrumental Stem Slider */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Music size={14} color="var(--maru-accent-blue)" />
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#f4f4f9fa" }}>
                      Instrumental
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--maru-accent-blue)" }}>
                    {instrumentalLevel}%
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={instrumentalLevel}
                  onChange={(e) => {
                    setInstrumentalLevel(parseInt(e.target.value, 10));
                    setActiveStemPreset("karaoke");
                  }}
                  style={{
                    width: "100%",
                    accentColor: "var(--maru-accent-blue)",
                    cursor: "pointer",
                    height: "6px",
                  }}
                />
              </div>

              {/* 3. Bass & Rhythm Punch Slider */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Activity size={14} color="#a78bfa" />
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#f4f4f9fa" }}>
                      Bass &amp; Beat Punch
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "#a78bfa" }}>
                    {bassPunch}%
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={150}
                  value={bassPunch}
                  onChange={(e) => {
                    setBassPunch(parseInt(e.target.value, 10));
                    setActiveStemPreset("karaoke");
                  }}
                  style={{
                    width: "100%",
                    accentColor: "#a78bfa",
                    cursor: "pointer",
                    height: "6px",
                  }}
                />
              </div>

              {/* Live Status Note */}
              <div
                style={{
                  marginTop: "auto",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: "rgba(232, 93, 159, 0.12)",
                  border: "1px solid rgba(232, 93, 159, 0.3)",
                  fontSize: "10px",
                  color: "rgba(235, 235, 245, 0.8)",
                  lineHeight: "1.4",
                }}
              >
                ✨ Center-channel vocal attenuation active. Pull lead vocals to 0% for instant karaoke singing!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
