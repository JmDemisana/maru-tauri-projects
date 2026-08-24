import React, { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

export interface TitleBarProps {
  title?: string;
  iconSrc?: string;
  transparent?: boolean;
  background?: string;
  draggable?: boolean;
  showMoveMonitor?: boolean;
  onClose?: () => void;
}

// Windows 11 exact title bar token values
const WIN11 = {
  dark: {
    bg: "#181424",
    text: "rgba(255,255,255,0.9)",
    btnHover: "rgba(255,255,255,0.09)",
    btnActive: "rgba(255,255,255,0.06)",
    closeHoverBg: "#c42b1c",
    closeHoverText: "#ffffff",
  },
  light: {
    bg: "#f3f3f3",
    text: "rgba(0,0,0,0.88)",
    btnHover: "rgba(0,0,0,0.06)",
    btnActive: "rgba(0,0,0,0.04)",
    closeHoverBg: "#c42b1c",
    closeHoverText: "#ffffff",
  },
};

export const TitleBar: React.FC<TitleBarProps> = ({
  title = "Maru App",
  iconSrc = "/icon.png",
  transparent = false,
  background,
  draggable = false,
  showMoveMonitor = true,
  onClose,
}) => {
  const [isDark, setIsDark] = useState(
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const appWindow = getCurrentWindow();
  const theme = isDark ? WIN11.dark : WIN11.light;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const onTheme = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", onTheme);
    return () => mq.removeEventListener("change", onTheme);
  }, []);

  const handleMinimize = async () => {
    try {
      await appWindow.minimize();
    } catch (e) {
      console.error("Failed to minimize window:", e);
    }
  };

  const handleMoveMonitor = async () => {
    try {
      await invoke("move_to_next_monitor");
    } catch (e) {
      console.error("Failed to move to next monitor:", e);
    }
  };

  const handleClose = async () => {
    if (onClose) {
      onClose();
    } else {
      try {
        await appWindow.close();
      } catch (e) {
        console.error("Failed to close window:", e);
      }
    }
  };

  const barBg = background || (transparent ? "transparent" : theme.bg);

  return (
    <div
      style={{
        height: "32px",
        minHeight: "32px",
        display: "flex",
        alignItems: "center",
        background: barBg,
        borderBottom: transparent ? "none" : "1px solid rgba(255, 255, 255, 0.06)",
        userSelect: "none",
        WebkitUserSelect: "none",
        flexShrink: 0,
        position: "relative",
        zIndex: 10000,
      }}
    >
      {/* Title & Icon Header Region (Non-draggable by default to prevent Windows Snap resizing) */}
      <div
        {...(draggable ? { "data-tauri-drag-region": "" } : {})}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flex: 1,
          height: "100%",
          paddingLeft: "12px",
          cursor: draggable ? "default" : "default",
          overflow: "hidden",
        }}
      >
        <img
          src={iconSrc}
          alt=""
          style={{
            width: "16px",
            height: "16px",
            objectFit: "contain",
            pointerEvents: "none",
            flexShrink: 0,
          }}
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
        <span
          {...(draggable ? { "data-tauri-drag-region": "" } : {})}
          style={{
            fontSize: "12px",
            color: theme.text,
            fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
            fontWeight: 500,
            letterSpacing: "0.01em",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: "32px",
          }}
        >
          {title}
        </span>
      </div>

      {/* Window controls: Move to Monitor | Minimize | Close */}
      <div style={{ display: "flex", alignItems: "stretch", height: "100%", flexShrink: 0 }}>
        {/* 1. Move to next monitor (Always available to shift monitors safely without dragging) */}
        {showMoveMonitor && (
          <Win11Button
            tooltip="Move to next monitor"
            hoverBg={theme.btnHover}
            activeBg={theme.btnActive}
            textColor={theme.text}
            onClick={handleMoveMonitor}
          >
            {/* Windows Multiple Displays / Monitor Shift Icon */}
            <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
              <path
                d="M5 1.5H9.5C10.0523 1.5 10.5 1.94772 10.5 2.5V7C10.5 7.55228 10.0523 8 9.5 8"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <rect
                x="1.5"
                y="3.5"
                width="6.5"
                height="4.5"
                rx="0.75"
                stroke="currentColor"
                strokeWidth="1"
              />
              <line
                x1="1"
                y1="9.5"
                x2="8.5"
                y2="9.5"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
            </svg>
          </Win11Button>
        )}

        {/* 2. Minimize */}
        <Win11Button
          tooltip="Minimize"
          hoverBg={theme.btnHover}
          activeBg={theme.btnActive}
          textColor={theme.text}
          onClick={handleMinimize}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
            <rect y="0.5" width="10" height="1" fill="currentColor" />
          </svg>
        </Win11Button>

        {/* 3. Close */}
        <Win11Button
          tooltip="Close"
          hoverBg={theme.closeHoverBg}
          activeBg="#b3261e"
          textColor={theme.text}
          hoverTextColor={theme.closeHoverText}
          onClick={handleClose}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M0 0.707107L4.29289 5L0 9.29289L0.707107 10L5 5.70711L9.29289 10L10 9.29289L5.70711 5L10 0.707107L9.29289 0L5 4.29289L0.707107 0L0 0.707107Z"
              fill="currentColor"
            />
          </svg>
        </Win11Button>
      </div>
    </div>
  );
};

interface Win11ButtonProps {
  children: React.ReactNode;
  tooltip?: string;
  hoverBg?: string;
  activeBg?: string;
  textColor?: string;
  hoverTextColor?: string;
  onClick?: () => void;
}

const Win11Button: React.FC<Win11ButtonProps> = ({
  children,
  tooltip,
  hoverBg = "rgba(255,255,255,0.09)",
  activeBg = "rgba(255,255,255,0.06)",
  textColor = "rgba(255,255,255,0.9)",
  hoverTextColor,
  onClick,
}) => {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setActive(false);
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        width: "46px",
        height: "32px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        outline: "none",
        padding: 0,
        margin: 0,
        cursor: "default",
        background: active ? activeBg : hovered ? hoverBg : "transparent",
        color: hovered && hoverTextColor ? hoverTextColor : textColor,
        transition: "background-color 0.1s ease, color 0.1s ease",
        WebkitAppRegion: "no-drag",
      }}
    >
      {children}
    </button>
  );
};

export default TitleBar;
