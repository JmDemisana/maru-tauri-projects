import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavigationScreen, LastfmProfile } from "../types";
import { Compass, Radio, Cast, Settings, Heart, X } from "lucide-react";

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
      desc: "Profile stats & recent history",
      icon: Compass,
      color: "#ff71a2",
    },
    {
      id: NavigationScreen.SCROBBLING,
      label: "Scrobbling HUD",
      desc: "Live media player & EQ",
      icon: Radio,
      color: "#70a5ff",
    },
    {
      id: NavigationScreen.MARUCAST,
      label: "Marucast Receiver",
      desc: "Stream audio from phone",
      icon: Cast,
      color: "#a78bfa",
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
              background: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(6px)",
              zIndex: 100,
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "300px",
              background: "linear-gradient(180deg, #0e1322 0%, #070a13 100%)",
              borderRight: "1px solid rgba(255, 255, 255, 0.1)",
              zIndex: 101,
              display: "flex",
              flexDirection: "column",
              boxShadow: "10px 0 30px rgba(0,0,0,0.5)",
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

              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    position: "relative",
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    padding: "2px",
                    background: "linear-gradient(135deg, #ff71a2, #70a5ff)",
                    boxShadow: "0 0 16px rgba(255, 113, 162, 0.4)",
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
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#fafcff" }}>
                    {profile?.username || "Maru-Chan"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--maru-accent-pink)", fontWeight: 600, marginTop: "2px" }}>
                    {profile ? `${profile.totalScrobbles.toLocaleString()} scrobbles` : "Connecting..."}
                  </div>
                </div>
              </div>
            </div>

            {/* Nav Menu */}
            <div style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
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
                      gap: "12px",
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
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: isActive ? `${item.color}25` : "rgba(255, 255, 255, 0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: item.color,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 600 }}>{item.label}</div>
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
                <span>MAudio for Windows</span>
              </div>
              <span style={{ opacity: 0.6 }}>v1.0.0</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
