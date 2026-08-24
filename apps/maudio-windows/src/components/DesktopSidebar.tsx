import React from "react";
import { motion } from "framer-motion";
import { NavigationScreen, NavigationGroup, LastfmProfile } from "../types";
import {
  Sparkles,
  Search,
  User,
  Stars,
  Cast,
  CloudUpload,
  Activity,
  Settings,
  Heart,
} from "lucide-react";

interface DesktopSidebarProps {
  currentScreen: NavigationScreen;
  onSelectScreen: (screen: NavigationScreen) => void;
  username: string;
  profile: LastfmProfile | null;
  serviceRunning: boolean;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
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
      screen: NavigationScreen.LOCAL,
      title: "Media Listener",
      subtitle: "GSMTC Live Session",
      icon: Activity,
    },
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
    <div
      style={{
        width: "260px",
        minWidth: "260px",
        height: "100%",
        background: "linear-gradient(180deg, rgba(26, 18, 46, 0.75) 0%, rgba(13, 9, 24, 0.95) 100%)",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        padding: "18px 14px",
        gap: "14px",
        overflowY: "auto",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {/* 1. App Brand & Profile Box */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 10px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
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
            <Heart size={20} fill="#70a5ff" color="#70a5ff" />
          )}
        </div>
        <div style={{ overflow: "hidden", flex: 1 }}>
          <div
            style={{
              fontSize: "14.5px",
              fontWeight: 800,
              color: "#f4f4f9fa",
              letterSpacing: "1px",
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

      {/* 2. GROUP 1: RECOMMENDATION ENGINE */}
      <div
        style={{
          fontSize: "9.5px",
          fontWeight: 800,
          color: "var(--maru-accent-pink)",
          letterSpacing: "0.9px",
          paddingLeft: "8px",
          marginTop: "4px",
        }}
      >
        {NavigationGroup.RECOMMENDATION_ENGINE}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {recommendationScreens.map((item) => {
          const Icon = item.icon;
          const isSelected = currentScreen === item.screen;
          return (
            <motion.button
              key={item.screen}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectScreen(item.screen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px 12px",
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
                size={18}
                color={isSelected ? "var(--maru-accent-pink)" : "rgba(235, 235, 245, 0.72)"}
              />
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "13px", fontWeight: isSelected ? 700 : 500 }}>
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
          fontSize: "9.5px",
          fontWeight: 800,
          color: "var(--maru-accent-blue)",
          letterSpacing: "0.9px",
          paddingLeft: "8px",
          marginTop: "8px",
        }}
      >
        {NavigationGroup.CORE_FUNCTIONALITY}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {coreScreens.map((item) => {
          const Icon = item.icon;
          const isSelected = currentScreen === item.screen;
          return (
            <motion.button
              key={item.screen}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectScreen(item.screen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px 12px",
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
                size={18}
                color={isSelected ? "var(--maru-accent-pink)" : "rgba(235, 235, 245, 0.72)"}
              />
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "13px", fontWeight: isSelected ? 700 : 500 }}>
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
          gap: "8px",
          padding: "8px 12px",
          borderRadius: "20px",
          background: serviceRunning ? "rgba(74, 222, 128, 0.12)" : "rgba(255, 255, 255, 0.05)",
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
            fontSize: "9.5px",
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
          fontSize: "10.5px",
          color: "rgba(235, 235, 245, 0.45)",
          fontWeight: 500,
          letterSpacing: "0.5px",
        }}
      >
        with &lt;3, Maru &amp; Nanami
      </div>
    </div>
  );
};
