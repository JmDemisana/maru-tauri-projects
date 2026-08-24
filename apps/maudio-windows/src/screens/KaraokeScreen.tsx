import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MediaState, SongDetailState } from "../types";
import { Mic2, Music, Sparkles, Disc, RefreshCw, Volume2, Sliders, ExternalLink } from "lucide-react";

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
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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

  // Track live position and update active line
  useEffect(() => {
    if (!mediaState.position_ms || lyrics.length === 0) return;

    const currentPos = mediaState.position_ms + offsetMs;
    let activeIdx = -1;

    for (let i = 0; i < lyrics.length; i++) {
      if (currentPos >= lyrics[i].timeMs) {
        activeIdx = i;
      } else {
        break;
      }
    }

    setCurrentLineIdx(activeIdx);
  }, [mediaState.position_ms, lyrics, offsetMs]);

  // Auto-scroll active line to vertical center
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
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
        padding: "20px 32px 24px",
      }}
    >
      {/* 1. Track Header & Sync Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", overflow: "hidden" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
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
              <Mic2 size={28} color="var(--maru-accent-pink)" />
            )}
          </div>

          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontSize: "18px",
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
                fontSize: "13px",
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

        {/* Sync Offset Pill Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
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

      {/* 2. Synced Karaoke Scrolling Viewport */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "80px 16px 140px",
          gap: "24px",
          userSelect: "none",
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
                  scale: isCurrent ? 1.06 : 1,
                  opacity: isCurrent ? 1 : isPast ? 0.35 : 0.6,
                }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: isCurrent ? "26px" : "20px",
                  fontWeight: isCurrent ? 900 : 700,
                  color: isCurrent ? "#ffffff" : "rgba(235, 235, 245, 0.8)",
                  textAlign: "center",
                  cursor: "pointer",
                  maxWidth: "800px",
                  lineHeight: "1.4",
                  textShadow: isCurrent ? "0 0 24px rgba(232, 93, 159, 0.7), 0 2px 10px rgba(0,0,0,0.8)" : "none",
                  padding: "4px 16px",
                  borderRadius: "12px",
                  background: isCurrent ? "rgba(232, 93, 159, 0.15)" : "transparent",
                  transition: "color 0.2s ease, text-shadow 0.2s ease, background 0.2s ease",
                }}
              >
                {line.text}
              </motion.div>
            );
          })}
      </div>
    </motion.div>
  );
};
