import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavigationScreen, LastfmProfile } from "../types";
import { Compass, Radio, Cast, User, Disc, Settings, Heart, X, Sparkles } from "lucide-react";

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: NavigationScreen;
  onSelectScreen: (screen: NavigationScreen) => void;
  profile: LastfmProfile | null;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onSelectScreen,
  profile,
}) => {
  const navItems = [
    {
      id: NavigationScreen.DISCOVERY,
      label: "Discovery",
      desc: "Music search & trending tracks",
      icon: Compass,
      color: "#ff71a2",
    },
    {
      id: NavigationScreen.SCROBBLING,
      label: "Scrobbling HUD",
      desc: "Live Windows media & neon EQ",
      icon: Radio,
      color: "#70a5ff",
    },
    {
      id: NavigationScreen.MARUCAST,
      label: "Marucast Receiver",
      desc: "Stream lossless audio from phone",
      icon: Cast,
      color: "#a78bfa",
    },
    {
      id: NavigationScreen.PROFILE,
      label: "Listener Profile",
      desc: "Stats, history & top artists",
      icon: User,
      color: "#38bdf8",
    },
    {
      id: NavigationScreen.NAMIREC,
      label: "NamiRec Studio",
      desc: "Monthly cassette retrospectives",
      icon: Disc,
      color: "#f472b6",
    },
    {
      id: NavigationScreen.SETTINGS,
      label: "Settings",
      desc: "Accounts & preferences",
      icon: Settings,
      color: "#94a3b8",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(8px)",
              zIndex: 100,
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "320px",
              background: "linear-gradient(180deg, #0e1322 0%, #070a13 100%)",
              borderRight: "1px solid rgba(255, 255, 255, 0.1)",
              zIndex: 101,
              display: "flex",
              flexDirection: "column",
              boxShadow: "12px 0 36px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header / Profile Card */}
            <div
              style={{
                padding: "24px 20px 20px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                position: "relative",
              }}
            >
              <button
                onClick={onClose}
                style={{
                  position: "absolute",
                  top: "18px",
                  right: "16px",
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.6)",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "6px",
                }}
              >
                <X size={18} />
              </button>

              <div
                onClick={() => {
                  onSelectScreen(NavigationScreen.PROFILE);
                  onClose();
                }}
                style={{ display: "flex", alignItems: "center", gap: "14px", cursor: "pointer" }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    padding: "2.5px",
                    background: "linear-gradient(135deg, #ff71a2, #70a5ff)",
                    boxShadow: "0 0 18px rgba(255, 113, 162, 0.45)",
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
                      background: "#161b2e",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://lastfm.freetls.fastly.net/i/u/avatar170s/818148bf682d429dc215c1705eb27b98.png";
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-2px",
                      right: "-2px",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: "#4ade80",
                      border: "2px solid #0e1322",
                    }}
                  />
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#fafcff" }}>
                    {profile?.username || "Maru-Chan"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--maru-accent-pink)", fontWeight: 700, marginTop: "2px" }}>
                    {profile ? `${profile.totalScrobbles.toLocaleString()} scrobbles` : "Connecting..."}
                  </div>
                </div>
              </div>
            </div>

            {/* Nav Menu */}
            <div style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto" }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectScreen(item.id);
                      onClose();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: isActive
                        ? `1px solid ${item.color}40`
                        : "1px solid transparent",
                      background: isActive
                        ? `${item.color}15`
                        : "transparent",
                      color: isActive ? "#fafcff" : "rgba(245, 248, 255, 0.7)",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "all 140ms ease",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: isActive ? `${item.color}25` : "rgba(255, 255, 255, 0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: item.color,
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={19} />
                    </div>
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{item.label}</div>
                      <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.45)", marginTop: "1px" }}>
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "11.5px",
                color: "rgba(255, 255, 255, 0.4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Heart size={14} color="#70a5ff" fill="#70a5ff" />
                <span style={{ fontWeight: 600 }}>MAudio for Windows</span>
              </div>
              <span style={{ opacity: 0.6, fontWeight: 600 }}>v1.0.0</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
