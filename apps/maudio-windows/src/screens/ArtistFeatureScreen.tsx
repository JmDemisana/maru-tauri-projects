import React, { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, Disc, Music, Play, ChevronRight, ExternalLink } from "lucide-react";
import { SongDetailState } from "../types";

interface ArtistFeatureScreenProps {
  artistName: string;
  onBack: () => void;
  onSelectSong: (song: SongDetailState) => void;
  onSelectArtist: (artist: string) => void;
}

export const ArtistFeatureScreen: React.FC<ArtistFeatureScreenProps> = ({
  artistName,
  onBack,
  onSelectSong,
  onSelectArtist,
}) => {
  const [artistInfo, setArtistInfo] = useState<any | null>(null);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [similarArtists, setSimilarArtists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=4a9f5581a9bc20a6e16ffc0e4487c096&format=json`),
      fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(artistName)}&api_key=4a9f5581a9bc20a6e16ffc0e4487c096&format=json&limit=8`),
      fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist=${encodeURIComponent(artistName)}&api_key=4a9f5581a9bc20a6e16ffc0e4487c096&format=json&limit=4`),
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=1`),
    ])
      .then(async ([resInfo, resTracks, resAlbums, resItunes]) => {
        const dInfo = await resInfo.json();
        const dTracks = await resTracks.json();
        const dAlbums = await resAlbums.json();
        const dItunes = await resItunes.json();

        setArtistInfo({
          ...dInfo.artist,
          artworkUrl: dItunes.results?.[0]?.artworkUrl100 || null,
        });
        setTopTracks(dTracks.toptracks?.track || []);
        setTopAlbums(dAlbums.topalbums?.album || []);
        setSimilarArtists(dInfo.artist?.similar?.artist || []);
        setIsLoading(false);
      })
      .catch(console.error);
  }, [artistName]);

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
      {/* Back Button & Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f4f4f9fa",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontSize: "16px", fontWeight: 800, color: "#f4f4f9fa" }}>
          Artist Feature
        </span>
      </div>

      {/* Hero Banner */}
      <div
        className="glass-card"
        style={{
          padding: "24px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          background: "linear-gradient(135deg, rgba(232, 93, 159, 0.15) 0%, rgba(96, 226, 255, 0.1) 100%)",
          border: "1.5px solid rgba(232, 93, 159, 0.4)",
        }}
      >
        <div
          style={{
            width: "84px",
            height: "84px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.1)",
            border: "2px solid var(--maru-accent-pink)",
            overflow: "hidden",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {artistInfo?.artworkUrl ? (
            <img src={artistInfo.artworkUrl} alt={artistName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Sparkles size={36} color="var(--maru-accent-pink)" />
          )}
        </div>

        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#f4f4f9fa" }}>
            {artistName}
          </div>
          {artistInfo?.stats && (
            <div style={{ fontSize: "12px", color: "var(--maru-accent-pink)", fontWeight: 700, marginTop: "2px" }}>
              {parseInt(artistInfo.stats.listeners, 10).toLocaleString()} listeners • {parseInt(artistInfo.stats.playcount, 10).toLocaleString()} scrobbles
            </div>
          )}
          {artistInfo?.bio?.summary && (
            <div style={{ fontSize: "11.5px", color: "rgba(235, 235, 245, 0.72)", marginTop: "6px", lineHeight: 1.4 }}>
              {artistInfo.bio.summary.replace(/<[^>]*>?/gm, "").substring(0, 160)}...
            </div>
          )}
        </div>
      </div>

      {/* Top Tracks List */}
      <div className="glass-card" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--maru-accent-pink)" }}>
          TOP TRACKS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {topTracks.map((track, idx) => (
            <div
              key={idx}
              onClick={() =>
                onSelectSong({
                  title: track.name,
                  artist: artistName,
                })
              }
              className="glass-card-subtle"
              style={{
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--maru-accent-pink)", width: "20px" }}>
                  #{idx + 1}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#f4f4f9fa" }}>
                  {track.name}
                </span>
              </div>
              <Play size={14} color="var(--maru-accent-pink)" />
            </div>
          ))}
        </div>
      </div>

      {/* Similar Artists */}
      {similarArtists.length > 0 && (
        <div className="glass-card" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--maru-accent-blue)" }}>
            SIMILAR ARTISTS
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {similarArtists.slice(0, 6).map((art, idx) => (
              <button
                key={idx}
                onClick={() => onSelectArtist(art.name)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "24px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#f4f4f9fa",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {art.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
