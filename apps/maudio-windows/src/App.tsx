import { useState, useEffect } from "react";
import { TitleBar } from "@maru/ui";
import { NavigationScreen, LastfmProfile, MediaState, SongDetailState, RecommendedTrackItem } from "./types";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { NotificationMirrorBottomBar } from "./components/NotificationMirrorBottomBar";
import { SongDetailModal } from "./components/SongDetailModal";
import { DiscoveryScreen } from "./screens/DiscoveryScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { KaraokeScreen } from "./screens/KaraokeScreen";
import { NamiRecScreen } from "./screens/NamiRecScreen";
import { ArtistFeatureScreen } from "./screens/ArtistFeatureScreen";
import { LocalScreen } from "./screens/LocalScreen";
import { ScrobblingScreen } from "./screens/ScrobblingScreen";
import { MarucastScreen } from "./screens/MarucastScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { fetchLastfmProfile, fetchSessionFromToken } from "./utils/lastfmApi";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Heart, Cast, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function App() {
  const [selectedScreen, setSelectedScreen] = useState<NavigationScreen>(NavigationScreen.DISCOVERY);
  const [previousScreen, setPreviousScreen] = useState<NavigationScreen>(NavigationScreen.DISCOVERY);
  const [selectedArtistDetail, setSelectedArtistDetail] = useState<string>("GUMI");

  const [username, setUsername] = useState(() => {
    const sk = localStorage.getItem("maudio_session_key");
    if (!sk) return "";
    return localStorage.getItem("maudio_username") || "";
  });
  const [profile, setProfile] = useState<LastfmProfile | null>(null);
  const [selectedSongDetail, setSelectedSongDetail] = useState<SongDetailState | null>(null);

  const [mediaState, setMediaState] = useState<MediaState>({
    title: null,
    artist: null,
    album: null,
    app_name: null,
    is_playing: false,
    position_ms: null,
    duration_ms: null,
    artwork_base64: null,
  });

  const pollMedia = async () => {
    try {
      const state = await invoke<MediaState>("get_media_state");
      if (state) {
        setMediaState(state);
      }
    } catch (e) {
      // background poll silently
    }
  };

  useEffect(() => {
    pollMedia();
    const timer = setInterval(pollMedia, 1500);
    return () => clearInterval(timer);
  }, []);

  // Listen for Last.fm token emitted from local auth loopback server (zero-click handoff)
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    listen<string>("lastfm-auth-token", async (event) => {
      const token = event.payload;
      if (token) {
        try {
          const session = await fetchSessionFromToken(token);
          localStorage.setItem("maudio_session_key", session.key);
          localStorage.setItem("maudio_username", session.name);
          setUsername(session.name);
          setSelectedScreen(NavigationScreen.PROFILE);
        } catch (err) {
          console.error("Auto-auth error from loopback token:", err);
        }
      }
    }).then((unlisten) => {
      unlistenFn = unlisten;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  useEffect(() => {
    if (username) {
      fetchLastfmProfile(username).then(setProfile).catch(console.error);
    } else {
      setProfile(null);
    }
  }, [username]);

  const screenTitles: Record<NavigationScreen, string> = {
    [NavigationScreen.DISCOVERY]: "Discovery Feed",
    [NavigationScreen.SEARCH]: "Music Search",
    [NavigationScreen.PROFILE]: "Listener Profile",
    [NavigationScreen.KARAOKE]: "Karaoke Mode",
    [NavigationScreen.NAMIREC]: "Nami's Month in Songs",
    [NavigationScreen.ARTIST_DETAIL]: "Artist Feature",
    [NavigationScreen.LOCAL]: "Media Listener",
    [NavigationScreen.MARUCAST]: "Marucast Wi-Fi Receiver",
    [NavigationScreen.SCROBBLING]: "Last.fm Scrobbler",
    [NavigationScreen.COMMON]: "Settings & Preferences",
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #211734 0%, #100c19 60%, #050507 100%)",
        color: "#f4f4f9fa",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 1. Custom Faux Windows 11 Title Bar with Monitor Movement (Non-draggable to block Windows Snap) */}
      <TitleBar title="MAudio" iconSrc="/icon.png" showMoveMonitor={true} draggable={false} />

      {/* 2. Main Desktop Body (Sidebar + Content Viewport) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Persistent Left Desktop Sidebar */}
        <DesktopSidebar
          currentScreen={selectedScreen}
          onSelectScreen={(s) => setSelectedScreen(s)}
          username={username}
          profile={profile}
          serviceRunning={mediaState.is_playing}
        />

        {/* Right Main Content Pane */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
            background: "rgba(10, 7, 18, 0.4)",
          }}
        >
          {/* Top Content Header Bar */}
          {selectedScreen !== NavigationScreen.ARTIST_DETAIL && (
            <div
              style={{
                height: "52px",
                minHeight: "52px",
                padding: "0 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                background: "linear-gradient(180deg, rgba(33, 23, 52, 0.4) 0%, transparent 100%)",
                backdropFilter: "blur(12px)",
                zIndex: 40,
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Heart size={18} fill="#70a5ff" color="#70a5ff" />
                </div>
                <span
                  style={{
                    fontSize: "17px",
                    fontWeight: 800,
                    letterSpacing: "0.4px",
                    color: "#f4f4f9fa",
                  }}
                >
                  {screenTitles[selectedScreen]}
                </span>
              </div>

              {/* Action: Marucast Quick Toggle */}
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setSelectedScreen(NavigationScreen.MARUCAST)}
                style={{
                  background: selectedScreen === NavigationScreen.MARUCAST ? "rgba(232, 93, 159, 0.2)" : "rgba(255, 255, 255, 0.08)",
                  border: selectedScreen === NavigationScreen.MARUCAST ? "1px solid var(--maru-accent-pink)" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "6px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: selectedScreen === NavigationScreen.MARUCAST ? "var(--maru-accent-pink)" : "#f4f4f9fa",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                <Cast size={15} />
                <span>Marucast</span>
                {mediaState.is_playing && (
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#4ade80",
                      boxShadow: "0 0 6px #4ade80",
                    }}
                  />
                )}
              </motion.button>
            </div>
          )}

          {/* Screen Viewport with smooth transitions */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <AnimatePresence mode="wait">
              {selectedScreen === NavigationScreen.DISCOVERY && (
                <DiscoveryScreen
                  key="discovery"
                  username={username}
                  onSongClick={(item: RecommendedTrackItem) =>
                    setSelectedSongDetail({
                      title: item.title,
                      artist: item.artist,
                      album: item.album,
                      artworkUrl: item.effectiveArtworkUrl,
                    })
                  }
                />
              )}

              {selectedScreen === NavigationScreen.SEARCH && (
                <SearchScreen
                  key="search"
                  onSongClick={(song) => setSelectedSongDetail(song)}
                  onOpenProfile={(u) => {
                    setUsername(u);
                    setSelectedScreen(NavigationScreen.PROFILE);
                  }}
                  onOpenArtist={(art) => {
                    setPreviousScreen(selectedScreen);
                    setSelectedArtistDetail(art);
                    setSelectedScreen(NavigationScreen.ARTIST_DETAIL);
                  }}
                />
              )}

              {selectedScreen === NavigationScreen.PROFILE && (
                <ProfileScreen
                  key="profile"
                  username={username}
                  onBack={() => setSelectedScreen(NavigationScreen.DISCOVERY)}
                  onSongClick={(s) => setSelectedSongDetail(s)}
                  onNavigateScrobbler={() => setSelectedScreen(NavigationScreen.SCROBBLING)}
                />
              )}

              {selectedScreen === NavigationScreen.KARAOKE && (
                <KaraokeScreen
                  key="karaoke"
                  mediaState={mediaState}
                  onSongClick={(s) => setSelectedSongDetail(s)}
                />
              )}

              {selectedScreen === NavigationScreen.NAMIREC && (
                <NamiRecScreen key="namirec" username={username} />
              )}

              {selectedScreen === NavigationScreen.ARTIST_DETAIL && (
                <ArtistFeatureScreen
                  key="artist"
                  artistName={selectedArtistDetail}
                  onBack={() => setSelectedScreen(previousScreen)}
                  onSelectSong={(s) => setSelectedSongDetail(s)}
                  onSelectArtist={(art) => setSelectedArtistDetail(art)}
                />
              )}

              {selectedScreen === NavigationScreen.LOCAL && (
                <LocalScreen key="local" mediaState={mediaState} />
              )}

              {selectedScreen === NavigationScreen.MARUCAST && (
                <MarucastScreen key="marucast" />
              )}

              {selectedScreen === NavigationScreen.SCROBBLING && (
                <ScrobblingScreen key="scrobbling" />
              )}

              {selectedScreen === NavigationScreen.COMMON && (
                <SettingsScreen
                  key="settings"
                  username={username}
                  onSaveUsername={(u) => {
                    setUsername(u);
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Persistent Media Notification Listener Bottom Bar */}
          <NotificationMirrorBottomBar
            mediaState={mediaState}
            onClick={() => {
              if (mediaState.title) {
                setSelectedSongDetail({
                  title: mediaState.title,
                  artist: mediaState.artist || "",
                  album: mediaState.album || undefined,
                  artworkUrl: mediaState.artwork_base64,
                });
              }
            }}
          />
        </div>
      </div>

      {/* Song Detail Modal */}
      <SongDetailModal
        song={selectedSongDetail}
        onDismiss={() => setSelectedSongDetail(null)}
        onSelectSong={(t, a) => setSelectedSongDetail({ title: t, artist: a })}
      />
    </div>
  );
}

export default App;
