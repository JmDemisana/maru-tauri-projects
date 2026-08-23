import React, { useState, useEffect } from "react";
import { LastfmProfile, LastfmTrack, TimePeriod } from "../types";
import { fetchLastfmProfile, fetchRecentTracks, fetchTopArtists } from "../utils/lastfmApi";
import { RefreshCw, Music2, Sparkles, TrendingUp, Search, ExternalLink, Play, Disc3 } from "lucide-react";

interface DiscoveryScreenProps {
  username: string;
  onOpenProfile?: () => void;
}

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({ username, onOpenProfile }) => {
  const [profile, setProfile] = useState<LastfmProfile | null>(null);
  const [recentTracks, setRecentTracks] = useState<LastfmTrack[]>([]);
  const [topArtists, setTopArtists] = useState<{ name: string; playcount: number; image: string }[]>([]);
  const [period, setPeriod] = useState<TimePeriod>("7D");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prof, tracks, artists] = await Promise.all([
        fetchLastfmProfile(username),
        fetchRecentTracks(username, 30),
        fetchTopArtists(username, period),
      ]);
      setProfile(prof);
      setRecentTracks(tracks);
      setTopArtists(artists);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [username, period]);

  // Instant iTunes Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(
            searchQuery,
          )}&entity=song&limit=6`,
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const nowPlayingTrack = recentTracks.find((t) => t.nowPlaying) || recentTracks[0];

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 32px 40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Top Search Bar & Refresh Bar */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div
          className="glass-card"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 18px",
            borderRadius: "14px",
            background: "rgba(22, 27, 46, 0.7)",
          }}
        >
          <Search size={18} color="rgba(255, 255, 255, 0.4)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search iTunes & Last.fm library (artists, songs, albums)..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#fafcff",
              fontSize: "13.5px",
              outline: "none",
            }}
          />
          {isSearching && <RefreshCw size={14} className="animate-spin" color="var(--maru-accent-pink)" />}
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "14px",
            padding: "0 18px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#fafcff",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Results Dropdown Grid if Searching */}
      {searchResults.length > 0 && (
        <div
          className="glass-card"
          style={{
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            border: "1.5px solid rgba(255, 113, 162, 0.3)",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--maru-accent-pink)" }}>
            iTunes Search Results
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
            {searchResults.map((item) => (
              <a
                key={item.trackId}
                href={item.trackViewUrl}
                target="_blank"
                rel="noreferrer"
                className="glass-card-subtle"
                style={{
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <img
                  src={item.artworkUrl100}
                  alt={item.trackName}
                  style={{ width: "42px", height: "42px", borderRadius: "8px", objectFit: "cover" }}
                />
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.trackName}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.artistName}
                  </div>
                </div>
                <ExternalLink size={14} color="rgba(255,255,255,0.4)" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Hero Now Playing / Spotlight Card */}
      {nowPlayingTrack && (
        <div
          className="glass-card"
          style={{
            padding: "24px 28px",
            display: "flex",
            alignItems: "center",
            gap: "28px",
            position: "relative",
            background: "linear-gradient(135deg, rgba(255, 113, 162, 0.16) 0%, rgba(112, 165, 255, 0.1) 100%)",
            border: "1.5px solid rgba(255, 113, 162, 0.3)",
          }}
        >
          {/* Cover Art with Aura Glow */}
          <div
            style={{
              position: "relative",
              width: "110px",
              height: "110px",
              borderRadius: "18px",
              overflow: "hidden",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.6)",
              flexShrink: 0,
              background: "#161b2e",
            }}
          >
            <img
              src={nowPlayingTrack.image || "https://lastfm.freetls.fastly.net/i/u/300x300/4128a6eb29f94943c9d206c08e625904.png"}
              alt={nowPlayingTrack.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {nowPlayingTrack.nowPlaying && (
              <div
                style={{
                  position: "absolute",
                  bottom: "6px",
                  right: "6px",
                  padding: "3px 8px",
                  borderRadius: "999px",
                  background: "rgba(255, 113, 162, 0.9)",
                  fontSize: "9.5px",
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: "0.5px",
                }}
              >
                PLAYING NOW
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "var(--maru-accent-pink)",
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                }}
              >
                {nowPlayingTrack.nowPlaying ? "Scrobbling Track" : "Latest Scrobble"}
              </span>
            </div>

            <div
              style={{
                fontSize: "22px",
                fontWeight: 900,
                color: "#fafcff",
                marginTop: "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {nowPlayingTrack.name}
            </div>

            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "var(--maru-accent-blue)",
                marginTop: "2px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {nowPlayingTrack.artist}
            </div>

            {nowPlayingTrack.album && (
              <div style={{ fontSize: "12.5px", color: "rgba(255, 255, 255, 0.5)", marginTop: "3px" }}>
                {nowPlayingTrack.album}
              </div>
            )}
          </div>

          {/* Profile stats preview chip */}
          {profile && (
            <div
              onClick={onOpenProfile}
              className="glass-card-subtle"
              style={{
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  padding: "2px",
                  background: "linear-gradient(135deg, #ff71a2, #70a5ff)",
                }}
              >
                <img
                  src={profile.avatarUrl}
                  alt="Avatar"
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 800 }}>{profile.username}</div>
                <div style={{ fontSize: "11px", color: "var(--maru-accent-pink)", fontWeight: 700 }}>
                  {profile.totalScrobbles.toLocaleString()} scrobbles
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Two-Column Layout for Wide Screens */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "24px" }}>
        {/* Left Column: Top Artists & Period Chips */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14.5px", fontWeight: 800 }}>
                <TrendingUp size={16} color="var(--maru-accent-blue)" />
                <span>Top Artists</span>
              </div>

              {/* Period Chips */}
              <div style={{ display: "flex", gap: "3px", background: "rgba(255,255,255,0.05)", padding: "2px", borderRadius: "999px" }}>
                {(["7D", "1M", "3M", "1Y", "ALL"] as TimePeriod[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    style={{
                      background: period === p ? "var(--maru-accent-pink)" : "transparent",
                      color: period === p ? "#070a13" : "rgba(255,255,255,0.6)",
                      fontWeight: period === p ? 800 : 600,
                      fontSize: "10.5px",
                      border: "none",
                      borderRadius: "999px",
                      padding: "4px 8px",
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Top Artists List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {topArtists.map((artist, idx) => (
                <div
                  key={artist.name}
                  className="glass-card-subtle"
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "var(--maru-accent-pink)", width: "18px" }}>
                    #{idx + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#fafcff" }}>{artist.name}</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{artist.playcount} plays</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Scrobbles Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14.5px", fontWeight: 800 }}>
            <Music2 size={16} color="var(--maru-accent-pink)" />
            <span>Recent Scrobbles Stream</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recentTracks.map((track, i) => (
              <div
                key={i}
                className="glass-card-subtle"
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  borderLeft: track.nowPlaying
                    ? "3px solid var(--maru-accent-pink)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "#161b2e",
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  <img
                    src={track.image || "https://lastfm.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.png"}
                    alt={track.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://lastfm.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.png";
                    }}
                  />
                  {track.nowPlaying && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(255, 113, 162, 0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Sparkles size={16} color="#ffffff" />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 700,
                      color: track.nowPlaying ? "var(--maru-accent-pink)" : "#fafcff",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {track.name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "rgba(255, 255, 255, 0.55)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: "2px",
                    }}
                  >
                    {track.artist}
                  </div>
                </div>

                <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", textAlign: "right", flexShrink: 0 }}>
                  {track.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
