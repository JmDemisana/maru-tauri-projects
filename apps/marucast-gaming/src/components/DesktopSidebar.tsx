import React from "react";
import { motion } from "framer-motion";
import { NavigationScreen, NavigationGroup, AdbDevice, AudioRoutingMode } from "../types";
import {
  Gamepad2,
  Layers,
  Wifi,
  Sliders,
  Smartphone,
  CheckCircle2,
  XCircle,
  Volume2,
} from "lucide-react";

interface DesktopSidebarProps {
  currentScreen: NavigationScreen;
  onSelectScreen: (screen: NavigationScreen) => void;
  activeDevice: AdbDevice | null;
  audioMode: AudioRoutingMode;
  activeSessionCount: number;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentScreen,
  onSelectScreen,
  activeDevice,
  audioMode,
  activeSessionCount,
}) => {
  const gamingScreens = [
    {
      screen: NavigationScreen.GAMES_HUB,
      title: "Apps & Games",
      subtitle: "Remote Gamepad Launcher",
      icon: Gamepad2,
    },
    {
      screen: NavigationScreen.RECENT_TASKS,
      title: "Recent Tasks",
      subtitle: "Active Android Windows",
      icon: Layers,
    },
  ];

  const linkScreens = [
    {
      screen: NavigationScreen.CONNECTIVITY,
      title: "Device Link",
      subtitle: "Wireless & USB ADB",
      icon: Wifi,
    },
  ];

  const prefScreens = [
    {
      screen: NavigationScreen.CONTROLS,
      title: "Controls & Audio",
      subtitle: "Keymaps & Sound Routing",
      icon: Sliders,
    },
  ];

  const getAudioLabel = (mode: AudioRoutingMode) => {
    switch (mode) {
      case "phone":
        return "Audio: Host Device";
      case "both":
        return "Audio: Dual Host + PC";
      case "pc":
      default:
        return "Audio: PC Stream";
    }
  };

  return (
    <div
      style={{
        width: "260px",
        minWidth: "260px",
        height: "100%",
        background: "linear-gradient(180deg, rgba(20, 14, 36, 0.85) 0%, rgba(10, 8, 18, 0.98) 100%)",
        borderRight: "1px solid var(--maru-border)",
        backdropFilter: "blur(18px)",
        display: "flex",
        flexDirection: "column",
        padding: "16px 12px",
        gap: "12px",
        overflowY: "auto",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {/* 1. Device Card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.07)",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: activeDevice ? "rgba(74, 222, 128, 0.12)" : "rgba(255, 113, 162, 0.12)",
            border: activeDevice ? "1px solid rgba(74, 222, 128, 0.4)" : "1px solid rgba(255, 113, 162, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Smartphone size={20} color={activeDevice ? "#4ade80" : "var(--maru-accent-pink)"} />
        </div>
        <div style={{ overflow: "hidden", flex: 1 }}>
          <div
            style={{
              fontSize: "13.5px",
              fontWeight: 800,
              color: "#f4f4f9fa",
              letterSpacing: "0.5px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {activeDevice ? activeDevice.model : "No Device Connected"}
          </div>
          <div
            style={{
              fontSize: "10.5px",
              color: activeDevice ? "#4ade80" : "var(--maru-text-dim)",
              fontWeight: 600,
              marginTop: "2px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {activeDevice ? (
              <>
                <CheckCircle2 size={11} color="#4ade80" />
                <span>{activeDevice.is_wireless ? "Wireless ADB" : "USB Connected"}</span>
              </>
            ) : (
              <>
                <XCircle size={11} color="var(--maru-accent-pink)" />
                <span>Tap Device Link</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. GROUP 1: GAMING & APPS */}
      <div
        style={{
          fontSize: "9px",
          fontWeight: 800,
          color: "var(--maru-accent-pink)",
          letterSpacing: "0.9px",
          paddingLeft: "6px",
          marginTop: "2px",
        }}
      >
        {NavigationGroup.GAMING_HUB}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {gamingScreens.map((item) => {
          const Icon = item.icon;
          const isSelected = currentScreen === item.screen;
          return (
            <motion.button
              key={item.screen}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectScreen(item.screen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: "10px",
                border: isSelected ? "1px solid rgba(232, 93, 159, 0.6)" : "1px solid transparent",
                background: isSelected ? "rgba(232, 93, 159, 0.16)" : "transparent",
                color: isSelected ? "#f4f4f9" : "var(--maru-text-muted)",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "background 120ms ease, border 120ms ease",
              }}
            >
              <Icon size={17} color={isSelected ? "var(--maru-accent-pink)" : "var(--maru-text-muted)"} />
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "12.5px", fontWeight: isSelected ? 700 : 500 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "9.5px", color: "var(--maru-text-dim)", marginTop: "1px" }}>
                  {item.subtitle}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 3. GROUP 2: DEVICE LINK */}
      <div
        style={{
          fontSize: "9px",
          fontWeight: 800,
          color: "var(--maru-accent-blue)",
          letterSpacing: "0.9px",
          paddingLeft: "6px",
          marginTop: "4px",
        }}
      >
        {NavigationGroup.DEVICE_LINK}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {linkScreens.map((item) => {
          const Icon = item.icon;
          const isSelected = currentScreen === item.screen;
          return (
            <motion.button
              key={item.screen}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectScreen(item.screen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: "10px",
                border: isSelected ? "1px solid rgba(112, 165, 255, 0.6)" : "1px solid transparent",
                background: isSelected ? "rgba(112, 165, 255, 0.16)" : "transparent",
                color: isSelected ? "#f4f4f9" : "var(--maru-text-muted)",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "background 120ms ease, border 120ms ease",
              }}
            >
              <Icon size={17} color={isSelected ? "var(--maru-accent-blue)" : "var(--maru-text-muted)"} />
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "12.5px", fontWeight: isSelected ? 700 : 500 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "9.5px", color: "var(--maru-text-dim)", marginTop: "1px" }}>
                  {item.subtitle}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 4. GROUP 3: PREFERENCES */}
      <div
        style={{
          fontSize: "9px",
          fontWeight: 800,
          color: "var(--maru-accent-purple)",
          letterSpacing: "0.9px",
          paddingLeft: "6px",
          marginTop: "4px",
        }}
      >
        {NavigationGroup.PREFERENCES}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {prefScreens.map((item) => {
          const Icon = item.icon;
          const isSelected = currentScreen === item.screen;
          return (
            <motion.button
              key={item.screen}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectScreen(item.screen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: "10px",
                border: isSelected ? "1px solid rgba(192, 132, 252, 0.6)" : "1px solid transparent",
                background: isSelected ? "rgba(192, 132, 252, 0.16)" : "transparent",
                color: isSelected ? "#f4f4f9" : "var(--maru-text-muted)",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "background 120ms ease, border 120ms ease",
              }}
            >
              <Icon size={17} color={isSelected ? "var(--maru-accent-purple)" : "var(--maru-text-muted)"} />
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "12.5px", fontWeight: isSelected ? 700 : 500 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "9.5px", color: "var(--maru-text-dim)", marginTop: "1px" }}>
                  {item.subtitle}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 5. Audio Status Indicator */}
      <div
        style={{
          marginTop: "auto",
          padding: "8px 10px",
          borderRadius: "10px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Volume2 size={15} color="var(--maru-accent-pink)" />
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--maru-text-muted)" }}>
          {getAudioLabel(audioMode)}
        </span>
      </div>

      {/* 6. Active Session Pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 10px",
          borderRadius: "16px",
          background: activeSessionCount > 0 ? "rgba(74, 222, 128, 0.12)" : "rgba(255, 255, 255, 0.04)",
          border: activeSessionCount > 0 ? "1px solid rgba(74, 222, 128, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            backgroundColor: activeSessionCount > 0 ? "#4ade80" : "rgba(235, 235, 245, 0.4)",
            boxShadow: activeSessionCount > 0 ? "0 0 6px #4ade80" : "none",
          }}
        />
        <span
          style={{
            fontSize: "9px",
            fontWeight: 800,
            color: activeSessionCount > 0 ? "#4ade80" : "rgba(235, 235, 245, 0.6)",
            letterSpacing: "0.5px",
          }}
        >
          {activeSessionCount > 0 ? `${activeSessionCount} OFF-SCREEN SESSION(S) ACTIVE` : "SESSION IDLE"}
        </span>
      </div>

      {/* 7. Footer Signature */}
      <div
        style={{
          textAlign: "center",
          fontSize: "10px",
          color: "var(--maru-text-dim)",
          fontWeight: 500,
        }}
      >
        with &lt;3, Maru &amp; Nanami
      </div>
    </div>
  );
};
