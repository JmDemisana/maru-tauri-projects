import React from "react";
import { NavigationScreen } from "../types";
import { Compass, Radio, Cast, Settings } from "lucide-react";

interface BottomNavProps {
  currentScreen: NavigationScreen;
  onSelectScreen: (screen: NavigationScreen) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onSelectScreen }) => {
  const tabs = [
    { id: NavigationScreen.DISCOVERY, label: "Discovery", icon: Compass, color: "#ff71a2" },
    { id: NavigationScreen.SCROBBLING, label: "Scrobbler", icon: Radio, color: "#70a5ff" },
    { id: NavigationScreen.MARUCAST, label: "Receiver", icon: Cast, color: "#a78bfa" },
    { id: NavigationScreen.SETTINGS, label: "Settings", icon: Settings, color: "#94a3b8" },
  ];

  return (
    <div
      style={{
        height: "62px",
        background: "rgba(10, 14, 26, 0.88)",
        backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 8px",
        zIndex: 50,
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentScreen === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectScreen(tab.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: "10px",
              color: isActive ? tab.color : "rgba(245, 248, 255, 0.45)",
              transition: "all 150ms ease",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={19} />
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "-5px",
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: tab.color,
                    boxShadow: `0 0 6px ${tab.color}`,
                  }}
                />
              )}
            </div>
            <span style={{ fontSize: "10.5px", fontWeight: isActive ? 700 : 500 }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
