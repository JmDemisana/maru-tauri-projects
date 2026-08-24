import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavigationScreen, NavigationGroup, LastfmProfile } from "../types";
import {
  Sparkles,
  Search,
  User,
  Stars,
  Cast,
  CloudUpload,
  Settings,
  Heart,
  X,
} from "lucide-react";

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: NavigationScreen;
  onSelectScreen: (screen: NavigationScreen) => void;
  username: string;
  profile: LastfmProfile | null;
  serviceRunning: boolean;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onSelectScreen,
  username,
  profile,
  serviceRunning,
}) => {
  const recommendationScreens = [
    {
      screen: NavigationScreen.DISCOVERY,
      title: "Discovery",
      subtitle: "Personalized Track Feed",
      icon: Sparkles,
    },
    {
      screen: NavigationScreen.SEARCH,
      title: "Search",
      subtitle: "Tracks, Artists & Profiles",
      icon: Search,
    },
    {
      screen: NavigationScreen.PROFILE,
      title: "Profile",
      subtitle: "Scrobble Stats & Charts",
      icon: User,
    },
    {
      screen: NavigationScreen.NAMIREC,
      title: "NamiRec",
      subtitle: "Monthly Musical Recap",
      icon: Stars,
    },
  ];

  const coreScreens = [
    {
      screen: NavigationScreen.MARUCAST,
      title: "Marucast",
      subtitle: "Lossless Wi-Fi Receiver",
      icon: Cast,
    },
    {
      screen: NavigationScreen.SCROBBLING,
      title: "Scrobbler",
      subtitle: "Last.fm Auto-Scrobble",
      icon: CloudUpload,
    },
    {
      screen: NavigationScreen.COMMON,
      title: "Settings",
      subtitle: "Player & Preferences",
      icon: Settings,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (Starts below the 32px TitleBar) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              top: "32px",
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(8px)",
              zIndex: 100,
            }}
          />

          {/* Modal Drawer Sheet (Starts below 32px TitleBar, smooth spring slide) */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            style={{
              position: "fixed",
              top: "32px",
              left: 0,
              bottom: 0,
              width: "310px",
              background: "linear-gradient(180deg, #1e1433 0%, #100b1d 50%, #07050a 100%)",
              borderRight: "1px solid rgba(255, 255, 255, 0.094)",
              borderRadius: "0 16px 16px 0",
              zIndex: 101,
              display: "flex",
              flexDirection: "column",
              boxShadow: "16px 0 40px rgba(0, 0, 0, 0.7)",
              overflowY: "auto",
              padding: "20px",
              gap: "14px",
            }}
          >
            {/* 1. Brand & User Profile in Drawer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "rgba(112, 165, 255, 0.15)",
                    border: "1.5px solid var(--maru-accent-blue)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Heart size={18} fill="#70a5ff" color="#70a5ff" />
                  )}
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#f4f4f9fa",
                      letterSpacing: "1.2px",
                    }}
                  >
                    MAUDIO
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--maru-accent-pink)",
                      fontWeight: 600,
                      marginTop: "1px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {username ? `@${username}` : "Guest Mode"}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  color: "rgba(255, 255, 255, 0.7)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </motion.button>
            </div>

            <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.094)", width: "100%" }} />

            {/* 2. GROUP 1: RECOMMENDATION ENGINE */}
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "var(--maru-accent-pink)",
                letterSpacing: "1px",
                paddingLeft: "4px",
              }}
            >
              {NavigationGroup.RECOMMENDATION_ENGINE}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {recommendationScreens.map((item) => {
                const Icon = item.icon;
                const isSelected = currentScreen === item.screen;
                return (
                  <motion.button
                    key={item.screen}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onSelectScreen(item.screen);
                      onClose();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: isSelected
                        ? "1px solid rgba(232, 93, 159, 0.6)"
                        : "1px solid transparent",
                      background: isSelected
                        ? "rgba(232, 93, 159, 0.16)"
                        : "transparent",
                      color: isSelected ? "#f4f4f9fa" : "rgba(235, 235, 245, 0.72)",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "background 120ms ease, border 120ms ease",
                    }}
                  >
                    <Icon
                      size={20}
                      color={isSelected ? "var(--maru-accent-pink)" : "rgba(235, 235, 245, 0.72)"}
                    />
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: isSelected ? 700 : 500 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "10px", color: "rgba(235, 235, 245, 0.45)", marginTop: "1px" }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* 3. GROUP 2: CORE FUNCTIONALITY */}
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "var(--maru-accent-blue)",
                letterSpacing: "1px",
                paddingLeft: "4px",
                marginTop: "6px",
              }}
            >
              {NavigationGroup.CORE_FUNCTIONALITY}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {coreScreens.map((item) => {
                const Icon = item.icon;
                const isSelected = currentScreen === item.screen;
                return (
                  <motion.button
                    key={item.screen}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onSelectScreen(item.screen);
                      onClose();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: isSelected
                        ? "1px solid rgba(232, 93, 159, 0.6)"
                        : "1px solid transparent",
                      background: isSelected
                        ? "rgba(232, 93, 159, 0.16)"
                        : "transparent",
                      color: isSelected ? "#f4f4f9fa" : "rgba(235, 235, 245, 0.72)",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "background 120ms ease, border 120ms ease",
                    }}
                  >
                    <Icon
                      size={20}
                      color={isSelected ? "var(--maru-accent-pink)" : "rgba(235, 235, 245, 0.72)"}
                    />
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: isSelected ? 700 : 500 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: "10px", color: "rgba(235, 235, 245, 0.45)", marginTop: "1px" }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* 4. Bottom Status Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 14px",
                borderRadius: "24px",
                background: serviceRunning ? "rgba(74, 222, 128, 0.12)" : "rgba(255, 255, 255, 0.06)",
                border: serviceRunning
                  ? "1px solid rgba(74, 222, 128, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                marginTop: "auto",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: serviceRunning ? "#4ade80" : "rgba(235, 235, 245, 0.4)",
                  boxShadow: serviceRunning ? "0 0 8px #4ade80" : "none",
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: serviceRunning ? "#4ade80" : "rgba(235, 235, 245, 0.65)",
                  letterSpacing: "0.5px",
                }}
              >
                {serviceRunning ? "MEDIA LISTENER ACTIVE" : "LISTENER IDLE"}
              </span>
            </div>

            {/* 5. Footer Signature */}
            <div
              style={{
                textAlign: "center",
                fontSize: "11px",
                color: "rgba(235, 235, 245, 0.55)",
                fontWeight: 500,
                letterSpacing: "0.5px",
                padding: "4px 0 2px",
              }}
            >
              with &lt;3, Maru &amp; Nanami
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
