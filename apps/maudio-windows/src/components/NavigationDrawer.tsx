import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavigationScreen, NavigationGroup, LastfmProfile } from "../types";
import {
  Sparkles,
  Search,
  User,
  Stars,
  Mic,
  Cast,
  CloudUpload,
  Activity,
  Radio,
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
      subtitle: "Accounts & Filters",
      icon: CloudUpload,
    },
    {
      screen: NavigationScreen.LOCAL,
      title: "Local Monitor",
      subtitle: "Media Controller",
      icon: Activity,
    },
    {
      screen: NavigationScreen.RECEIVER,
      title: "Receiver",
      subtitle: "Cross-device Sync",
      icon: Radio,
    },
    {
      screen: NavigationScreen.COMMON,
      title: "Settings",
      subtitle: "Layout & Player Options",
      icon: Settings,
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
              backdropFilter: "blur(8px)",
              zIndex: 100,
            }}
          />

          {/* Modal Drawer Sheet (matching 300dp Kotlin Sheet) */}
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
              width: "300px",
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Heart size={24} fill="#70a5ff" color="#70a5ff" />
                </div>
                <div>
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
                    }}
                  >
                    {username ? `Logged in as @${username}` : "Guest Mode"}
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.5)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
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
                  <button
                    key={item.screen}
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
                      transition: "all 120ms ease",
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
                  </button>
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
                  <button
                    key={item.screen}
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
                      transition: "all 120ms ease",
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
                  </button>
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
                background: serviceRunning ? "rgba(74, 222, 128, 0.12)" : "rgba(255, 255, 255, 0.1)",
                border: serviceRunning
                  ? "1px solid rgba(74, 222, 128, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.094)",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: serviceRunning ? "#4ade80" : "rgba(235, 235, 245, 0.5)",
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: serviceRunning ? "#4ade80" : "rgba(235, 235, 245, 0.72)",
                  letterSpacing: "0.5px",
                }}
              >
                {serviceRunning ? "BACKGROUND SERVICE ACTIVE" : "SERVICE IDLE"}
              </span>
            </div>

            {/* 5. Footer Signature */}
            <div
              style={{
                textAlign: "center",
                fontSize: "11px",
                color: "rgba(235, 235, 245, 0.65)",
                fontWeight: 500,
                letterSpacing: "0.5px",
                padding: "8px 0 4px",
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
