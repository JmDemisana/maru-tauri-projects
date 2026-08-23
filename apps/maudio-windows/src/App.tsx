import { useState, useEffect } from "react";
import { TitleBar } from "@maru/ui";
import { NavigationScreen, LastfmProfile } from "./types";
import { NavigationDrawer } from "./components/NavigationDrawer";
import { BottomNav } from "./components/BottomNav";
import { DiscoveryScreen } from "./screens/DiscoveryScreen";
import { ScrobblingScreen } from "./screens/ScrobblingScreen";
import { MarucastScreen } from "./screens/MarucastScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { fetchLastfmProfile } from "./utils/lastfmApi";
import { Menu, Heart } from "lucide-react";

export function App() {
  const [currentScreen, setCurrentScreen] = useState<NavigationScreen>(NavigationScreen.DISCOVERY);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [username, setUsername] = useState("Maru-Chan");
  const [profile, setProfile] = useState<LastfmProfile | null>(null);

  useEffect(() => {
    fetchLastfmProfile(username).then(setProfile).catch(console.error);
  }, [username]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #070a13 0%, #0c1020 100%)",
        color: "#fafcff",
        position: "relative",
      }}
    >
      {/* Custom Faux Windows 11 Title Bar */}
      <TitleBar title="MAudio" iconSrc="/icon.png" />

      {/* App Main Mobile-style Header */}
      <div
        style={{
          height: "54px",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(10, 14, 26, 0.7)",
          backdropFilter: "blur(16px)",
          zIndex: 40,
        }}
      >
        {/* Left: Drawer Toggle */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
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
          <Menu size={18} />
        </button>

        {/* Center: Branding & Active Mode */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #70a5ff, #ff71a2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 10px rgba(112, 165, 255, 0.5)",
            }}
          >
            <Heart size={13} fill="#ffffff" color="#ffffff" />
          </div>
          <span style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "0.5px" }}>
            MAudio
          </span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: "999px",
              background: "rgba(74, 222, 128, 0.15)",
              color: "var(--maru-success)",
              border: "1px solid rgba(74, 222, 128, 0.3)",
              letterSpacing: "0.3px",
            }}
          >
            LIVE
          </span>
        </div>

        {/* Right: Avatar trigger */}
        <div
          onClick={() => setCurrentScreen(NavigationScreen.DISCOVERY)}
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            padding: "1.5px",
            background: "linear-gradient(135deg, var(--maru-accent-pink), var(--maru-accent-blue))",
            cursor: "pointer",
            boxShadow: "0 0 10px rgba(255, 113, 162, 0.4)",
          }}
        >
          <img
            src={profile?.avatarUrl || "https://lastfm.freetls.fastly.net/i/u/avatar170s/818148bf682d429dc215c1705eb27b98.png"}
            alt="Profile"
            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://lastfm.freetls.fastly.net/i/u/avatar170s/818148bf682d429dc215c1705eb27b98.png";
            }}
          />
        </div>
      </div>

      {/* Body Viewport */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {currentScreen === NavigationScreen.DISCOVERY && (
          <DiscoveryScreen username={username} />
        )}
        {currentScreen === NavigationScreen.SCROBBLING && (
          <ScrobblingScreen />
        )}
        {currentScreen === NavigationScreen.MARUCAST && (
          <MarucastScreen />
        )}
        {currentScreen === NavigationScreen.SETTINGS && (
          <SettingsScreen username={username} onSaveUsername={setUsername} />
        )}
      </div>

      {/* Fixed Bottom Navigation Dock */}
      <BottomNav currentScreen={currentScreen} onSelectScreen={setCurrentScreen} />

      {/* Slide-out Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentScreen={currentScreen}
        onSelectScreen={setCurrentScreen}
        profile={profile}
      />
    </div>
  );
}

export default App;
