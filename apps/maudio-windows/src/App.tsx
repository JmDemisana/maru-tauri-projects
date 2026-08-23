import { useState, useEffect } from "react";
import { TitleBar } from "@maru/ui";
import { NavigationScreen, LastfmProfile, MediaState, SongDetailState, RecommendedTrackItem } from "./types";
import { NavigationDrawer } from "./components/NavigationDrawer";
import { NotificationMirrorBottomBar } from "./components/NotificationMirrorBottomBar";
import { SongDetailModal } from "./components/SongDetailModal";
import { DiscoveryScreen } from "./screens/DiscoveryScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { NamiRecScreen } from "./screens/NamiRecScreen";
import { ArtistFeatureScreen } from "./screens/ArtistFeatureScreen";
import { ScrobblingScreen } from "./screens/ScrobblingScreen";
import { MarucastScreen } from "./screens/MarucastScreen";
import { LocalScreen } from "./screens/LocalScreen";
import { ReceiverScreen } from "./screens/ReceiverScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { fetchLastfmProfile } from "./utils/lastfmApi";
import { invoke } from "@tauri-apps/api/core";
import { Menu, Heart, Cast } from "lucide-react";

export function App() {
  const [selectedScreen, setSelectedScreen] = useState<NavigationScreen>(NavigationScreen.DISCOVERY);
  const [previousScreen, setPreviousScreen] = useState<NavigationScreen>(NavigationScreen.DISCOVERY);
  const [selectedArtistDetail, setSelectedArtistDetail] = useState<string>("GUMI");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [username, setUsername] = useState("JmDemisana");
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

  useEffect(() => {
    fetchLastfmProfile(username).then(setProfile).catch(console.error);
  }, [username]);

  const screenTitles: Record<NavigationScreen, string> = {
    [NavigationScreen.DISCOVERY]: "Discovery",
    [NavigationScreen.SEARCH]: "Search",
    [NavigationScreen.PROFILE]: "Profile",
    [NavigationScreen.NAMIREC]: "NamiRec",
    [NavigationScreen.ARTIST_DETAIL]: "Artist Feature",
    [NavigationScreen.MARUCAST]: "Marucast",
    [NavigationScreen.SCROBBLING]: "Scrobbler",
    [NavigationScreen.LOCAL]: "Local Monitor",
    [NavigationScreen.RECEIVER]: "Receiver",
    [NavigationScreen.COMMON]: "Settings",
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
      {/* 1. Custom Faux Windows 11 Title Bar with Monitor Movement */}
      <TitleBar title="MAudio" iconSrc="/icon.png" />

      {/* 2. Top App Bar (1-to-1 matching Kotlin TopAppBar) */}
      {selectedScreen !== NavigationScreen.ARTIST_DETAIL && (
        <div
          style={{
            height: "56px",
            padding: "0 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, rgba(33, 23, 52, 0.95) 0%, transparent 100%)",
            backdropFilter: "blur(14px)",
            zIndex: 40,
          }}
        >
          {/* Navigation Icon (Hamburger Menu) */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => setIsDrawerOpen(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "#f4f4f9fa",
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

            {/* ic_maru_heart + selectedScreen.title */}
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
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  color: "#f4f4f9fa",
                }}
              >
                {screenTitles[selectedScreen]}
              </span>
            </div>
          </div>

          {/* Action: Podcasts / Marucast Button */}
          <button
            onClick={() => setSelectedScreen(NavigationScreen.MARUCAST)}
            style={{
              background: "transparent",
              border: "none",
              borderRadius: "50%",
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: selectedScreen === NavigationScreen.MARUCAST ? "var(--maru-accent-pink)" : "rgba(235, 235, 245, 0.7)",
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
      )}

      {/* 3. Screen Viewport */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {selectedScreen === NavigationScreen.DISCOVERY && (
          <DiscoveryScreen
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
          <ProfileScreen username={username} onBack={() => setSelectedScreen(NavigationScreen.DISCOVERY)} />
        )}

        {selectedScreen === NavigationScreen.NAMIREC && (
          <NamiRecScreen username={username} />
        )}

        {selectedScreen === NavigationScreen.ARTIST_DETAIL && (
          <ArtistFeatureScreen
            artistName={selectedArtistDetail}
            onBack={() => setSelectedScreen(previousScreen)}
            onSelectSong={(s) => setSelectedSongDetail(s)}
            onSelectArtist={(art) => setSelectedArtistDetail(art)}
          />
        )}

        {selectedScreen === NavigationScreen.MARUCAST && (
          <MarucastScreen />
        )}

        {selectedScreen === NavigationScreen.SCROBBLING && (
          <ScrobblingScreen />
        )}

        {selectedScreen === NavigationScreen.LOCAL && (
          <LocalScreen mediaState={mediaState} />
        )}

        {selectedScreen === NavigationScreen.RECEIVER && (
          <ReceiverScreen lastfmUsername={username} />
        )}

        {selectedScreen === NavigationScreen.COMMON && (
          <SettingsScreen username={username} onSaveUsername={setUsername} />
        )}
      </div>

      {/* 4. Notification Mirror Persistent Bottom Bar */}
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

      {/* 5. Glass Navigation Drawer (The Canonical Menu) */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentScreen={selectedScreen}
        onSelectScreen={(s) => {
          setSelectedScreen(s);
          setIsDrawerOpen(false);
        }}
        username={username}
        profile={profile}
        serviceRunning={mediaState.is_playing}
      />

      {/* 6. Song Detail Modal */}
      <SongDetailModal
        song={selectedSongDetail}
        onDismiss={() => setSelectedSongDetail(null)}
        onSelectSong={(t, a) => setSelectedSongDetail({ title: t, artist: a })}
      />
    </div>
  );
}

export default App;
