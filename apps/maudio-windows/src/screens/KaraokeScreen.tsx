import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MediaState, SongDetailState } from "../types";
import {
  Mic2,
  Sparkles,
  RefreshCw,
  Play,
  Pause,
  ExternalLink,
  Cast,
} from "lucide-react";

interface KaraokeScreenProps {
  mediaState: MediaState;
  onSongClick?: (song: SongDetailState) => void;
  onNavigateMarucast?: () => void;
}

interface LyricLine {
  timeMs: number;
  text: string;
}

export const KaraokeScreen: React.FC<KaraokeScreenProps> = ({ mediaState, onSongClick, onNavigateMarucast }) => {
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

  // Fetch synced lyrics from LRCLIB whenever song changes
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

  // High-Precision Playback Position Interpolator (100ms ticker)
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

  // Continuous Smooth Centered Auto-Scroll
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

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(Math.max(0, ms) / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const durationMs = mediaState.duration_ms || (lyrics.length > 0 ? lyrics[lyrics.length - 1].timeMs + 10000 : 180000);
  const progressPercent = Math.min(100, Math.max(0, (interpolatedTimeMs / durationMs) * 100));

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

        {/* Sync Offset & Marucast Shortcut */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
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

          {onNavigateMarucast && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNavigateMarucast}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "20px",
                background: "rgba(232, 93, 159, 0.2)",
                border: "1px solid var(--maru-accent-pink)",
                color: "var(--maru-accent-pink)",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Cast size={13} />
              <span>MARUCAST</span>
            </motion.button>
          )}
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
          style={{
            flex: 1,
            height: "8px",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "999px",
            position: "relative",
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

        <span style={{ fontSize: "11.5px", fontFamily: "monospace", color: "rgba(235, 235, 245, 0.6)" }}>
          {formatTime(durationMs)}
        </span>
      </div>

      {/* 3. Main 3-Line Spotlight Lyrics Viewport */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          marginTop: "10px",
        }}
      >
        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "80px 24px 140px",
            scrollBehavior: "smooth",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "28px",
          }}
        >
          {isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "rgba(235, 235, 245, 0.6)", fontSize: "15px", marginTop: "40px" }}>
              <RefreshCw className="animate-spin" size={18} />
              <span>Fetching lyrics synchronization...</span>
            </div>
          )}

          {!isLoading && lyrics.length === 0 && !plainLyrics && (
            <div style={{ textAlign: "center", marginTop: "50px", color: "rgba(235, 235, 245, 0.6)" }}>
              <Sparkles size={36} color="var(--maru-accent-pink)" style={{ margin: "0 auto 12px", opacity: 0.7 }} />
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#f4f4f9fa" }}>
                {mediaState.title ? "No Synced Lyrics Found" : "No Music Playing"}
              </div>
              <div style={{ fontSize: "13px", marginTop: "6px" }}>
                {mediaState.title
                  ? `Couldn't find timed lyrics for "${mediaState.title}".`
                  : "Play any track on Spotify, Apple Music, or YouTube to start karaoke!"}
              </div>
            </div>
          )}

          {/* Plain Lyrics Mode */}
          {!isLoading && plainLyrics && lyrics.length === 0 && (
            <div style={{ maxWidth: "600px", textAlign: "center", lineHeight: "1.8", color: "rgba(235, 235, 245, 0.85)", fontSize: "16px", whiteSpace: "pre-line" }}>
              {plainLyrics}
            </div>
          )}

          {/* 3-Line Spotlight Synced Lyrics Mode */}
          {!isLoading && lyrics.length > 0 && (
            <div style={{ width: "100%", maxWidth: "860px", display: "flex", flexDirection: "column", gap: "22px", textAlign: "center" }}>
              {lyrics.map((line, idx) => {
                const isActive = idx === currentLineIdx;
                const isAdjacent = idx === currentLineIdx - 1 || idx === currentLineIdx + 1;
                const isVisible = isActive || isAdjacent || currentLineIdx === -1;

                if (!isVisible) {
                  return null;
                }

                return (
                  <div
                    key={idx}
                    ref={isActive ? activeLineRef : null}
                    style={{
                      transition: "all 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
                      fontSize: isActive ? "clamp(38px, 4.4vw, 54px)" : "clamp(18px, 2.2vw, 24px)",
                      fontWeight: isActive ? 900 : 600,
                      lineHeight: "1.25",
                      letterSpacing: isActive ? "-0.5px" : "0px",
                      color: isActive ? "#ffffff" : "rgba(235, 235, 245, 0.28)",
                      textShadow: isActive
                        ? "0 0 28px rgba(255, 113, 162, 0.75), 0 2px 10px rgba(0,0,0,0.8)"
                        : "none",
                      padding: isActive ? "18px 24px" : "4px 16px",
                      borderRadius: "20px",
                      background: isActive ? "rgba(255, 113, 162, 0.12)" : "transparent",
                      border: isActive ? "1px solid rgba(255, 113, 162, 0.3)" : "1px solid transparent",
                      transform: isActive ? "scale(1.03)" : "scale(0.96)",
                    }}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
