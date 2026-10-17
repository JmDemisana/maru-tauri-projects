import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Disc, Play, LoaderCircle } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { fetchArtistTopTracks, fetchSimilarTracks } from "../utils/lastfmApi";

interface SongDetailModalProps {
  song: {
    title: string;
    artist: string;
    album?: string;
    artworkUrl?: string | null;
  } | null;
  onDismiss: () => void;
  onSelectSong?: (title: string, artist: string) => void;
  onOpenArtist?: (artist: string) => void;
}

export function getStreamingUrls(title: string, artist: string, directAppleMusicUrl?: string | null) {
  const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g, "").trim();
  const cleanArtist = artist.replace(/\(.*?\)/g, "").trim();
  const q = encodeURIComponent(`${cleanArtist} ${cleanTitle}`.trim());

  return {
    spotify: `https://open.spotify.com/search/${q}`,
    appleMusic: directAppleMusicUrl || `https://music.apple.com/search?term=${q}`,
    youtubeMusic: `https://music.youtube.com/search?q=${q}`,
    youtube: `https://www.youtube.com/results?search_query=${q}`,
    tidal: `https://listen.tidal.com/search?q=${q}`,
    lastfm: `https://www.last.fm/music/${encodeURIComponent(cleanArtist)}/_/${encodeURIComponent(cleanTitle)}`,
  };
}

export const SongDetailModal: React.FC<SongDetailModalProps> = ({
  song,
  onDismiss,
  onSelectSong,
  onOpenArtist,
}) => {
  const [resolvedArt, setResolvedArt] = useState<string | null>(null);
  const [appleMusicUrl, setAppleMusicUrl] = useState<string | null>(null);
  const [preferredPlatform, setPreferredPlatform] = useState<string>("Spotify");
  const [similarTracks, setSimilarTracks] = useState<{ title: string; artist: string }[]>([]);
  const [artistTopTracks, setArtistTopTracks] = useState<{ title: string; artist: string }[]>([]);
  const [isRelatedTracksLoading, setIsRelatedTracksLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("maudio_preferred_platform") || "Apple Music";
    setPreferredPlatform(saved);
  }, [song]);

  useEffect(() => {
    if (!song) return;
    let isCurrentSong = true;
    setResolvedArt(song.artworkUrl || null);
    setAppleMusicUrl(null);
    setSimilarTracks([]);
    setArtistTopTracks([]);
    setIsRelatedTracksLoading(true);

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

    Promise.allSettled([
      fetchArtistTopTracks(song.artist, 5),
      fetchSimilarTracks(song.artist, song.title, 6),
    ])
      .then(([artistTracksResult, similarTracksResult]) => {
        if (!isCurrentSong) return;

        if (artistTracksResult.status === "fulfilled") {
          setArtistTopTracks(
            artistTracksResult.value
              .filter((track) => track.title.localeCompare(song.title, undefined, { sensitivity: "accent" }) !== 0)
              .slice(0, 4),
          );
        } else {
          console.warn("Could not fetch artist tracks:", artistTracksResult.reason);
        }

        if (similarTracksResult.status === "fulfilled") {
          setSimilarTracks(similarTracksResult.value);
        } else {
          console.warn("Could not fetch similar tracks:", similarTracksResult.reason);
        }
      })
      .finally(() => {
        if (isCurrentSong) setIsRelatedTracksLoading(false);
      });

    return () => {
      isCurrentSong = false;
    };
  }, [song]);

  const handleLaunchUrl = async (url: string) => {
    try {
      await openUrl(url);
    } catch (e) {
      window.open(url, "_blank");
    }
  };

  const urls = song ? getStreamingUrls(song.title, song.artist, appleMusicUrl) : null;

  const platforms = [
    { name: "Spotify", url: urls?.spotify, color: "#1DB954" },
    { name: "Apple Music", url: urls?.appleMusic, color: "#FA243C" },
    { name: "YouTube Music", url: urls?.youtubeMusic, color: "#FF0000" },
    { name: "YouTube", url: urls?.youtube, color: "#FF0000" },
    { name: "Tidal", url: urls?.tidal, color: "#00FFFF" },
    { name: "Last.fm", url: urls?.lastfm, color: "#D51007" },
  ];

  const primaryPlatform = platforms.find((p) => p.name.toLowerCase() === preferredPlatform.toLowerCase()) || platforms[0];

  return (
    <AnimatePresence>
      {song && urls && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            aria-hidden="true"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(14px)",
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
              maxHeight: "88vh",
              background: "linear-gradient(180deg, #18102a 0%, #0a0714 100%)",
              borderTop: "1.5px solid rgba(255, 113, 162, 0.4)",
              borderRadius: "24px 24px 0 0",
              zIndex: 111,
              padding: "24px 32px 40px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              maxWidth: "840px",
              margin: "0 auto",
              boxShadow: "0 -16px 40px rgba(0, 0, 0, 0.8)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="song-detail-title"
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
                type="button"
                aria-label="Close song details"
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
                <div id="song-detail-title" style={{ fontSize: "22px", fontWeight: 900, color: "#fafcff" }}>
                  {song.title}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenArtist?.(song.artist)}
                  disabled={!onOpenArtist}
                  style={{
                    padding: 0,
                    background: "none",
                    border: "none",
                    color: "var(--maru-accent-pink)",
                    font: "inherit",
                    fontSize: "16px",
                    fontWeight: 700,
                    marginTop: "4px",
                    cursor: onOpenArtist ? "pointer" : "default",
                    textAlign: "left",
                  }}
                >
                  {song.artist}
                </button>
                {song.album && (
                  <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.5)", marginTop: "3px" }}>
                    {song.album}
                  </div>
                )}

                {/* Primary Streaming Launcher */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => primaryPlatform.url && handleLaunchUrl(primaryPlatform.url)}
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "14px",
                    padding: "9px 20px",
                    borderRadius: "999px",
                    background: "var(--maru-accent-pink)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(255, 113, 162, 0.4)",
                  }}
                >
                  <Play size={14} fill="#ffffff" />
                  <span>PLAY ON {primaryPlatform.name.toUpperCase()}</span>
                  <ExternalLink size={13} />
                </motion.button>
              </div>
            </div>

            {/* All Streaming Platforms Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "rgba(235, 235, 245, 0.6)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                Listen on other music services
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px" }}>
                {platforms.map((p) => (
                  <motion.button
                    key={p.name}
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => p.url && handleLaunchUrl(p.url)}
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "8px 12px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fafcff",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <span>{p.name}</span>
                    <ExternalLink size={11} color="rgba(255, 255, 255, 0.5)" />
                  </motion.button>
                ))}
              </div>
            </div>

            {isRelatedTracksLoading ? (
              <div style={{ height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LoaderCircle size={22} color="var(--maru-accent-blue)" aria-label="Loading related tracks" style={{ animation: "maudio-spin 0.8s linear infinite" }} />
              </div>
            ) : (
              <>
                {artistTopTracks.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                    <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--maru-accent-pink)" }}>
                      More by {song.artist}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {artistTopTracks.map((track) => (
                        <RelatedTrackButton key={`${track.artist}-${track.title}`} track={track} accentColor="var(--maru-accent-pink)" onSelectSong={onSelectSong} />
                      ))}
                    </div>
                  </div>
                )}
                {similarTracks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--maru-accent-blue)" }}>
                  Similar to &quot;{song.title}&quot;
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {similarTracks.map((track) => (
                    <RelatedTrackButton key={`${track.artist}-${track.title}`} track={track} accentColor="var(--maru-accent-blue)" onSelectSong={onSelectSong} />
                  ))}
                </div>
              </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function RelatedTrackButton({
  track,
  accentColor,
  onSelectSong,
}: {
  track: { title: string; artist: string };
  accentColor: string;
  onSelectSong?: (title: string, artist: string) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Open ${track.title} by ${track.artist}`}
      onClick={() => onSelectSong?.(track.title, track.artist)}
      className="glass-card-subtle"
      style={{
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "inherit",
        font: "inherit",
        textAlign: "left",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#fafcff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</div>
        <div style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.5)", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.artist}</div>
      </div>
      <Play size={14} color={accentColor} style={{ flexShrink: 0 }} />
    </button>
  );
}
