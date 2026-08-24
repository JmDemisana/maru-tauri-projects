import React from "react";
import { motion } from "framer-motion";
import { AudioRoutingMode, AdbDevice } from "../types";
import {
  Volume2,
  Smartphone,
  Laptop,
  Radio,
  Keyboard,
  Monitor,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Sliders,
} from "lucide-react";

interface ControlsScreenProps {
  audioMode: AudioRoutingMode;
  onSelectAudioMode: (mode: AudioRoutingMode) => void;
  dpi: number;
  onSelectDpi: (dpi: number) => void;
  activeDevice: AdbDevice | null;
}

export const ControlsScreen: React.FC<ControlsScreenProps> = ({
  audioMode,
  onSelectAudioMode,
  dpi,
  onSelectDpi,
  activeDevice,
}) => {
  const supportsMultiAudio = activeDevice ? activeDevice.supports_multi_audio : true;

  const audioOptions = [
    {
      id: "phone" as AudioRoutingMode,
      title: "Play Audio on Host Device",
      subtitle: "Sound plays directly on your phone speakers or connected Bluetooth headphones.",
      icon: Smartphone,
      accent: "var(--maru-accent-pink)",
      badge: "Zero Latency",
      disabled: false,
    },
    {
      id: "pc" as AudioRoutingMode,
      title: "Play Audio on This Device",
      subtitle: "Streams game audio losslessly to your Windows PC output over ADB.",
      icon: Laptop,
      accent: "var(--maru-accent-blue)",
      badge: "PC Output",
      disabled: false,
    },
    {
      id: "both" as AudioRoutingMode,
      title: "Play Audio on Both Devices",
      subtitle: "Duplicates audio to play on both your phone and PC simultaneously.",
      icon: Radio,
      accent: "var(--maru-accent-purple)",
      badge: supportsMultiAudio ? "Android 13+ Supported" : "Requires Android 13+",
      disabled: !supportsMultiAudio,
    },
  ];

  const dpiPresets = [
    {
      value: 240,
      title: "240 DPI — Widescreen Tablet UI (sw720dp)",
      tag: "Recommended for Media & Apps",
      desc: "Triggers full Android tablet / desktop DeX layouts (side navigation rails, multi-column video grids in YouTube, wide players).",
      accent: "var(--maru-accent-pink)",
    },
    {
      value: 280,
      title: "280 DPI — Compact Tablet UI (sw600dp)",
      tag: "Balanced Tablet",
      desc: "Compact 8-inch tablet layout with slightly larger text and buttons for relaxed viewing.",
      accent: "var(--maru-accent-purple)",
    },
    {
      value: 340,
      title: "340 DPI — Large Touch UI (sw500dp)",
      tag: "Action Games",
      desc: "Larger touch targets and UI controls; ideal for fast-paced arcade or rhythm games.",
      accent: "var(--maru-accent-blue)",
    },
    {
      value: 420,
      title: "420 DPI — Phone UI (sw411dp)",
      tag: "Fixed Mobile Games",
      desc: "Standard mobile phone layout; loads 3x xxhdpi assets for games with fixed phone-only UI designs.",
      accent: "#4ade80",
    },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "24px 32px",
        overflowY: "auto",
        background: "radial-gradient(ellipse at top left, rgba(192, 132, 252, 0.08) 0%, transparent 60%)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "20px",
            background: "rgba(192, 132, 252, 0.14)",
            border: "1px solid rgba(192, 132, 252, 0.3)",
            color: "var(--maru-accent-purple)",
            fontSize: "11px",
            fontWeight: 700,
            marginBottom: "8px",
          }}
        >
          <Volume2 size={12} />
          <span>AUDIO, DPI &amp; KEYMAP PREFERENCES</span>
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px" }}>
          Game Controls &amp; Display Density
        </h1>
        <p style={{ fontSize: "13px", color: "var(--maru-text-muted)", marginTop: "4px" }}>
          Configure sound playback routing, display density (DPI / Tablet UI modes), and keyboard navigation shortcuts.
        </p>
      </div>

      {/* 1. DISPLAY DENSITY (DPI) & TABLET UI SELECTOR */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
            <Monitor size={17} color="var(--maru-accent-pink)" />
            <span>Display Density &amp; UI Layout (DPI)</span>
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11.5px", color: "var(--maru-text-dim)" }}>Custom DPI:</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--maru-border)",
                borderRadius: "8px",
                padding: "2px 8px",
              }}
            >
              <input
                type="number"
                min={120}
                max={640}
                step={10}
                value={dpi}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 100 && val <= 800) {
                    onSelectDpi(val);
                  }
                }}
                style={{
                  width: "55px",
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              />
              <span style={{ fontSize: "10.5px", color: "var(--maru-text-dim)" }}>DPI</span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
          {dpiPresets.map((preset) => {
            const isSelected = dpi === preset.value;
            return (
              <motion.div
                key={preset.value}
                whileHover={{ y: -2 }}
                onClick={() => onSelectDpi(preset.value)}
                style={{
                  background: isSelected
                    ? "rgba(255, 255, 255, 0.07)"
                    : "var(--maru-surface-card)",
                  border: isSelected
                    ? `1px solid ${preset.accent}`
                    : "1px solid var(--maru-border)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? `0 0 16px rgba(232, 93, 159, 0.15)` : "none",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#fff" }}>
                      {preset.title}
                    </span>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: "10px",
                        background: `rgba(255, 255, 255, 0.08)`,
                        color: preset.accent,
                        textTransform: "uppercase",
                      }}
                    >
                      {preset.tag}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--maru-text-dim)", lineHeight: 1.4 }}>
                    {preset.desc}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px" }}>
                  <span style={{ fontSize: "10px", color: isSelected ? preset.accent : "var(--maru-text-dim)", fontWeight: 600 }}>
                    {isSelected ? "Active Layout Mode" : "Click to Select"}
                  </span>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      border: isSelected ? `4px solid ${preset.accent}` : "2px solid var(--maru-text-dim)",
                      background: isSelected ? "#fff" : "transparent",
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 2. AUDIO ROUTING SECTION */}
      <div style={{ marginBottom: "28px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
          <Volume2 size={17} color="var(--maru-accent-blue)" />
          <span>Sound Playback Routing</span>
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {audioOptions.map((opt) => {
            const isSelected = audioMode === opt.id;
            const Icon = opt.icon;
            return (
              <motion.div
                key={opt.id}
                whileHover={opt.disabled ? {} : { x: 3 }}
                onClick={() => {
                  if (!opt.disabled) onSelectAudioMode(opt.id);
                }}
                style={{
                  background: isSelected
                    ? "rgba(255, 255, 255, 0.06)"
                    : "var(--maru-surface-card)",
                  border: isSelected
                    ? `1px solid ${opt.accent}`
                    : "1px solid var(--maru-border)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: opt.disabled ? "not-allowed" : "pointer",
                  opacity: opt.disabled ? 0.45 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      background: `rgba(${isSelected ? "255,255,255,0.08" : "255,255,255,0.03"})`,
                      border: `1px solid ${isSelected ? opt.accent : "var(--maru-border)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: opt.accent,
                    }}
                  >
                    <Icon size={18} />
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#fff" }}>
                        {opt.title}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background: "rgba(255, 255, 255, 0.06)",
                          color: opt.accent,
                        }}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--maru-text-dim)", marginTop: "2px" }}>
                      {opt.subtitle}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: isSelected ? `4px solid ${opt.accent}` : "2px solid var(--maru-text-dim)",
                    background: isSelected ? "#fff" : "transparent",
                    transition: "all 0.15s ease",
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        {!supportsMultiAudio && (
          <div
            style={{
              marginTop: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11.5px",
              color: "var(--maru-accent-pink)",
            }}
          >
            <AlertCircle size={14} />
            <span>Multi-device audio duplication is disabled because connected device is below Android 13.</span>
          </div>
        )}
      </div>

      {/* 3. KEYBOARD MAPPING SECTION */}
      <div style={{ marginBottom: "28px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
          <Keyboard size={17} color="var(--maru-accent-purple)" />
          <span>Keyboard Shortcuts</span>
        </h3>

        <div
          style={{
            background: "var(--maru-surface-card)",
            border: "1px solid var(--maru-border)",
            borderRadius: "14px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Shortcut 1: Shift+Space for Back */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  background: "rgba(112, 165, 255, 0.15)",
                  border: "1px solid rgba(112, 165, 255, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--maru-accent-blue)",
                }}
              >
                <Keyboard size={16} />
              </div>
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#fff" }}>
                  Android Back Action
                </div>
                <div style={{ fontSize: "11px", color: "var(--maru-text-dim)" }}>
                  Navigate back inside any remote game or app with your left hand.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <kbd
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Shift
              </kbd>
              <span style={{ color: "var(--maru-text-dim)", fontSize: "12px" }}>+</span>
              <kbd
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Space
              </kbd>
            </div>
          </div>

          {/* Shortcut 2: Alt+Q for Quick Exit */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f87171",
                }}
              >
                <Keyboard size={16} />
              </div>
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#fff" }}>
                  Exit Fullscreen Window
                </div>
                <div style={{ fontSize: "11px", color: "var(--maru-text-dim)" }}>
                  Instantly close the fullscreen cast window and return to desktop.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <kbd
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Alt
              </kbd>
              <span style={{ color: "var(--maru-text-dim)", fontSize: "12px" }}>+</span>
              <kbd
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Q
              </kbd>
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.025)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              fontSize: "11px",
              color: "var(--maru-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={13} color="#4ade80" />
            <span>Shortcuts are active globally across all borderless gaming and media windows.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
