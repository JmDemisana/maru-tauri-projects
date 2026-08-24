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
  Volume2,
  Radio,
  List,
  Focus,
} from "lucide-react";
import { AudioDspEngine } from "../utils/AudioDspEngine";

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
  const [isCapturingAudio, setIsCapturingAudio] = useState(false);
  const [isFullScrollMode, setIsFullScrollMode] = useState(false); // Default: 3-line spotlight!

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dspEngineRef = useRef<AudioDspEngine | null>(null);

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

  // Initialize DSP Engine
  useEffect(() => {
    const engine = new AudioDspEngine();
    dspEngineRef.current = engine;

    return () => {
      engine.destroy();
      dspEngineRef.current = null;
    };
  }, []);

  // Update DSP engine parameters whenever sliders change
  useEffect(() => {
    if (dspEngineRef.current) {
      dspEngineRef.current.setVocalLevel(vocalLevel);
      dspEngineRef.current.setInstrumentalLevel(instrumentalLevel);
      dspEngineRef.current.setBassPunch(bassPunch);
    }
    localStorage.setItem("maudio_karaoke_vocal_level", vocalLevel.toString());
    localStorage.setItem("maudio_karaoke_inst_level", instrumentalLevel.toString());
    localStorage.setItem("maudio_karaoke_bass_level", bassPunch.toString());
  }, [vocalLevel, instrumentalLevel, bassPunch]);

  const handleStartCapture = async () => {
    if (!dspEngineRef.current) return;
    const ok = await dspEngineRef.current.captureSystemAudio();
    setIsCapturingAudio(ok);
  };

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

  // Guaranteed Smooth Centered Auto-Scroll to Active Lyric Line (Full Scroll mode)
  useEffect(() => {
    if (isFullScrollMode && activeLineRef.current && scrollContainerRef.current) {
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
  }, [currentLineIdx, isFullScrollMode]);

  // Live Audio Visualizer Canvas Loop
  useEffect(() => {
    let animId: number;
    const renderVis = () => {
      if (canvasRef.current && dspEngineRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const data = dspEngineRef.current.getFrequencyData();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const barWidth = (canvas.width / 16) - 2;
          for (let i = 0; i < 16; i++) {
            const val = data[i] || 0;
            const barHeight = (val / 255) * canvas.height;
            ctx.fillStyle = i < 6 ? "#ff71a2" : i < 11 ? "#70a5ff" : "#a78bfa";
            ctx.fillRect(i * (barWidth + 2), canvas.height - barHeight, barWidth, barHeight);
          }
        }
      }
      animId = requestAnimationFrame(renderVis);
    };

    animId = requestAnimationFrame(renderVis);
    return () => cancelAnimationFrame(animId);
  }, []);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(Math.max(0, ms) / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const durationMs = mediaState.duration_ms || (lyrics.length > 0 ? lyrics[lyrics.length - 1].timeMs + 10000 : 180000);
  const progressPercent = Math.min(100, Math.max(0, (interpolatedTimeMs / durationMs) * 100));

  // Compute 3-Line Spotlight items
  const validCurrentIdx = currentLineIdx >= 0 ? currentLineIdx : 0;
  const prevLine = validCurrentIdx > 0 && lyrics.length > 0 ? lyrics[validCurrentIdx - 1] : null;
  const currentLine = lyrics.length > 0 ? lyrics[validCurrentIdx] : null;
  const nextLine = validCurrentIdx + 1 < lyrics.length ? lyrics[validCurrentIdx + 1] : null;

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

        {/* Sync Offset, View Mode & Stems Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {/* View Mode Toggle (3-Line Spotlight vs Full Scroll) */}
          <button
            onClick={() => setIsFullScrollMode(!isFullScrollMode)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#fafcff",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isFullScrollMode ? <Focus size={13} color="var(--maru-accent-pink)" /> : <List size={13} color="var(--maru-accent-pink)" />}
            <span>{isFullScrollMode ? "3-LINE SPOTLIGHT" : "FULL SCROLL"}</span>
          </button>

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

      {/* 2. Interactive Timeline Scrubber Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "10px 0 6px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "11.5px", fontFamily: "monospace", color: "var(--maru-accent-pink)", fontWeight: 700 }}>
          {formatTime(interpolatedTimeMs)}
        </span>

        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, clickX / rect.width));
            const newPos = pct * durationMs;
            setInterpolatedTimeMs(newPos);
            lastSyncRef.current = { mediaPos: newPos, timestamp: performance.now() };
          }}
          style={{
            flex: 1,
            height: "8px",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "999px",
            position: "relative",
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${progressPercent}%`,
              background: "linear-gradient(90deg, #ff71a2, #70a5ff)",
              borderRadius: "999px",
              boxShadow: "0 0 10px rgba(255, 113, 162, 0.6)",
              transition: "width 0.1s linear",
            }}
          />
        </div>

        <span style={{ fontSize: "11.5px", fontFamily: "monospace", color: "rgba(235, 235, 245, 0.6)", fontWeight: 700 }}>
          {formatTime(durationMs)}
        </span>
      </div>

      {/* 3. Main Content Split: Lyrics Center + Stems Sidebar */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* CENTER LYRICS VIEWPORT */}
        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: isFullScrollMode ? "flex-start" : "center",
            padding: isFullScrollMode ? "80px 24px 160px" : "32px 24px",
            gap: isFullScrollMode ? "26px" : "28px",
            userSelect: "none",
          }}
        >
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <RefreshCw size={32} className="animate-spin" color="var(--maru-accent-pink)" />
              <span style={{ fontSize: "13px", color: "rgba(235, 235, 245, 0.72)" }}>
                Fetching synced karaoke lyrics...
              </span>
            </div>
          )}

          {!isLoading && !mediaState.title && (
            <div style={{ textAlign: "center" }}>
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
            <div style={{ textAlign: "center" }}>
              <Mic2 size={44} color="rgba(235, 235, 245, 0.3)" style={{ margin: "0 auto 14px" }} />
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#f4f4f9fa" }}>
                No Timed Lyrics Available
              </div>
              <div style={{ fontSize: "12.5px", color: "rgba(235, 235, 245, 0.6)", marginTop: "4px" }}>
                No synced lyrics were found for &quot;{mediaState.title}&quot;.
              </div>
            </div>
          )}

          {/* 3-LINE SPOTLIGHT VIEW (DEFAULT) */}
          {!isLoading && !isFullScrollMode && lyrics.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "24px",
                width: "100%",
                maxWidth: "840px",
              }}
            >
              {/* Previous Line */}
              <motion.div
                key={`prev-${validCurrentIdx - 1}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: prevLine ? 0.38 : 0, y: 0 }}
                transition={{ duration: 0.22 }}
                onClick={() => {
                  if (prevLine) {
                    setInterpolatedTimeMs(prevLine.timeMs);
                    lastSyncRef.current = { mediaPos: prevLine.timeMs, timestamp: performance.now() };
                  }
                }}
                style={{
                  fontSize: "19px",
                  fontWeight: 600,
                  color: "rgba(235, 235, 245, 0.7)",
                  textAlign: "center",
                  minHeight: "28px",
                  cursor: prevLine ? "pointer" : "default",
                  padding: "4px 16px",
                }}
              >
                {prevLine ? prevLine.text : " "}
              </motion.div>

              {/* Current Playing Line (Main Spotlight) */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`curr-${validCurrentIdx}`}
                  initial={{ scale: 0.94, opacity: 0, y: 12 }}
                  animate={{ scale: 1.04, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: -12 }}
                  transition={{ type: "spring", damping: 22, stiffness: 300 }}
                  style={{
                    fontSize: "30px",
                    fontWeight: 900,
                    color: "#ffffff",
                    textAlign: "center",
                    padding: "16px 32px",
                    borderRadius: "20px",
                    background: "rgba(232, 93, 159, 0.22)",
                    border: "1.5px solid rgba(232, 93, 159, 0.6)",
                    boxShadow: "0 0 35px rgba(232, 93, 159, 0.4)",
                    textShadow: "0 0 28px rgba(232, 93, 159, 0.9), 0 2px 10px rgba(0,0,0,0.9)",
                    lineHeight: "1.35",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {currentLine ? currentLine.text : "🎶"}
                </motion.div>
              </AnimatePresence>

              {/* Next Upcoming Line */}
              <motion.div
                key={`next-${validCurrentIdx + 1}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: nextLine ? 0.55 : 0, y: 0 }}
                transition={{ duration: 0.22 }}
                onClick={() => {
                  if (nextLine) {
                    setInterpolatedTimeMs(nextLine.timeMs);
                    lastSyncRef.current = { mediaPos: nextLine.timeMs, timestamp: performance.now() };
                  }
                }}
                style={{
                  fontSize: "19px",
                  fontWeight: 600,
                  color: "rgba(235, 235, 245, 0.8)",
                  textAlign: "center",
                  minHeight: "28px",
                  cursor: nextLine ? "pointer" : "default",
                  padding: "4px 16px",
                }}
              >
                {nextLine ? nextLine.text : " "}
              </motion.div>
            </div>
          )}

          {/* FULL SCROLL VIEW */}
          {!isLoading && isFullScrollMode && lyrics.length > 0 && (
            lyrics.map((line, idx) => {
              const isCurrent = idx === currentLineIdx;
              const isPast = idx < currentLineIdx;

              return (
                <motion.div
                  key={idx}
                  ref={isCurrent ? activeLineRef : null}
                  onClick={() => {
                    setInterpolatedTimeMs(line.timeMs);
                    lastSyncRef.current = { mediaPos: line.timeMs, timestamp: performance.now() };
                    setCurrentLineIdx(idx);
                  }}
                  animate={{
                    scale: isCurrent ? 1.07 : 1,
                    opacity: isCurrent ? 1 : isPast ? 0.35 : 0.65,
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
            })
          )}
        </div>

        {/* 4. Real-Time Stem Separation & Apple Music Sing Slider Panel */}
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
                background: "rgba(18, 12, 32, 0.88)",
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

                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <canvas ref={canvasRef} width={60} height={16} style={{ borderRadius: "4px" }} />
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

              {/* Live PC Audio Capture Activation */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartCapture}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "9px 14px",
                  borderRadius: "12px",
                  background: isCapturingAudio ? "rgba(74, 222, 128, 0.2)" : "rgba(232, 93, 159, 0.2)",
                  border: isCapturingAudio ? "1px solid #4ade80" : "1px solid var(--maru-accent-pink)",
                  color: isCapturingAudio ? "#4ade80" : "var(--maru-accent-pink)",
                  fontWeight: 800,
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                <Radio size={14} className={isCapturingAudio ? "animate-pulse" : ""} />
                <span>{isCapturingAudio ? "LIVE AUDIO DSP ACTIVE" : "ACTIVATE LIVE PC AUDIO DSP"}</span>
              </motion.button>

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
                ✨ Center-channel vocal attenuation active. Click &quot;ACTIVATE LIVE PC AUDIO DSP&quot; or play audio to filter vocals in real-time!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
