import React, { useState, useEffect } from "react";
import { LastfmProfile, TimePeriod, LastfmTrack, SongDetailState } from "../types";
import { fetchLastfmProfile, fetchRecentTracks, LASTFM_API_KEY } from "../utils/lastfmApi";
import { User, History, Users, Disc, ArrowLeft, RefreshCw, BarChart2 } from "lucide-react";

interface ProfileScreenProps {
  username: string;
  onBack?: () => void;
  onSongClick?: (song: SongDetailState) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ username, onBack, onSongClick }) => {
  const [profile, setProfile] = useState<LastfmProfile | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("7day");
  const [recentTracks, setRecentTracks] = useState<LastfmTrack[]>([]);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const periods = [
    { key: "7day", label: "7D" },
    { key: "1month", label: "1M" },
    { key: "3month", label: "3M" },
    { key: "12month", label: "1Y" },
    { key: "overall", label: "ALL" },
  ];

  const loadData = async () => {
    setIsLoading(true);
    const u = username.trim() || "JmDemisana";

    try {
      const [prof, recents, resTTracks, resTArtists, resTAlbums] = await Promise.all([
        fetchLastfmProfile(u),
        fetchRecentTracks(u, 12),
        fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${encodeURIComponent(u)}&api_key=${LASTFM_API_KEY}&format=json&limit=8&period=${selectedPeriod}`),
        fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${encodeURIComponent(u)}&api_key=${LASTFM_API_KEY}&format=json&limit=6&period=${selectedPeriod}`),
        fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${encodeURIComponent(u)}&api_key=${LASTFM_API_KEY}&format=json&limit=4&period=${selectedPeriod}`),
      ]);

      setProfile(prof);
      setRecentTracks(recents);

      const dTT = await resTTracks.json();
      const dTA = await resTArtists.json();
      const dTab = await resTAlbums.json();

      setTopTracks(dTT.toptracks?.track || []);
      setTopArtists(dTA.topartists?.artist || []);
      setTopAlbums(dTab.topalbums?.album || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [username, selectedPeriod]);

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
      {/* 1. Profile Header Card */}
      <div
        className="glass-card"
        style={{
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          border: "1px solid rgba(232, 93, 159, 0.4)",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.1)",
            border: "2.5px solid var(--maru-accent-pink)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(232, 93, 159, 0.3)",
          }}
        >
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <User size={40} color="var(--maru-accent-pink)" />
          )}
        </div>

        <div style={{ fontSize: "20px", fontWeight: 800, color: "#f4f4f9fa", marginTop: "12px" }}>
          {profile?.username || username}
        </div>

        {profile?.realName && (
          <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)", marginTop: "2px" }}>
            {profile.realName}
          </div>
        )}

        <div
          style={{
            marginTop: "10px",
            padding: "4px 14px",
            borderRadius: "24px",
            background: "rgba(232, 93, 159, 0.18)",
            border: "1px solid rgba(232, 93, 159, 0.5)",
            fontSize: "11.5px",
            fontWeight: 800,
            color: "var(--maru-accent-pink)",
          }}
        >
          {(profile?.totalScrobbles || 0).toLocaleString()} total scrobbles
        </div>
      </div>

      {/* 2. Period Selector Tabs */}
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
        {periods.map(({ key, label }) => {
          const isSelected = selectedPeriod === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedPeriod(key)}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: "24px",
                background: isSelected ? "rgba(232, 93, 159, 0.25)" : "transparent",
                border: isSelected ? "1px solid var(--maru-accent-pink)" : "1px solid transparent",
                color: isSelected ? "var(--maru-accent-pink)" : "rgba(235, 235, 245, 0.72)",
                fontSize: "11px",
                fontWeight: isSelected ? 800 : 500,
                cursor: "pointer",
                transition: "all 120ms ease",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 3. RECENT SCROBBLES */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px" }}>
        <History size={15} color="var(--maru-accent-pink)" />
        <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
          RECENT SCROBBLES ({recentTracks.length})
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {recentTracks.map((track, idx) => (
          <div
            key={idx}
            onClick={() =>
              onSongClick?.({
                title: track.name,
                artist: track.artist,
                album: track.album,
                artworkUrl: track.image,
              })
            }
            className="glass-card"
            style={{
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              cursor: "pointer",
              border: track.nowPlaying ? "1px solid rgba(232, 93, 159, 0.6)" : "1px solid rgba(255, 255, 255, 0.094)",
            }}
          >
            <img
              src={track.image || "https://lastfm.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.png"}
              alt={track.name}
              style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover" }}
            />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#f4f4f9fa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {track.name}
              </div>
              <div style={{ fontSize: "11.5px", color: "rgba(235, 235, 245, 0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
                {track.artist} {track.album ? `• ${track.album}` : ""}
              </div>
            </div>

            {track.nowPlaying ? (
              <div
                style={{
                  padding: "3px 8px",
                  borderRadius: "24px",
                  background: "rgba(232, 93, 159, 0.2)",
                  border: "1px solid rgba(232, 93, 159, 0.5)",
                  color: "var(--maru-accent-pink)",
                  fontSize: "9px",
                  fontWeight: 800,
                }}
              >
                NOW
              </div>
            ) : (
              <span style={{ fontSize: "10px", color: "rgba(235, 235, 245, 0.5)" }}>
                {track.date}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 4. TOP TRACKS */}
      {topTracks.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px", marginTop: "8px" }}>
            <BarChart2 size={15} color="var(--maru-accent-pink)" />
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
              TOP TRACKS ({selectedPeriod.toUpperCase()})
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {topTracks.map((item, idx) => (
              <div
                key={idx}
                onClick={() =>
                  onSongClick?.({
                    title: item.name,
                    artist: item.artist?.name || "",
                  })
                }
                className="glass-card"
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "rgba(232, 93, 159, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "var(--maru-accent-pink)",
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#f4f4f9fa" }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "rgba(235, 235, 245, 0.72)" }}>
                      {item.artist?.name}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--maru-accent-pink)" }}>
                  {parseInt(item.playcount || "0", 10).toLocaleString()} plays
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 5. TOP ARTISTS */}
      {topArtists.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px", marginTop: "8px" }}>
            <Users size={15} color="var(--maru-accent-blue)" />
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-blue)", letterSpacing: "0.8px" }}>
              TOP ARTISTS ({selectedPeriod.toUpperCase()})
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {topArtists.map((item, idx) => (
              <div
                key={idx}
                className="glass-card"
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "rgba(96, 226, 255, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "var(--maru-accent-blue)",
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#f4f4f9fa" }}>
                    {item.name}
                  </div>
                </div>

                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--maru-accent-blue)" }}>
                  {parseInt(item.playcount || "0", 10).toLocaleString()} plays
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
