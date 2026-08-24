import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Cast,
  Volume2,
  CheckCircle2,
  RotateCw,
  Music,
  Sparkles,
  Sliders,
  Radio,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Wifi,
  WifiOff,
  Mic,
  Disc,
  ListMusic,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  createReceiverSession,
  fetchReceiverStatus,
  lookupReceiverPin,
  completeReceiverHandoff,
  sendRemoteCommand,
  fetchTrackLyrics,
  MarucastPcmStreamPlayer,
  MarucastSessionData,
  MarucastReceiverStatus,
  MarucastLyricsData,
} from "../utils/marucastClient";

export const MarucastScreen: React.FC = () => {
  // Mode: Receiver (PC as speaker) vs Broadcaster (Cast to other device)
  const [isBroadcaster, setIsBroadcaster] = useState(false);

  // Receiver State
  const [session, setSession] = useState<MarucastSessionData | null>(null);
  const [countdown, setCountdown] = useState(120);
  const [status, setStatus] = useState<MarucastReceiverStatus | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Audio Playback & Stream
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1.0);
  const [latencyOffset, setLatencyOffset] = useState(0);
  const [eqLevels, setEqLevels] = useState<number[]>([15, 30, 60, 40, 75, 50, 35, 20]);

  // Track & Lyrics State
  const [lyricsData, setLyricsData] = useState<MarucastLyricsData | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [playbackPosMs, setPlaybackPosMs] = useState(0);

  // Broadcaster Mode State
  const [inputPin, setInputPin] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcasterError, setBroadcasterError] = useState<string | null>(null);
  const [broadcasterToken, setBroadcasterToken] = useState<string | null>(null);

  // Player Instance
  const playerRef = useRef<MarucastPcmStreamPlayer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentTrackKeyRef = useRef<string>("");

  // Initialize Player
  useEffect(() => {
    playerRef.current = new MarucastPcmStreamPlayer();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      playerRef.current?.stop();
    };
  }, []);

  // Visualizer Animation Loop
  useEffect(() => {
    if (!isStreamActive) {
      setEqLevels([10, 15, 20, 15, 10, 12, 18, 14]);
      return;
    }

    const updateVisualizer = () => {
      if (playerRef.current) {
        const freqData = playerRef.current.getFrequencyData();
        if (freqData && freqData.length > 0) {
          const step = Math.floor(freqData.length / 8);
          const newLevels = Array.from({ length: 8 }, (_, i) => {
            const val = freqData[i * step] || 0;
            return Math.max(10, Math.min(100, Math.round((val / 255) * 100)));
          });
          setEqLevels(newLevels);
        }
      }
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isStreamActive]);

  // Request new Receiver Session PIN
  const startNewSession = async () => {
    setIsLoadingSession(true);
    setSessionError(null);
    try {
      const data = await createReceiverSession();
      setSession(data);
      const expires = new Date(data.expiresAt).getTime();
      const remainSec = Math.max(10, Math.round((expires - Date.now()) / 1000));
      setCountdown(remainSec);
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Failed to generate pairing PIN.");
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Auto-init Receiver Session on mount
  useEffect(() => {
    if (!isBroadcaster && !session && !isLoadingSession) {
      startNewSession();
    }
  }, [isBroadcaster]);

  // Countdown timer for PIN expiration
  useEffect(() => {
    if (isBroadcaster || isStreamActive || !session) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          startNewSession();
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isBroadcaster, isStreamActive, session]);

  // Poll Receiver Status when PIN is active
  useEffect(() => {
    if (isBroadcaster || !session?.token) return;

    const interval = setInterval(async () => {
      try {
        const curStatus = await fetchReceiverStatus(session.token);
        setStatus(curStatus);

        // Check if phone has connected with a relayUrl
        if (curStatus.status === "ready" && curStatus.relayUrl && !isStreamActive) {
          handleConnectRelay(curStatus.relayUrl);
        }

        // Update playback position
        if (typeof curStatus.mediaPositionMs === "number") {
          setPlaybackPosMs(curStatus.mediaPositionMs);
        }
      } catch (err) {
        // Status polling error
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [session, isBroadcaster, isStreamActive]);

  // Handle stream connection
  const handleConnectRelay = async (relayUrl: string) => {
    if (!playerRef.current) return;
    setStreamError(null);
    try {
      playerRef.current.setVolume(volume);
      playerRef.current.setLatencyOffset(latencyOffset);
      await playerRef.current.startStream(
        relayUrl,
        () => {
          setIsStreamActive(true);
        },
        (err) => {
          setStreamError(err.message);
          setIsStreamActive(false);
        }
      );
    } catch (e) {
      setStreamError(e instanceof Error ? e.message : "Failed to connect to stream.");
    }
  };

  // Fetch lyrics whenever current track changes
  useEffect(() => {
    const trackTitle = status?.mediaTitle?.trim();
    const trackArtist = status?.mediaArtist?.trim();
    if (!trackTitle) return;

    const trackKey = `${trackTitle}-${trackArtist}`;
    if (currentTrackKeyRef.current === trackKey) return;
    currentTrackKeyRef.current = trackKey;

    setIsLoadingLyrics(true);
    fetchTrackLyrics(trackTitle, trackArtist || "")
      .then((data) => {
        setLyricsData(data);
      })
      .finally(() => {
        setIsLoadingLyrics(false);
      });
  }, [status?.mediaTitle, status?.mediaArtist]);

  // Advance local playback progress ticker when media is playing
  useEffect(() => {
    if (!isStreamActive || !status?.mediaPlaying) return;

    const ticker = setInterval(() => {
      setPlaybackPosMs((prev) => {
        const dur = status?.mediaDurationMs || 300000;
        return Math.min(dur, prev + 250);
      });
    }, 250);

    return () => clearInterval(ticker);
  }, [isStreamActive, status?.mediaPlaying, status?.mediaDurationMs]);

  // Handle Disconnect
  const handleDisconnect = () => {
    playerRef.current?.stop();
    setIsStreamActive(false);
    setStatus(null);
    setLyricsData(null);
    currentTrackKeyRef.current = "";
    startNewSession();
  };

  // Remote Control Commands
  const handleCommand = async (cmd: "play" | "pause" | "previous" | "next") => {
    if (!session?.token) return;
    await sendRemoteCommand(session.token, cmd, status?.relayUrl);
    if (status) {
      if (cmd === "play") setStatus({ ...status, mediaPlaying: true });
      if (cmd === "pause") setStatus({ ...status, mediaPlaying: false });
    }
  };

  // Handle Broadcaster Connect
  const handleBroadcasterConnect = async () => {
    if (!inputPin.trim()) return;
    setBroadcasterError(null);
    try {
      const res = await lookupReceiverPin(inputPin);
      if (res.success && res.token) {
        setBroadcasterToken(res.token);
        await completeReceiverHandoff({
          token: res.token,
          deviceName: "MAudio Windows PC",
          mediaTitle: "Desktop Audio Stream",
          mediaArtist: "Windows PC",
          relayMode: "lan",
        });
        setIsBroadcasting(true);
      } else {
        setBroadcasterError("Receiver pairing code not found or expired.");
      }
    } catch (e) {
      setBroadcasterError(e instanceof Error ? e.message : "Failed to pair with receiver.");
    }
  };

  // Format PIN digits
  const formattedPin = useMemo(() => {
    if (!session?.pairingCode) return "--- ---";
    const code = session.pairingCode;
    if (code.length === 6) {
      return `${code.slice(0, 3)} ${code.slice(3)}`;
    }
    return code;
  }, [session?.pairingCode]);

  // Active lyric line calculation
  const activeLyricIndex = useMemo(() => {
    if (!lyricsData?.synced || !lyricsData.lines.length) return -1;
    let activeIdx = -1;
    for (let i = 0; i < lyricsData.lines.length; i++) {
      const lineTime = lyricsData.lines[i].startMs ?? 0;
      if (playbackPosMs >= lineTime) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }, [lyricsData, playbackPosMs]);

  // Format milliseconds to mm:ss
  const formatTime = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 24px 36px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        maxWidth: "1100px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* 1. Master Status Tile */}
      <div
        className="glass-card"
        style={{
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: isStreamActive
            ? "1px solid rgba(232, 93, 159, 0.6)"
            : "1px solid rgba(255, 255, 255, 0.094)",
          background: isStreamActive
            ? "linear-gradient(135deg, rgba(232, 93, 159, 0.12) 0%, rgba(10, 7, 18, 0.7) 100%)"
            : "rgba(10, 7, 18, 0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: isStreamActive ? "rgba(232, 93, 159, 0.25)" : "rgba(255, 255, 255, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: isStreamActive ? "1px solid var(--maru-accent-pink)" : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <Cast size={22} color={isStreamActive ? "var(--maru-accent-pink)" : "#a1a1aa"} />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#f4f4f9fa", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{isBroadcaster ? "MARUCAST BROADCASTER" : "MARUCAST RECEIVER"}</span>
              {isStreamActive && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#4ade80",
                    background: "rgba(74, 222, 128, 0.15)",
                    border: "1px solid rgba(74, 222, 128, 0.4)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  LIVE PCM STREAMING
                </span>
              )}
            </div>
            <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)", marginTop: "2px" }}>
              {isStreamActive
                ? `Lossless 44.1kHz stereo stream active from ${status?.deviceName || "Mobile Device"}`
                : "Stream lossless system audio, track metadata, and live lyrics over local Wi-Fi."}
            </div>
          </div>
        </div>

        {isStreamActive && (
          <button
            onClick={handleDisconnect}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              color: "#f87171",
              borderRadius: "16px",
              padding: "6px 14px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Mode Selector Pill: RECEIVER vs BROADCASTER */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "4px",
          borderRadius: "24px",
          background: "rgba(24, 18, 43, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.094)",
        }}
      >
        <button
          onClick={() => {
            setIsBroadcaster(false);
            if (isBroadcasting) setIsBroadcasting(false);
          }}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: "24px",
            background: !isBroadcaster ? "rgba(232, 93, 159, 0.25)" : "transparent",
            border: !isBroadcaster ? "1px solid var(--maru-accent-pink)" : "1px solid transparent",
            color: !isBroadcaster ? "var(--maru-accent-pink)" : "rgba(235, 235, 245, 0.72)",
            fontSize: "11px",
            fontWeight: !isBroadcaster ? 800 : 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          RECEIVER (THIS PC AS SPEAKER)
        </button>
        <button
          onClick={() => {
            setIsBroadcaster(true);
            if (isStreamActive) handleDisconnect();
          }}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: "24px",
            background: isBroadcaster ? "rgba(96, 226, 255, 0.25)" : "transparent",
            border: isBroadcaster ? "1px solid var(--maru-accent-blue)" : "1px solid transparent",
            color: isBroadcaster ? "var(--maru-accent-blue)" : "rgba(235, 235, 245, 0.72)",
            fontSize: "11px",
            fontWeight: isBroadcaster ? 800 : 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          BROADCASTER (CAST TO PHONE/TV)
        </button>
      </div>

      {/* Receiver Mode: Waiting for Connection */}
      {!isBroadcaster && !isStreamActive && (
        <div
          className="glass-card"
          style={{
            padding: "32px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "16px",
            background: "linear-gradient(180deg, rgba(28, 20, 48, 0.5) 0%, rgba(10, 7, 18, 0.6) 100%)",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "1.5px" }}>
            PAIRING PIN FOR MOBILE APP (MAUDIO / LAST NOTIF)
          </div>

          <div
            style={{
              fontSize: "42px",
              fontWeight: 900,
              letterSpacing: "8px",
              fontFamily: "monospace",
              color: "#f4f4f9fa",
              padding: "16px 36px",
              borderRadius: "16px",
              background: "rgba(0, 0, 0, 0.5)",
              border: "2px solid rgba(232, 93, 159, 0.6)",
              boxShadow: "0 0 32px rgba(232, 93, 159, 0.25)",
              userSelect: "all",
            }}
          >
            {isLoadingSession ? "..." : formattedPin}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "rgba(235, 235, 245, 0.7)" }}>
              <RotateCw size={14} className="animate-spin" />
              <span>Refreshes in {countdown}s</span>
            </div>

            <button
              onClick={startNewSession}
              disabled={isLoadingSession}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#f4f4f9fa",
                borderRadius: "14px",
                padding: "4px 12px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Get New PIN
            </button>
          </div>

          {sessionError && (
            <div style={{ color: "#f87171", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertCircle size={14} />
              <span>{sessionError}</span>
            </div>
          )}

          <div
            style={{
              marginTop: "12px",
              padding: "12px 18px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              maxWidth: "500px",
              fontSize: "12px",
              color: "rgba(235, 235, 245, 0.6)",
              lineHeight: "1.5",
            }}
          >
            Open <strong>MAudio</strong> on your Android phone, navigate to <strong>Marucast</strong>, and enter this 6-digit PIN to instantly beam your audio here!
          </div>
        </div>
      )}

      {/* Receiver Mode: Active Live Stream & Now Playing */}
      {!isBroadcaster && isStreamActive && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Hero Now Playing Card */}
          <div
            className="glass-card"
            style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              background: "linear-gradient(135deg, rgba(33, 23, 52, 0.6) 0%, rgba(14, 10, 24, 0.8) 100%)",
            }}
          >
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
              {/* Artwork / Vinyl */}
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  position: "relative",
                  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  flexShrink: 0,
                  background: "#141020",
                }}
              >
                {status?.artworkUrl ? (
                  <img
                    src={status.artworkUrl}
                    alt="Album Art"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, #2d1b4e 0%, #170d28 100%)",
                    }}
                  >
                    <Disc size={56} color="rgba(232, 93, 159, 0.8)" className={status?.mediaPlaying ? "animate-spin" : ""} style={{ animationDuration: "6s" }} />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  {status?.mediaAppLabel && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        color: "var(--maru-accent-pink)",
                        background: "rgba(232, 93, 159, 0.15)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      {status.mediaAppLabel}
                    </span>
                  )}
                  <span style={{ fontSize: "11px", color: "rgba(235, 235, 245, 0.5)" }}>
                    from {status?.deviceName || "Android Phone"}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    color: "#f4f4f9fa",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {status?.mediaTitle || "Live Audio Stream"}
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(235, 235, 245, 0.8)",
                    marginTop: "2px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {status?.mediaArtist || "Broadcasting Source"}
                </div>

                {/* Progress Bar */}
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div
                    style={{
                      height: "4px",
                      borderRadius: "2px",
                      background: "rgba(255, 255, 255, 0.1)",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(
                          100,
                          ((playbackPosMs) / (status?.mediaDurationMs || 300000)) * 100
                        )}%`,
                        background: "linear-gradient(90deg, var(--maru-accent-pink) 0%, #70a5ff 100%)",
                        borderRadius: "2px",
                        transition: "width 0.25s linear",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "rgba(235, 235, 245, 0.5)" }}>
                    <span>{formatTime(playbackPosMs)}</span>
                    <span>{formatTime(status?.mediaDurationMs || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Live Equalizer Visualizer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "4px",
                  height: "64px",
                  padding: "8px 12px",
                  background: "rgba(0, 0, 0, 0.3)",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                {eqLevels.map((lvl, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: "5px",
                      height: `${lvl}%`,
                      minHeight: "4px",
                      background: "linear-gradient(180deg, var(--maru-accent-pink) 0%, #60e2ff 100%)",
                      borderRadius: "2px",
                      transition: "height 0.08s ease",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Remote Transport Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "20px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                paddingTop: "16px",
              }}
            >
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleCommand("previous")}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f4f4f9fa",
                  cursor: "pointer",
                }}
              >
                <SkipBack size={18} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleCommand(status?.mediaPlaying ? "pause" : "play")}
                style={{
                  background: "linear-gradient(135deg, var(--maru-accent-pink) 0%, #ff7bb0 100%)",
                  border: "none",
                  borderRadius: "50%",
                  width: "52px",
                  height: "52px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#050507",
                  boxShadow: "0 0 20px rgba(232, 93, 159, 0.4)",
                  cursor: "pointer",
                }}
              >
                {status?.mediaPlaying ? <Pause size={24} fill="#050507" /> : <Play size={24} fill="#050507" style={{ marginLeft: "2px" }} />}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleCommand("next")}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f4f4f9fa",
                  cursor: "pointer",
                }}
              >
                <SkipForward size={18} />
              </motion.button>
            </div>
          </div>

          {/* Synced Spotlight Lyrics Panel */}
          <div
            className="glass-card"
            style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              minHeight: "150px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "1px" }}>
                SPOTLIGHT LYRICS
              </div>
              {isLoadingLyrics && (
                <div style={{ fontSize: "11px", color: "rgba(235, 235, 245, 0.5)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <RotateCw size={12} className="animate-spin" />
                  <span>Loading lyrics...</span>
                </div>
              )}
            </div>

            {lyricsData?.lines && lyricsData.lines.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>
                {/* 3-line spotlight view: Previous, Active, Next */}
                {activeLyricIndex >= 0 ? (
                  <>
                    {activeLyricIndex > 0 && (
                      <div style={{ fontSize: "13px", color: "rgba(235, 235, 245, 0.35)", fontWeight: 500 }}>
                        {lyricsData.lines[activeLyricIndex - 1].text}
                      </div>
                    )}
                    <motion.div
                      key={activeLyricIndex}
                      initial={{ opacity: 0.6, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        fontSize: "17px",
                        fontWeight: 800,
                        color: "var(--maru-accent-pink)",
                        textShadow: "0 0 16px rgba(232, 93, 159, 0.4)",
                        lineHeight: 1.4,
                      }}
                    >
                      {lyricsData.lines[activeLyricIndex].text}
                    </motion.div>
                    {activeLyricIndex < lyricsData.lines.length - 1 && (
                      <div style={{ fontSize: "13px", color: "rgba(235, 235, 245, 0.35)", fontWeight: 500 }}>
                        {lyricsData.lines[activeLyricIndex + 1].text}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: "14px", color: "rgba(235, 235, 245, 0.6)", fontStyle: "italic" }}>
                    {lyricsData.lines[0]?.text || "Instrumental intro..."}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.4)", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>
                {isLoadingLyrics ? "Searching lyrics database..." : "No synced lyrics found for this track."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Broadcaster Mode: PIN Input */}
      {isBroadcaster && (
        <div
          className="glass-card"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--maru-accent-blue)", letterSpacing: "1px" }}>
            ENTER RECEIVER PIN (TV / MOBILE / WEB)
          </div>

          <input
            type="text"
            value={inputPin}
            onChange={(e) => setInputPin(e.target.value)}
            placeholder="Enter 6-digit PIN (e.g. 842 109)"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "14px 18px",
              color: "#f4f4f9fa",
              fontSize: "18px",
              fontFamily: "monospace",
              letterSpacing: "3px",
              outline: "none",
            }}
          />

          {broadcasterError && (
            <div style={{ color: "#f87171", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertCircle size={14} />
              <span>{broadcasterError}</span>
            </div>
          )}

          <button
            onClick={handleBroadcasterConnect}
            style={{
              padding: "14px",
              borderRadius: "24px",
              background: "var(--maru-accent-blue)",
              border: "none",
              color: "#050507",
              fontWeight: 800,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {isBroadcasting ? "BROADCASTING ACTIVE" : "CONNECT & CAST"}
          </button>
        </div>
      )}

      {/* Latency & Tuning Section */}
      <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "1px" }}>
            RECEIVER VOLUME & LATENCY COMPENSATION
          </div>
          <div style={{ fontSize: "11px", color: "rgba(235, 235, 245, 0.6)" }}>
            {Math.round(volume * 100)}% Volume
          </div>
        </div>

        {/* Volume Slider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Volume2 size={16} color="rgba(235, 235, 245, 0.7)" />
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.01"
            value={volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              playerRef.current?.setVolume(val);
            }}
            style={{ flex: 1, accentColor: "var(--maru-accent-pink)", cursor: "pointer" }}
          />
        </div>

        {/* Latency Presets */}
        <div style={{ display: "flex", gap: "6px" }}>
          {[-500, -100, 0, 100, 500].map((offset) => {
            const isSelected = latencyOffset === offset;
            return (
              <button
                key={offset}
                onClick={() => {
                  setLatencyOffset(offset);
                  playerRef.current?.setLatencyOffset(offset);
                }}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "10px",
                  background: isSelected ? "rgba(232, 93, 159, 0.25)" : "rgba(255, 255, 255, 0.08)",
                  border: isSelected ? "1px solid var(--maru-accent-pink)" : "1px solid rgba(255, 255, 255, 0.08)",
                  color: isSelected ? "var(--maru-accent-pink)" : "rgba(235, 235, 245, 0.72)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {offset > 0 ? `+${offset}ms` : `${offset}ms`}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
