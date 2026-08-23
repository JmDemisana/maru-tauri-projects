import React, { useState, useEffect } from "react";
import { LastfmProfile, LastfmTrack, TimePeriod } from "../types";
import { fetchLastfmProfile, fetchRecentTracks, fetchTopArtists } from "../utils/lastfmApi";
import { RefreshCw, Music2, Sparkles, TrendingUp } from "lucide-react";

interface DiscoveryScreenProps {
  username: string;
}

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({ username }) => {
  const [profile, setProfile] = useState<LastfmProfile | null>(null);
  const [recentTracks, setRecentTracks] = useState<LastfmTrack[]>([]);
  const [topArtists, setTopArtists] = useState<{ name: string; playcount: number; image: string }[]>([]);
  const [period, setPeriod] = useState<TimePeriod>("7D");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prof, tracks, artists] = await Promise.all([
        fetchLastfmProfile(username),
        fetchRecentTracks(username, 25),
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

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 14px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Profile Overview Card */}
      <div
        className="glass-card"
        style={{
          padding: "18px 16px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          position: "relative",
          background: "linear-gradient(135deg, rgba(255, 113, 162, 0.12) 0%, rgba(112, 165, 255, 0.08) 100%)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            padding: "2.5px",
            background: "linear-gradient(135deg, #ff71a2, #70a5ff)",
            boxShadow: "0 0 20px rgba(255, 113, 162, 0.45)",
          }}
        >
          <img
            src={profile?.avatarUrl || "https://lastfm.freetls.fastly.net/i/u/avatar170s/818148bf682d429dc215c1705eb27b98.png"}
            alt="Avatar"
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover",
              background: "#12172a",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://lastfm.freetls.fastly.net/i/u/avatar170s/818148bf682d429dc215c1705eb27b98.png";
            }}
          />
        </div>

        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#fafcff" }}>
            {profile?.username || username}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <div>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--maru-accent-pink)" }}>
                {profile ? profile.totalScrobbles.toLocaleString() : "..."}
              </span>
              <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", marginLeft: "4px" }}>
                scrobbles
              </span>
            </div>
            {profile?.artistCount && (
              <div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--maru-accent-blue)" }}>
                  {profile.artistCount.toLocaleString()}
                </span>
                <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", marginLeft: "4px" }}>
                  artists
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
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
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Top Artists & Filter Range */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700 }}>
            <TrendingUp size={15} color="var(--maru-accent-blue)" />
            <span>Top Artists</span>
          </div>

          {/* Period Filter Chips */}
          <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.05)", padding: "2px", borderRadius: "999px" }}>
            {(["7D", "1M", "3M", "1Y", "ALL"] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  background: period === p ? "var(--maru-accent-pink)" : "transparent",
                  color: period === p ? "#070a13" : "rgba(255,255,255,0.6)",
                  fontWeight: period === p ? 800 : 500,
                  fontSize: "10.5px",
                  border: "none",
                  borderRadius: "999px",
                  padding: "3px 8px",
                  cursor: "pointer",
                  transition: "all 120ms ease",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Top Artists Row */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "4px",
          }}
        >
          {topArtists.map((artist, idx) => (
            <div
              key={artist.name}
              className="glass-card-subtle"
              style={{
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--maru-accent-pink)" }}>
                #{idx + 1}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#fafcff" }}>
                {artist.name}
              </span>
              <span style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.4)" }}>
                {artist.playcount}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Scrobbles Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, marginBottom: "2px" }}>
          <Music2 size={15} color="var(--maru-accent-pink)" />
          <span>Recent Scrobbles</span>
        </div>

        {recentTracks.map((track, i) => (
          <div
            key={i}
            className="glass-card-subtle"
            style={{
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              borderLeft: track.nowPlaying ? "3px solid var(--maru-accent-pink)" : "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "8px",
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
                    background: "rgba(255, 113, 162, 0.3)",
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
                  fontSize: "13px",
                  fontWeight: 600,
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
                  fontSize: "11.5px",
                  color: "rgba(255, 255, 255, 0.55)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginTop: "1px",
                }}
              >
                {track.artist}
              </div>
            </div>

            <div style={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.38)", textAlign: "right", flexShrink: 0 }}>
              {track.date}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
