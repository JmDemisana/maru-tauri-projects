import { useState, useEffect } from "react";
import { TitleBar } from "@maru/ui";
import { NavigationScreen, LastfmProfile } from "./types";
import { NavigationDrawer } from "./components/NavigationDrawer";
import { BottomNav } from "./components/BottomNav";
import { DiscoveryScreen } from "./screens/DiscoveryScreen";
import { ScrobblingScreen } from "./screens/ScrobblingScreen";
import { MarucastScreen } from "./screens/MarucastScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { NamiRecScreen } from "./screens/NamiRecScreen";
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
      {/* Custom Faux Windows 11 Title Bar with Monitor Controls */}
      <TitleBar title="MAudio" iconSrc="/icon.png" />

      {/* Main App Desktop Header */}
      <div
        style={{
          height: "58px",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(10, 14, 26, 0.75)",
          backdropFilter: "blur(18px)",
          zIndex: 40,
        }}
      >
        {/* Left: Drawer Toggle & Branding */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => setIsDrawerOpen(true)}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fafcff",
              cursor: "pointer",
            }}
          >
            <Menu size={19} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #70a5ff, #ff71a2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 12px rgba(112, 165, 255, 0.55)",
              }}
            >
              <Heart size={15} fill="#ffffff" color="#ffffff" />
            </div>
            <span style={{ fontSize: "16px", fontWeight: 900, letterSpacing: "0.5px" }}>
              MAudio
            </span>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "999px",
                background: "rgba(74, 222, 128, 0.15)",
                color: "var(--maru-success)",
                border: "1px solid rgba(74, 222, 128, 0.3)",
                letterSpacing: "0.4px",
              }}
            >
              ONLINE & SCROBBLING
            </span>
          </div>
        </div>

        {/* Right: Quick Tab Switcher & Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", gap: "6px", background: "rgba(255, 255, 255, 0.05)", padding: "3px", borderRadius: "12px" }}>
            {[
              { id: NavigationScreen.DISCOVERY, label: "Discovery" },
              { id: NavigationScreen.SCROBBLING, label: "Scrobbler" },
              { id: NavigationScreen.MARUCAST, label: "Marucast" },
              { id: NavigationScreen.NAMIREC, label: "NamiRec" },
              { id: NavigationScreen.SETTINGS, label: "Settings" },
            ].map((tab) => {
              const isActive = currentScreen === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentScreen(tab.id)}
                  style={{
                    background: isActive ? "var(--maru-accent-pink)" : "transparent",
                    color: isActive ? "#070a13" : "rgba(255, 255, 255, 0.7)",
                    fontWeight: isActive ? 800 : 600,
                    fontSize: "12px",
                    border: "none",
                    borderRadius: "9px",
                    padding: "6px 14px",
                    cursor: "pointer",
                    transition: "all 140ms ease",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            onClick={() => setCurrentScreen(NavigationScreen.PROFILE)}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              padding: "2px",
              background: "linear-gradient(135deg, var(--maru-accent-pink), var(--maru-accent-blue))",
              cursor: "pointer",
              boxShadow: "0 0 12px rgba(255, 113, 162, 0.45)",
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
      </div>

      {/* Main Viewport Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {currentScreen === NavigationScreen.DISCOVERY && (
          <DiscoveryScreen username={username} onOpenProfile={() => setCurrentScreen(NavigationScreen.PROFILE)} />
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

      {/* Fixed Bottom Dock Bar */}
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
