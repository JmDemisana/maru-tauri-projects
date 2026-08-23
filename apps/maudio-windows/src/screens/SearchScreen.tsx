import React, { useState, useEffect } from "react";
import { Search, Mic, Music, UserCheck, Sparkles, ChevronRight, X, Disc, ExternalLink } from "lucide-react";
import { SongDetailState } from "../types";

export enum SearchScope {
  ARTISTS = "Artists & Albums",
  SONGS = "Songs",
  PROFILES = "Profiles",
}

interface SearchScreenProps {
  onSongClick: (song: SongDetailState) => void;
  onOpenProfile: (username: string) => void;
  onOpenArtist: (artist: string) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onSongClick,
  onOpenProfile,
  onOpenArtist,
}) => {
  const [selectedScope, setSelectedScope] = useState<SearchScope>(SearchScope.ARTISTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [artistResult, setArtistResult] = useState<any | null>(null);
  const [songResults, setSongResults] = useState<any[]>([]);
  const [profileResult, setProfileResult] = useState<any | null>(null);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setArtistResult(null);
      setSongResults([]);
      setProfileResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (selectedScope === SearchScope.ARTISTS) {
          // Search Last.fm / iTunes for artist info
          const [resLastfm, resItunes] = await Promise.all([
            fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(q)}&api_key=4a9f5581a9bc20a6e16ffc0e4487c096&format=json`),
            fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=musicArtist&limit=1`),
          ]);
          const dataLastfm = await resLastfm.json();
          const dataItunes = await resItunes.json();

          if (dataLastfm.artist) {
            setArtistResult({
              name: dataLastfm.artist.name,
              listeners: dataLastfm.artist.stats?.listeners,
              playcount: dataLastfm.artist.stats?.playcount,
              bio: dataLastfm.artist.bio?.summary?.replace(/<[^>]*>?/gm, "").substring(0, 200),
              tags: dataLastfm.artist.tags?.tag?.map((t: any) => t.name) || [],
              artworkUrl: dataItunes.results?.[0]?.artworkUrl100 || null,
            });
          }
        } else if (selectedScope === SearchScope.SONGS) {
          const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=10`);
          if (res.ok) {
            const data = await res.json();
            setSongResults(data.results || []);
          }
        } else if (selectedScope === SearchScope.PROFILES) {
          const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(q)}&api_key=4a9f5581a9bc20a6e16ffc0e4487c096&format=json`);
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              const avatar = data.user.image?.find((i: any) => i.size === "large")?.["#text"] || "";
              setProfileResult({
                username: data.user.name,
                playcount: parseInt(data.user.playcount || "0", 10),
                avatarUrl: avatar,
              });
            }
          }
        }
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedScope]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 24px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        maxWidth: "1100px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* 1. Scope Selector Pills (Matching Kotlin Row) */}
      <div style={{ display: "flex", gap: "8px" }}>
        {[SearchScope.ARTISTS, SearchScope.SONGS, SearchScope.PROFILES].map((scope) => {
          const isSelected = selectedScope === scope;
          return (
            <button
              key={scope}
              onClick={() => setSelectedScope(scope)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: "24px",
                background: isSelected ? "rgba(232, 93, 159, 0.25)" : "rgba(255, 255, 255, 0.1)",
                border: isSelected
                  ? "1.5px solid var(--maru-accent-pink)"
                  : "1px solid rgba(255, 255, 255, 0.094)",
                color: isSelected ? "var(--maru-accent-pink)" : "rgba(235, 235, 245, 0.72)",
                fontSize: "11px",
                fontWeight: isSelected ? 800 : 600,
                cursor: "pointer",
                transition: "all 120ms ease",
              }}
            >
              {scope}
            </button>
          );
        })}
      </div>

      {/* 2. Search Input Field (GlassCard with clear button) */}
      <div
        className="glass-card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 16px",
          border: "1px solid rgba(232, 93, 159, 0.5)",
          background: "rgba(24, 18, 43, 0.6)",
        }}
      >
        {selectedScope === SearchScope.ARTISTS && <Mic size={20} color="var(--maru-accent-pink)" />}
        {selectedScope === SearchScope.SONGS && <Music size={20} color="var(--maru-accent-pink)" />}
        {selectedScope === SearchScope.PROFILES && <UserCheck size={20} color="var(--maru-accent-pink)" />}

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            selectedScope === SearchScope.ARTISTS
              ? "Search artist or album (e.g. GUMI, Yoasobi)..."
              : selectedScope === SearchScope.SONGS
              ? "Search songs & tracks..."
              : "Enter Last.fm username..."
          }
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            color: "#f4f4f9fa",
            fontSize: "13.5px",
            outline: "none",
          }}
        />

        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(235, 235, 245, 0.6)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 3. Results Section */}
      {/* ARTISTS Scope */}
      {selectedScope === SearchScope.ARTISTS && artistResult && (
        <div
          className="glass-card"
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            border: "1px solid rgba(232, 93, 159, 0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1.5px solid var(--maru-accent-pink)",
                overflow: "hidden",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {artistResult.artworkUrl ? (
                <img src={artistResult.artworkUrl} alt={artistResult.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Mic size={32} color="var(--maru-accent-pink)" />
              )}
            </div>

            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#f4f4f9fa" }}>
                {artistResult.name}
              </div>
              <div style={{ fontSize: "11px", color: "var(--maru-accent-pink)", marginTop: "2px", fontWeight: 700 }}>
                {parseInt(artistResult.listeners || "0", 10).toLocaleString()} listeners • {parseInt(artistResult.playcount || "0", 10).toLocaleString()} plays
              </div>

              {artistResult.tags?.length > 0 && (
                <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
                  {artistResult.tags.slice(0, 3).map((tag: string, i: number) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "9px",
                        padding: "2px 6px",
                        borderRadius: "24px",
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.094)",
                        color: "rgba(235, 235, 245, 0.72)",
                      }}
                    >
                      {tag.toLowerCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {artistResult.bio && (
            <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)", lineHeight: "1.5" }}>
              {artistResult.bio}
            </div>
          )}

          <button
            onClick={() => onOpenArtist(artistResult.name)}
            style={{
              padding: "10px 0",
              borderRadius: "24px",
              background: "var(--maru-accent-pink)",
              border: "none",
              color: "#ffffff",
              fontSize: "11.5px",
              fontWeight: 800,
              letterSpacing: "0.6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Sparkles size={15} color="#ffffff" />
            <span>EXPLORE ARTIST FEATURE</span>
          </button>
        </div>
      )}

      {/* SONGS Scope */}
      {selectedScope === SearchScope.SONGS && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {songResults.map((item) => (
            <div
              key={item.trackId}
              onClick={() =>
                onSongClick({
                  title: item.trackName,
                  artist: item.artistName,
                  album: item.collectionName,
                  artworkUrl: item.artworkUrl100?.replace("100x100bb", "600x600bb"),
                  appleMusicUrl: item.trackViewUrl,
                })
              }
              className="glass-card"
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                cursor: "pointer",
              }}
            >
              <img
                src={item.artworkUrl100}
                alt={item.trackName}
                style={{ width: "46px", height: "46px", borderRadius: "8px", objectFit: "cover" }}
              />
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#f4f4f9fa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.trackName}
                </div>
                <div style={{ fontSize: "11.5px", color: "rgba(235, 235, 245, 0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
                  {item.artistName} {item.collectionName ? `• ${item.collectionName}` : ""}
                </div>
              </div>
              <ChevronRight size={18} color="var(--maru-accent-pink)" />
            </div>
          ))}
        </div>
      )}

      {/* PROFILES Scope */}
      {selectedScope === SearchScope.PROFILES && profileResult && (
        <div
          onClick={() => onOpenProfile(profileResult.username)}
          className="glass-card"
          style={{
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            cursor: "pointer",
            border: "1px solid rgba(232, 93, 159, 0.5)",
          }}
        >
          <img
            src={profileResult.avatarUrl || "https://lastfm.freetls.fastly.net/i/u/avatar170s/818148bf682d429dc215c1705eb27b98.png"}
            alt={profileResult.username}
            style={{ width: "48px", height: "48px", borderRadius: "50%", border: "1.5px solid var(--maru-accent-pink)", objectFit: "cover" }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14.5px", fontWeight: 800, color: "#f4f4f9fa" }}>
              {profileResult.username}
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--maru-accent-pink)", fontWeight: 700 }}>
              {profileResult.playcount.toLocaleString()} scrobbles
            </div>
          </div>
          <ChevronRight size={18} color="var(--maru-accent-pink)" />
        </div>
      )}
    </div>
  );
};
