import { useState, useEffect } from "react";
import { TitleBar } from "@maru/ui";
import { NavigationScreen, LastfmProfile, MediaState } from "./types";
import { NavigationDrawer } from "./components/NavigationDrawer";
import { NotificationMirrorBottomBar } from "./components/NotificationMirrorBottomBar";
import { SongDetailModal } from "./components/SongDetailModal";
import { DiscoveryScreen } from "./screens/DiscoveryScreen";
import { ScrobblingScreen } from "./screens/ScrobblingScreen";
import { MarucastScreen } from "./screens/MarucastScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { NamiRecScreen } from "./screens/NamiRecScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { fetchLastfmProfile } from "./utils/lastfmApi";
import { invoke } from "@tauri-apps/api/core";
import { Menu, Heart, Radio, Cast } from "lucide-react";

export function App() {
  const [currentScreen, setCurrentScreen] = useState<NavigationScreen>(NavigationScreen.DISCOVERY);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [username, setUsername] = useState("Maru-Chan");
  const [profile, setProfile] = useState<LastfmProfile | null>(null);
  const [selectedSongDetail, setSelectedSongDetail] = useState<{
    title: string;
    artist: string;
    album?: string;
    artworkUrl?: string | null;
  } | null>(null);

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

  // Poll Windows GSMTC Media State
  const pollMedia = async () => {
    try {
      const state = await invoke<MediaState>("get_media_state");
      if (state) {
        setMediaState(state);
      }
    } catch (e) {
      // Background poll silently
    }
  };

  useEffect(() => {
    pollMedia();
    const timer = setInterval(pollMedia, 1500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchLastfmProfile(username).then(setProfile).catch(console.error);
  }, [username]);

  const screenTitles: Record<NavigationScreen, string> = {
    [NavigationScreen.DISCOVERY]: "Discovery",
    [NavigationScreen.SCROBBLING]: "Scrobbler",
    [NavigationScreen.MARUCAST]: "Marucast",
    [NavigationScreen.PROFILE]: "Profile",
    [NavigationScreen.NAMIREC]: "NamiRec",
    [NavigationScreen.SETTINGS]: "Settings",
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #0f172a 0%, #070a13 60%, #030508 100%)",
        color: "#fafcff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 1. Custom Faux Windows 11 Title Bar with Monitor Controls */}
      <TitleBar title="MAudio" iconSrc="/icon.png" />

      {/* 2. Top App Bar (1-to-1 matching Android MAudio TopAppBar) */}
      <div
        style={{
          height: "56px",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 14, 26, 0.4) 100%)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          zIndex: 40,
        }}
      >
        {/* Navigation Icon (Hamburger Menu) */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={() => setIsDrawerOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "#fafcff",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Menu size={22} />
          </button>

          {/* Screen Title with Heart Icon */}
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
              <Heart size={20} fill="#70a5ff" color="#70a5ff" />
            </div>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 800,
                letterSpacing: "0.5px",
                color: "#fafcff",
              }}
            >
              {screenTitles[currentScreen]}
            </span>
          </div>
        </div>

        {/* Action: Marucast Icon Button with active badge */}
        <button
          onClick={() => setCurrentScreen(NavigationScreen.MARUCAST)}
          style={{
            background: currentScreen === NavigationScreen.MARUCAST ? "rgba(255, 113, 162, 0.2)" : "transparent",
            border: currentScreen === NavigationScreen.MARUCAST ? "1px solid rgba(255, 113, 162, 0.5)" : "none",
            borderRadius: "50%",
            width: "38px",
            height: "38px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: currentScreen === NavigationScreen.MARUCAST ? "var(--maru-accent-pink)" : "rgba(255, 255, 255, 0.6)",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <Cast size={20} />
          {mediaState.is_playing && (
            <div
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: "#4ade80",
                boxShadow: "0 0 6px #4ade80",
              }}
            />
          )}
        </button>
      </div>

      {/* 3. Main Screen Viewport (Animated Content) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {currentScreen === NavigationScreen.DISCOVERY && (
          <DiscoveryScreen
            username={username}
            onOpenProfile={() => setCurrentScreen(NavigationScreen.PROFILE)}
          />
        )}
        {currentScreen === NavigationScreen.SCROBBLING && (
          <ScrobblingScreen />
        )}
        {currentScreen === NavigationScreen.MARUCAST && (
          <MarucastScreen />
        )}
        {currentScreen === NavigationScreen.PROFILE && (
          <ProfileScreen username={username} onBack={() => setCurrentScreen(NavigationScreen.DISCOVERY)} />
        )}
        {currentScreen === NavigationScreen.NAMIREC && (
          <NamiRecScreen username={username} />
        )}
        {currentScreen === NavigationScreen.SETTINGS && (
          <SettingsScreen username={username} onSaveUsername={setUsername} />
        )}
      </div>

      {/* 4. Notification Mirror Persistent Bottom Bar (Only when playing!) */}
      <NotificationMirrorBottomBar
        mediaState={mediaState}
        onClick={() => {
          if (mediaState.title && mediaState.artist) {
            setSelectedSongDetail({
              title: mediaState.title,
              artist: mediaState.artist,
              album: mediaState.album || undefined,
              artworkUrl: mediaState.artwork_base64,
            });
          }
        }}
      />

      {/* 5. Slide-Out Glass Navigation Drawer (The sole menu) */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentScreen={currentScreen}
        onSelectScreen={(s) => {
          setCurrentScreen(s);
          setIsDrawerOpen(false);
        }}
        profile={profile}
      />

      {/* 6. Song Detail Modal / Bottom Sheet */}
      <SongDetailModal
        song={selectedSongDetail}
        onDismiss={() => setSelectedSongDetail(null)}
      />
    </div>
  );
}

export default App;
