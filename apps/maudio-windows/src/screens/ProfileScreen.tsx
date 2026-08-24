import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LastfmProfile, TimePeriod, LastfmTrack, SongDetailState } from "../types";
import { fetchLastfmProfile, fetchRecentTracks, LASTFM_API_KEY } from "../utils/lastfmApi";
import { User, History, Users, Disc, ArrowLeft, RefreshCw, BarChart2, Sparkles, LogIn } from "lucide-react";

interface ProfileScreenProps {
  username: string;
  onBack?: () => void;
  onSongClick?: (song: SongDetailState) => void;
  onNavigateScrobbler?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ username, onBack, onSongClick, onNavigateScrobbler }) => {
  const [profile, setProfile] = useState<LastfmProfile | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("7day");
  const [recentTracks, setRecentTracks] = useState<LastfmTrack[]>([]);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const periods = [
    { key: "7day", label: "7D" },
    { key: "1month", label: "1M" },
    { key: "3month", label: "3M" },
    { key: "12month", label: "1Y" },
    { key: "overall", label: "ALL" },
  ];

  const effectiveUsername = username.trim() || localStorage.getItem("maudio_username")?.trim() || "";

  const loadData = async () => {
    const u = effectiveUsername;
    if (!u) {
      setProfile(null);
      setRecentTracks([]);
      setTopTracks([]);
      setTopArtists([]);
      return;
    }

    setIsLoading(true);

    try {
      const [prof, recents, resTTracks, resTArtists] = await Promise.all([
        fetchLastfmProfile(u),
        fetchRecentTracks(u, 14),
        fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${encodeURIComponent(u)}&api_key=${LASTFM_API_KEY}&format=json&limit=10&period=${selectedPeriod}`),
        fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${encodeURIComponent(u)}&api_key=${LASTFM_API_KEY}&format=json&limit=8&period=${selectedPeriod}`),
      ]);

      setProfile(prof);
      setRecentTracks(recents);

      const dTT = await resTTracks.json();
      const dTA = await resTArtists.json();

      setTopTracks(dTT.toptracks?.track || []);
      setTopArtists(dTA.topartists?.artist || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [username, effectiveUsername, selectedPeriod]);

  if (!effectiveUsername) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
        }}
      >
        <div
          className="glass-card"
          style={{
            maxWidth: "460px",
            padding: "36px 32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            border: "1px solid rgba(232, 93, 159, 0.4)",
          }}
        >
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              background: "rgba(232, 93, 159, 0.15)",
              border: "2px solid var(--maru-accent-pink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <User size={32} color="var(--maru-accent-pink)" />
          </div>

          <div style={{ fontSize: "18px", fontWeight: 800, color: "#f4f4f9fa" }}>
            No Profile Connected
          </div>

          <div style={{ fontSize: "12.5px", color: "rgba(235, 235, 245, 0.72)", lineHeight: "1.6" }}>
            Connect your Last.fm account to view your scrobble statistics, recent listening history, and ranked charts!
          </div>

          {onNavigateScrobbler && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onNavigateScrobbler}
              style={{
                marginTop: "6px",
                padding: "12px 24px",
                borderRadius: "12px",
                background: "var(--maru-accent-pink)",
                border: "none",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "12.5px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <LogIn size={16} />
              <span>CONNECT LAST.FM ACCOUNT</span>
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px 28px 36px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        width: "100%",
      }}
    >
      {/* 2-Column Desktop Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN: Profile Header + Recent Scrobbles */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card"
            style={{
              padding: "24px",
              display: "flex",
              alignItems: "center",
              gap: "20px",
              border: "1px solid rgba(232, 93, 159, 0.4)",
            }}
          >
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.1)",
                border: "2.5px solid var(--maru-accent-pink)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(232, 93, 159, 0.3)",
                flexShrink: 0,
              }}
            >
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={36} color="var(--maru-accent-pink)" />
              )}
            </div>

            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#f4f4f9fa" }}>
                {profile?.username || effectiveUsername}
              </div>

              {profile?.realName && (
                <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)", marginTop: "2px" }}>
                  {profile.realName}
                </div>
              )}

              <div
                style={{
                  marginTop: "8px",
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: "24px",
                  background: "rgba(232, 93, 159, 0.18)",
                  border: "1px solid rgba(232, 93, 159, 0.5)",
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "var(--maru-accent-pink)",
                }}
              >
                {(profile?.totalScrobbles || 0).toLocaleString()} total scrobbles
              </div>
            </div>
          </motion.div>

          {/* Recent Scrobbles */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px" }}>
            <History size={15} color="var(--maru-accent-pink)" />
            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
              RECENT SCROBBLES ({recentTracks.length})
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recentTracks.map((track, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.008, x: 2 }}
                whileTap={{ scale: 0.99 }}
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
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                  border: track.nowPlaying ? "1px solid rgba(232, 93, 159, 0.6)" : "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <img
                  src={track.image || "https://lastfm.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.png"}
                  alt={track.name}
                  style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover" }}
                />
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#f4f4f9fa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {track.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(235, 235, 245, 0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "1px" }}>
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
                  <span style={{ fontSize: "10px", color: "rgba(235, 235, 245, 0.45)" }}>
                    {track.date}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Period Tabs + Top Tracks & Artists */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Period Selector Tabs */}
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
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                </motion.button>
              );
            })}
          </div>

          {/* TOP TRACKS */}
          {topTracks.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px" }}>
                <BarChart2 size={15} color="var(--maru-accent-pink)" />
                <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-pink)", letterSpacing: "0.8px" }}>
                  TOP TRACKS ({selectedPeriod.toUpperCase()})
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {topTracks.map((item, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.008, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() =>
                      onSongClick?.({
                        title: item.name,
                        artist: item.artist?.name || "",
                      })
                    }
                    className="glass-card"
                    style={{
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "rgba(232, 93, 159, 0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10.5px",
                          fontWeight: 800,
                          color: "var(--maru-accent-pink)",
                          flexShrink: 0,
                        }}
                      >
                        #{idx + 1}
                      </div>
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#f4f4f9fa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(235, 235, 245, 0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.artist?.name}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--maru-accent-pink)", flexShrink: 0 }}>
                      {parseInt(item.playcount || "0", 10).toLocaleString()} plays
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {/* TOP ARTISTS */}
          {topArtists.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "4px", marginTop: "4px" }}>
                <Users size={15} color="var(--maru-accent-blue)" />
                <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--maru-accent-blue)", letterSpacing: "0.8px" }}>
                  TOP ARTISTS ({selectedPeriod.toUpperCase()})
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "8px" }}>
                {topArtists.map((item, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    className="glass-card"
                    style={{
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "rgba(96, 226, 255, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10.5px",
                        fontWeight: 800,
                        color: "var(--maru-accent-blue)",
                        flexShrink: 0,
                      }}
                    >
                      #{idx + 1}
                    </div>
                    <div style={{ overflow: "hidden", flex: 1 }}>
                      <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#f4f4f9fa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--maru-accent-blue)", fontWeight: 700 }}>
                        {parseInt(item.playcount || "0", 10).toLocaleString()} plays
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};
