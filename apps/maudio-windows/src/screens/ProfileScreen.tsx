import React, { useState, useEffect } from "react";
import { LastfmProfile, TimePeriod } from "../types";
import { fetchLastfmProfile, fetchTopArtists } from "../utils/lastfmApi";
import { User, Sparkles, TrendingUp, Music, Disc, Calendar, ArrowLeft } from "lucide-react";

interface ProfileScreenProps {
  username: string;
  onBack?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ username, onBack }) => {
  const [profile, setProfile] = useState<LastfmProfile | null>(null);
  const [period, setPeriod] = useState<TimePeriod>("7D");
  const [topArtists, setTopArtists] = useState<{ name: string; playcount: number; image: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchLastfmProfile(username),
      fetchTopArtists(username, period),
    ]).then(([p, a]) => {
      setProfile(p);
      setTopArtists(a);
      setIsLoading(false);
    });
  }, [username, period]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 32px 40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Top Bar with optional Back */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "10px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fafcff",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#fafcff", letterSpacing: "0.4px" }}>
          Listener Profile
        </h2>
      </div>

      {/* Hero Profile Banner Card */}
      <div
        className="glass-card"
        style={{
          padding: "28px 32px",
          display: "flex",
          alignItems: "center",
          gap: "28px",
          position: "relative",
          background: "linear-gradient(135deg, rgba(255, 113, 162, 0.15) 0%, rgba(112, 165, 255, 0.1) 100%)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            padding: "3px",
            background: "linear-gradient(135deg, #ff71a2, #70a5ff)",
            boxShadow: "0 0 28px rgba(255, 113, 162, 0.5)",
            flexShrink: 0,
          }}
        >
          <img
            src={profile?.avatarUrl || "https://lastfm.freetls.fastly.net/i/u/avatar170s/818148bf682d429dc215c1705eb27b98.png"}
            alt="Avatar"
            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://lastfm.freetls.fastly.net/i/u/avatar170s/818148bf682d429dc215c1705eb27b98.png";
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "0px",
              right: "0px",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "#4ade80",
              border: "3px solid #070a13",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={11} color="#070a13" />
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#fafcff" }}>
            {profile?.username || username}
          </div>
          <div style={{ fontSize: "14px", color: "var(--maru-accent-pink)", fontWeight: 700, marginTop: "4px" }}>
            Last.fm Member
          </div>

          <div style={{ display: "flex", gap: "24px", marginTop: "16px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--maru-accent-pink)" }}>
                {profile ? profile.totalScrobbles.toLocaleString() : "..."}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                Total Scrobbles
              </div>
            </div>

            {profile?.artistCount && (
              <div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--maru-accent-blue)" }}>
                  {profile.artistCount.toLocaleString()}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                  Unique Artists
                </div>
              </div>
            )}

            {profile?.trackCount && (
              <div>
                <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--maru-accent-purple)" }}>
                  {profile.trackCount.toLocaleString()}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                  Tracks Played
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Listening Period Trends */}
      <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", fontWeight: 800 }}>
            <TrendingUp size={18} color="var(--maru-accent-blue)" />
            <span>Top Artists in Selected Period</span>
          </div>

          <div style={{ display: "flex", gap: "6px", background: "rgba(255,255,255,0.06)", padding: "3px", borderRadius: "999px" }}>
            {(["7D", "1M", "3M", "1Y", "ALL"] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  background: period === p ? "var(--maru-accent-pink)" : "transparent",
                  color: period === p ? "#070a13" : "rgba(255,255,255,0.65)",
                  fontWeight: period === p ? 800 : 600,
                  fontSize: "12px",
                  border: "none",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  cursor: "pointer",
                  transition: "all 140ms ease",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Top Artists List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {topArtists.map((artist, idx) => {
            const maxPlays = topArtists[0]?.playcount || 1;
            const pct = Math.max(10, (artist.playcount / maxPlays) * 100);
            return (
              <div
                key={artist.name}
                className="glass-card-subtle"
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Progress bar background fill */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: `${pct}%`,
                    background: "rgba(112, 165, 255, 0.08)",
                    zIndex: 0,
                  }}
                />

                <span style={{ fontSize: "14px", fontWeight: 900, color: "var(--maru-accent-pink)", width: "24px", zIndex: 1 }}>
                  #{idx + 1}
                </span>

                <div style={{ flex: 1, zIndex: 1 }}>
                  <div style={{ fontSize: "14.5px", fontWeight: 700, color: "#fafcff" }}>
                    {artist.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>
                    {artist.playcount} scrobbles
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
