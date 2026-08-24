import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
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
  Pause,
  Volume2,
} from "lucide-react";
import { AudioDspEngine } from "../utils/AudioDspEngine";
import { searchItunesSong } from "../utils/LastFmRecommendationsEngine";

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

  // In-App Studio Player & DSP
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPlayingInAppAudio, setIsPlayingInAppAudio] = useState<boolean>(false);
  const [audioDurationSec, setAudioDurationSec] = useState<number>(0);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const dspEngineRef = useRef<AudioDspEngine | null>(null);

  const lastSyncRef = useRef<{ mediaPos: number; timestamp: number }>({
    mediaPos: 0,
    timestamp: performance.now(),
  });

  // Stems & Sing Controls
  const [showStemDrawer, setShowStemDrawer] = useState<boolean>(true);
  const [vocalLevel, setVocalLevel] = useState<number>(() => {
    return parseInt(localStorage.getItem("maudio_karaoke_vocal_level") || "10", 10);
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

  // Connect Audio Element to DSP Engine
  const setupAudioDsp = () => {
    if (audioElRef.current && dspEngineRef.current) {
      try {
        dspEngineRef.current.init(audioElRef.current);
        dspEngineRef.current.setVocalLevel(vocalLevel);
        dspEngineRef.current.setInstrumentalLevel(instrumentalLevel);
        dspEngineRef.current.setBassPunch(bassPunch);
      } catch (e) {
        console.warn("Audio element already connected to WebAudio node");
      }
    }
  };

  // Update DSP engine parameters whenever sliders change
  useEffect(() => {
    if (dspEngineRef.current) {
      dspEngineRef.current.setVocalLevel(vocalLevel);
      dspEngineRef.current.setInstrumentalLevel(instrumentalLevel);
      dspEngineRef.current.setBassPunch(bassPunch);
    }
    
    // Sync with native Rust DSP Engine
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("set_native_stem_levels", {
        vocal: vocalLevel,
        inst: instrumentalLevel,
        bass: bassPunch,
      }).catch(() => {});
    }).catch(() => {});

    localStorage.setItem("maudio_karaoke_vocal_level", vocalLevel.toString());
    localStorage.setItem("maudio_karaoke_inst_level", instrumentalLevel.toString());
    localStorage.setItem("maudio_karaoke_bass_level", bassPunch.toString());
  }, [vocalLevel, instrumentalLevel, bassPunch]);

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

  // Fetch synced lyrics and search iTunes preview audio whenever song changes
  useEffect(() => {
    if (!mediaState.title) {
      setLyrics([]);
      setPlainLyrics(null);
      setPreviewAudioUrl(null);
      return;
    }

    const fetchSongAssets = async () => {
      setIsLoading(true);
      try {
        const cleanTitle = mediaState.title!.replace(/\(.*?\)|\[.*?\]/g, "").trim();
        const cleanArtist = mediaState.artist ? mediaState.artist.replace(/\(.*?\)/g, "").trim() : "";
        const durSec = mediaState.duration_ms ? Math.floor(mediaState.duration_ms / 1000) : 0;

        // 1. Fetch iTunes audio preview for clean in-app DSP playback
        searchItunesSong(cleanTitle, cleanArtist).then((match) => {
          if (match?.previewUrl) {
            setPreviewAudioUrl(match.previewUrl);
          }
        }).catch(() => {});

        // 2. Fetch timed lyrics from LRCLIB
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
        console.error("Failed to load karaoke assets:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSongAssets();
  }, [mediaState.title, mediaState.artist]);

  // Handle Play/Pause of in-app DSP audio stream
  const handleToggleInAppAudio = async () => {
    if (!audioElRef.current) return;
    setupAudioDsp();

    if (isPlayingInAppAudio) {
      audioElRef.current.pause();
      setIsPlayingInAppAudio(false);
    } else {
      try {
        await audioElRef.current.play();
        setIsPlayingInAppAudio(true);
      } catch (e) {
        console.error("Audio playback error:", e);
      }
    }
  };

  // High-Precision Playback Position Interpolator (Tracks either in-app audio or GSMTC)
  useEffect(() => {
    if (isPlayingInAppAudio) return; // In-app audio uses audio.ontimeupdate directly

    if (mediaState.position_ms != null) {
      lastSyncRef.current = {
        mediaPos: mediaState.position_ms,
        timestamp: performance.now(),
      };
      setInterpolatedTimeMs(mediaState.position_ms);
    }
  }, [mediaState.position_ms, isPlayingInAppAudio]);

  useEffect(() => {
    if (isPlayingInAppAudio || !mediaState.is_playing) return;
    const interval = setInterval(() => {
      const elapsed = performance.now() - lastSyncRef.current.timestamp;
      const current = lastSyncRef.current.mediaPos + elapsed;
      setInterpolatedTimeMs(current);
    }, 100);
    return () => clearInterval(interval);
  }, [mediaState.is_playing, isPlayingInAppAudio]);

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

  // Continuous Smooth Centered Auto-Scroll (No Disappearing Animation)
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

  const durationMs = isPlayingInAppAudio && audioDurationSec > 0
    ? audioDurationSec * 1000
    : (mediaState.duration_ms || (lyrics.length > 0 ? lyrics[lyrics.length - 1].timeMs + 10000 : 180000));

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
      {/* Hidden Audio Element for Direct In-App Studio DSP Output */}
      {previewAudioUrl && (
        <audio
          ref={audioElRef}
          src={previewAudioUrl}
          crossOrigin="anonymous"
          onTimeUpdate={(e) => {
            const cur = e.currentTarget.currentTime * 1000;
            setInterpolatedTimeMs(cur);
            lastSyncRef.current = { mediaPos: cur, timestamp: performance.now() };
          }}
          onLoadedMetadata={(e) => {
            setAudioDurationSec(e.currentTarget.duration);
          }}
          onEnded={() => {
            setIsPlayingInAppAudio(false);
          }}
        />
      )}

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

      {/* 2. Interactive Timeline Scrubber Bar with In-App Play/Pause */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "10px 0 6px",
          flexShrink: 0,
        }}
      >
        {previewAudioUrl && (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleToggleInAppAudio}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: isPlayingInAppAudio ? "var(--maru-accent-pink)" : "rgba(255, 255, 255, 0.12)",
              border: "1px solid var(--maru-accent-pink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title={isPlayingInAppAudio ? "Pause In-App Karaoke DSP Stream" : "Play In-App Karaoke DSP Stream"}
          >
            {isPlayingInAppAudio ? <Pause size={14} fill="#ffffff" /> : <Play size={14} fill="#ffffff" style={{ marginLeft: "2px" }} />}
          </motion.button>
        )}

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
            if (audioElRef.current && isPlayingInAppAudio) {
              audioElRef.current.currentTime = newPos / 1000;
            }
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

      {/* 3. Main Content Split: Smooth Continuous Scrolling Lyrics Center + Stems Sidebar */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Continuous Smooth Scrolling Lyric Stage */}
        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "160px 24px 240px",
            gap: "20px",
            userSelect: "none",
            scrollBehavior: "smooth",
          }}
        >
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginTop: "40px" }}>
              <RefreshCw size={32} className="animate-spin" color="var(--maru-accent-pink)" />
              <span style={{ fontSize: "13px", color: "rgba(235, 235, 245, 0.72)" }}>
                Fetching synced karaoke lyrics...
              </span>
            </div>
          )}

          {!isLoading && !mediaState.title && (
            <div style={{ textAlign: "center", marginTop: "40px" }}>
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
            <div style={{ textAlign: "center", marginTop: "40px" }}>
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

          {/* Persistent Smooth Scrolling Lyric Lines with Dynamic Visibility & 3-Line Focus */}
          {!isLoading &&
            lyrics.length > 0 &&
            lyrics.map((line, idx) => {
              const isCurrent = idx === currentLineIdx;
              const isAdjacent = Math.abs(idx - currentLineIdx) === 1;
              const isNear = Math.abs(idx - currentLineIdx) === 2;

              return (
                <div
                  key={idx}
                  ref={isCurrent ? activeLineRef : null}
                  onClick={() => {
                    setInterpolatedTimeMs(line.timeMs);
                    if (audioElRef.current && isPlayingInAppAudio) {
                      audioElRef.current.currentTime = line.timeMs / 1000;
                    }
                    lastSyncRef.current = { mediaPos: line.timeMs, timestamp: performance.now() };
                    setCurrentLineIdx(idx);
                  }}
                  style={{
                    fontSize: isCurrent
                      ? "clamp(38px, 4.2vw, 54px)"
                      : isAdjacent
                      ? "clamp(20px, 2.2vw, 25px)"
                      : "15px",
                    fontWeight: isCurrent ? 900 : isAdjacent ? 700 : 500,
                    letterSpacing: isCurrent ? "-0.5px" : "normal",
                    color: isCurrent
                      ? "#ffffff"
                      : isAdjacent
                      ? "rgba(235, 235, 245, 0.75)"
                      : "rgba(235, 235, 245, 0.2)",
                    opacity: isCurrent ? 1 : isAdjacent ? 0.45 : isNear ? 0.15 : 0.04,
                    transform: isCurrent ? "scale(1.04)" : "scale(1)",
                    textAlign: "center",
                    cursor: "pointer",
                    maxWidth: "920px",
                    lineHeight: "1.3",
                    textShadow: isCurrent
                      ? "0 0 35px rgba(232, 93, 159, 0.95), 0 3px 16px rgba(0,0,0,0.95)"
                      : "none",
                    padding: isCurrent ? "18px 42px" : "6px 20px",
                    borderRadius: isCurrent ? "26px" : "14px",
                    background: isCurrent ? "rgba(232, 93, 159, 0.26)" : "transparent",
                    border: isCurrent ? "2px solid rgba(232, 93, 159, 0.65)" : "1.5px solid transparent",
                    boxShadow: isCurrent
                      ? "0 0 45px rgba(232, 93, 159, 0.45), inset 0 0 16px rgba(232, 93, 159, 0.15)"
                      : "none",
                    transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  {line.text}
                </div>
              );
            })}
        </div>

        {/* 4. Real-Time Stem Separation & Apple Music Sing Slider Panel */}
        <div
          style={{
            width: showStemDrawer ? "290px" : "0px",
            opacity: showStemDrawer ? 1 : 0,
            overflow: "hidden",
            transition: "all 0.3s ease",
            margin: showStemDrawer ? "16px 4px 16px 16px" : "0",
            padding: showStemDrawer ? "20px 18px" : "0",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            flexShrink: 0,
            border: showStemDrawer ? "1px solid rgba(232, 93, 159, 0.4)" : "none",
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

          {/* Direct Studio Karaoke Player Trigger */}
          {previewAudioUrl && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleToggleInAppAudio}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "9px 14px",
                borderRadius: "12px",
                background: isPlayingInAppAudio ? "var(--maru-accent-pink)" : "rgba(232, 93, 159, 0.2)",
                border: "1px solid var(--maru-accent-pink)",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              {isPlayingInAppAudio ? <Pause size={14} fill="#ffffff" /> : <Play size={14} fill="#ffffff" />}
              <span>{isPlayingInAppAudio ? "PAUSE IN-APP DSP KARAOKE" : "PLAY IN-APP DSP KARAOKE"}</span>
            </motion.button>
          )}

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
            ✨ Direct DSP: Pull Lead Vocals slider to 0% to completely mute lead vocals with zero echo or feedback!
          </div>
        </div>
      </div>
    </motion.div>
  );
};
