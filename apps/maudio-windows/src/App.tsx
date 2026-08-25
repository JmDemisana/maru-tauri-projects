import { useState, useEffect, useRef } from "react";
import { TitleBar } from "@maru/ui";
import { NavigationScreen, LastfmProfile, MediaState, SongDetailState, RecommendedTrackItem, LastfmAuth } from "./types";
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
import { fetchLastfmProfile, fetchSessionFromToken, scrobbleTrack, updateNowPlaying, isAppAllowedForScrobbling } from "./utils/lastfmApi";
import { clearLastfmAuth, getLocalLastfmAuth, loadLastfmAuth, normalizeLastfmAuth, saveLastfmAuth } from "./utils/lastfmAuthStorage";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Heart, Sparkles } from "lucide-react";
import { AnimatePresence } from "framer-motion";

export function App() {
  const [selectedScreen, setSelectedScreen] = useState<NavigationScreen>(NavigationScreen.DISCOVERY);
  const [previousScreen, setPreviousScreen] = useState<NavigationScreen>(NavigationScreen.DISCOVERY);
  const [selectedArtistDetail, setSelectedArtistDetail] = useState<string>("GUMI");

  const [lastfmAuth, setLastfmAuth] = useState<LastfmAuth>(() => getLocalLastfmAuth());
  const username = lastfmAuth.username;
  const sessionKey = lastfmAuth.sessionKey;
  const [profile, setProfile] = useState<LastfmProfile | null>(null);
  const [selectedSongDetail, setSelectedSongDetail] = useState<SongDetailState | null>(null);

  const applyLastfmAuth = (auth: LastfmAuth) => {
    const next = normalizeLastfmAuth(auth);
    setLastfmAuth(next);
    void saveLastfmAuth(next);
  };

  const updateUsername = (newUsername: string) => {
    applyLastfmAuth({ username: newUsername.trim(), sessionKey });
  };

  const disconnectLastfm = () => {
    setLastfmAuth({ username: "", sessionKey: "" });
    setProfile(null);
    void clearLastfmAuth();
  };

  const handleTitleBarClose = async () => {
    const minimizeToTray = localStorage.getItem("maudio_minimize_to_tray") !== "false";
    try {
      if (minimizeToTray) {
        await invoke("hide_main_window");
      } else {
        await getCurrentWindow().close();
      }
    } catch (err) {
      console.error("Failed to close or hide MAudio:", err);
    }
  };

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

  // Scrobbler tracking refs
  const currentTrackKeyRef = useRef<string | null>(null);
  const trackStartedAtRef = useRef<number>(0);
  const hasScrobbledRef = useRef<boolean>(false);
  const hasSentNowPlayingRef = useRef<boolean>(false);

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

  useEffect(() => {
    let active = true;
    loadLastfmAuth()
      .then((auth) => {
        if (active) {
          setLastfmAuth(auth);
        }
      })
      .catch((err) => {
        console.warn("Could not hydrate Last.fm auth:", err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Background Scrobbling Engine (respects App Filter, Scrobble Enabled, & Trigger Threshold)
  useEffect(() => {
    const scrobbleEnabled = localStorage.getItem("maudio_scrobble_enabled") !== "false";

    if (!scrobbleEnabled || !sessionKey || !mediaState.title || !mediaState.artist || !mediaState.is_playing) {
      return;
    }

    // Check App Filter
    let selectedApps: string[] = [
      "Spotify",
      "Apple Music",
      "YouTube Music",
      "Tidal",
      "VLC media player",
      "Foobar2000",
      "Chrome",
      "Edge",
      "Firefox",
      "Brave",
      "Opera",
      "MusicBee",
      "iTunes",
      "AIMP",
    ];
    try {
      const raw = localStorage.getItem("maudio_selected_apps");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          selectedApps = parsed;
        }
      }
    } catch {
      // fallback
    }

    if (!isAppAllowedForScrobbling(mediaState.app_name, selectedApps)) {
      return;
    }

    const trackKey = `${mediaState.title.trim()}:::${mediaState.artist.trim()}`;

    // Detect track switch
    if (currentTrackKeyRef.current !== trackKey) {
      currentTrackKeyRef.current = trackKey;
      trackStartedAtRef.current = Date.now();
      hasScrobbledRef.current = false;
      hasSentNowPlayingRef.current = false;

      // Update Now Playing on Last.fm
      updateNowPlaying(mediaState.artist, mediaState.title, mediaState.album ?? null, sessionKey).catch(() => {});
      hasSentNowPlayingRef.current = true;
    }

    // Check if eligible to scrobble
    if (!hasScrobbledRef.current) {
      const pct = Math.max(10, Math.min(90, parseInt(localStorage.getItem("maudio_scrobble_pct") || "50", 10)));
      const durationMs = mediaState.duration_ms ?? 0;
      const elapsedListenMs = Date.now() - trackStartedAtRef.current;
      const positionMs = mediaState.position_ms ?? elapsedListenMs;

      let thresholdMs = 30000; // minimum 30s
      if (durationMs > 0) {
        thresholdMs = Math.min(durationMs * (pct / 100), 240000); // 50% or 4 min max
      }

      if (positionMs >= thresholdMs || elapsedListenMs >= thresholdMs) {
        hasScrobbledRef.current = true;
        scrobbleTrack(mediaState.artist, mediaState.title, mediaState.album ?? null, sessionKey)
          .then((success) => {
            if (success && username) {
              fetchLastfmProfile(username).then(setProfile).catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
  }, [mediaState, username, sessionKey]);

  // Listen for Last.fm token emitted from local auth loopback server (zero-click handoff)
  useEffect(() => {
    let unlisten1: (() => void) | null = null;
    let unlisten2: (() => void) | null = null;

    const handleAuthToken = async (token: string) => {
      if (!token) return;
      try {
        const session = await fetchSessionFromToken(token);
        applyLastfmAuth({ username: session.name, sessionKey: session.key });
        setSelectedScreen(NavigationScreen.PROFILE);
      } catch (err) {
        console.error("Auto-auth error from loopback token:", err);
      }
    };

    listen<string>("lastfm_token_received", (event) => handleAuthToken(event.payload)).then((u) => {
      unlisten1 = u;
    });
    listen<string>("lastfm-auth-token", (event) => handleAuthToken(event.payload)).then((u) => {
      unlisten2 = u;
    });

    return () => {
      if (unlisten1) unlisten1();
      if (unlisten2) unlisten2();
    };
  }, [sessionKey]);

  useEffect(() => {
    if (username.trim()) {
      fetchLastfmProfile(username.trim())
        .then(setProfile)
        .catch((err) => {
          console.warn("Could not fetch Last.fm profile:", err);
          setProfile({
            username: username.trim(),
            totalScrobbles: 0,
            artistCount: 0,
            trackCount: 0,
          });
        });
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
      <TitleBar title="MAudio" iconSrc="/icon.png" showMoveMonitor={true} draggable={false} onClose={handleTitleBarClose} />

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
                    updateUsername(u);
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
                  onNavigateMarucast={() => setSelectedScreen(NavigationScreen.MARUCAST)}
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
                <ScrobblingScreen
                  key="scrobbling"
                  username={username}
                  sessionKey={sessionKey}
                  onAuthChange={applyLastfmAuth}
                  onDisconnect={disconnectLastfm}
                />
              )}

              {selectedScreen === NavigationScreen.COMMON && (
                <SettingsScreen
                  key="settings"
                  username={username}
                  onSaveUsername={(u) => updateUsername(u)}
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
