import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Music, Sparkles, Disc, Play } from "lucide-react";

interface SongDetailModalProps {
  song: {
    title: string;
    artist: string;
    album?: string;
    artworkUrl?: string | null;
  } | null;
  onDismiss: () => void;
  onSelectSong?: (title: string, artist: string) => void;
}

export const SongDetailModal: React.FC<SongDetailModalProps> = ({
  song,
  onDismiss,
  onSelectSong,
}) => {
  const [resolvedArt, setResolvedArt] = useState<string | null>(null);
  const [appleMusicUrl, setAppleMusicUrl] = useState<string | null>(null);
  const [similarTracks, setSimilarTracks] = useState<{ title: string; artist: string }[]>([]);

  useEffect(() => {
    if (!song) return;
    setResolvedArt(song.artworkUrl || null);

    // Query iTunes API for high-res art and streaming link
    fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        `${song.artist} ${song.title}`,
      )}&entity=song&limit=1`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.results && data.results[0]) {
          const match = data.results[0];
          setResolvedArt(match.artworkUrl100?.replace("100x100bb", "600x600bb") || null);
          setAppleMusicUrl(match.trackViewUrl || null);
        }
      })
      .catch(console.error);

    // Sample similar tracks
    setSimilarTracks([
      { title: "Tell Your World", artist: "kz (livetune) feat. Hatsune Miku" },
      { title: "Lavie", artist: "THREEE feat. Kagamine Len" },
      { title: "Shun-kan Beat", artist: "Pastel*Palettes" },
    ]);
  }, [song]);

  return (
    <AnimatePresence>
      {song && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(12px)",
              zIndex: 110,
            }}
          />

          {/* Modal Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: "85vh",
              background: "linear-gradient(180deg, #140d24 0%, #0a0714 100%)",
              borderTop: "1.5px solid rgba(255, 113, 162, 0.4)",
              borderRadius: "24px 24px 0 0",
              zIndex: 111,
              padding: "24px 32px 40px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              maxWidth: "800px",
              margin: "0 auto",
              boxShadow: "0 -16px 40px rgba(0, 0, 0, 0.8)",
            }}
          >
            {/* Sheet Handle & Close */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div
                style={{
                  width: "48px",
                  height: "4px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.2)",
                  margin: "0 auto",
                }}
              />
              <button
                onClick={onDismiss}
                style={{
                  position: "absolute",
                  right: "24px",
                  top: "20px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fafcff",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Song Spotlight */}
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "20px",
                  overflow: "hidden",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7)",
                  border: "1.5px solid rgba(255, 113, 162, 0.4)",
                  flexShrink: 0,
                  background: "#161b2e",
                }}
              >
                {resolvedArt ? (
                  <img src={resolvedArt} alt={song.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Disc size={40} color="var(--maru-accent-pink)" />
                  </div>
                )}
              </div>

              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: "22px", fontWeight: 900, color: "#fafcff" }}>
                  {song.title}
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--maru-accent-pink)", marginTop: "4px" }}>
                  {song.artist}
                </div>
                {song.album && (
                  <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)", marginTop: "3px" }}>
                    {song.album}
                  </div>
                )}

                {/* Streaming Launch Button */}
                {appleMusicUrl && (
                  <a
                    href={appleMusicUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "12px",
                      padding: "8px 16px",
                      borderRadius: "999px",
                      background: "rgba(255, 113, 162, 0.2)",
                      border: "1px solid rgba(255, 113, 162, 0.5)",
                      color: "#ffffff",
                      fontSize: "12.5px",
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    <span>Open in Apple Music</span>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>

            {/* Similar Tracks Row */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
              <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--maru-accent-blue)" }}>
                Similar Tracks
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {similarTracks.map((t, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onSelectSong) onSelectSong(t.title, t.artist);
                    }}
                    className="glass-card-subtle"
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#fafcff" }}>{t.title}</div>
                      <div style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.5)", marginTop: "1px" }}>{t.artist}</div>
                    </div>
                    <Play size={14} color="var(--maru-accent-pink)" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
