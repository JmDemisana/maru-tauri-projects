import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MediaState } from "../types";
import { EqualizerHUD } from "./EqualizerHUD";
import { ChevronRight, Disc3 } from "lucide-react";

interface NotificationMirrorBottomBarProps {
  mediaState: MediaState;
  onClick: () => void;
}

const formatAppName = (name: string | null): string => {
  if (!name) return "MEDIA LISTENER";
  const lower = name.toLowerCase();
  if (lower.includes("applemusic") || lower.includes("apple.music")) return "APPLE MUSIC";
  if (lower.includes("spotify")) return "SPOTIFY";
  if (lower.includes("youtube")) return "YOUTUBE MUSIC";
  if (lower.includes("tidal")) return "TIDAL";
  if (lower.includes("vlc")) return "VLC MEDIA PLAYER";
  if (lower.includes("foobar")) return "FOOBAR2000";
  if (lower.includes("chrome")) return "GOOGLE CHROME";
  if (lower.includes("edge") || lower.includes("edg")) return "MICROSOFT EDGE";
  if (lower.includes("firefox")) return "FIREFOX";
  if (lower.includes("musicbee")) return "MUSICBEE";
  return name.split("!")[0].split("_")[0].toUpperCase();
};

export const NotificationMirrorBottomBar: React.FC<NotificationMirrorBottomBarProps> = ({
  mediaState,
  onClick,
}) => {
  const isPlaying = mediaState.is_playing && !!mediaState.title;

  return (
    <AnimatePresence>
      {isPlaying && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          onClick={onClick}
          style={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(22, 16, 38, 0.94)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255, 113, 162, 0.5)",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            zIndex: 50,
            boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", overflow: "hidden" }}>
            {/* Equalizer / Artwork Box */}
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "rgba(255, 113, 162, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                overflow: "hidden",
                border: "1px solid rgba(255, 113, 162, 0.35)",
              }}
            >
              {mediaState.artwork_base64 ? (
                <img
                  src={mediaState.artwork_base64}
                  alt="Art"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <EqualizerHUD isPlaying={true} />
              )}
            </div>

            {/* Title & Artist */}
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "13.5px",
                  fontWeight: 800,
                  color: "#fafcff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {mediaState.title}
              </div>
              <div
                style={{
                  fontSize: "11.5px",
                  color: "rgba(255, 255, 255, 0.6)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginTop: "1px",
                }}
              >
                {mediaState.artist}
                {mediaState.album ? ` • ${mediaState.album}` : ""}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <span
              style={{
                fontSize: "9.5px",
                fontWeight: 900,
                padding: "3px 8px",
                borderRadius: "999px",
                background: "rgba(255, 113, 162, 0.2)",
                border: "1px solid rgba(255, 113, 162, 0.5)",
                color: "var(--maru-accent-pink)",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              {formatAppName(mediaState.app_name)}
            </span>
            <ChevronRight size={18} color="var(--maru-accent-pink)" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
