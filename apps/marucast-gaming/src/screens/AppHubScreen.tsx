import React, { useState } from "react";
import { motion } from "framer-motion";
import { AndroidApp, AudioRoutingMode } from "../types";
import { AppIcon } from "../components/AppIcon";
import {
  Search,
  Play,
  Package,
  Sparkles,
  RefreshCw,
  Volume2,
  Trash2,
} from "lucide-react";

interface AppHubScreenProps {
  apps: AndroidApp[];
  isLoading: boolean;
  onRefresh: () => void;
  onLaunchApp: (app: AndroidApp) => void;
  onUninstallApp: (app: AndroidApp) => void;
  activePackageNames: string[];
  audioMode: AudioRoutingMode;
  deviceSerial?: string;
}

export const AppHubScreen: React.FC<AppHubScreenProps> = ({
  apps,
  isLoading,
  onRefresh,
  onLaunchApp,
  onUninstallApp,
  activePackageNames,
  audioMode,
  deviceSerial,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Games", "Media", "Apps"];

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.package_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getAudioBadgeText = () => {
    switch (audioMode) {
      case "phone":
        return "Audio on Host Phone";
      case "both":
        return "Audio Dual Host + PC";
      case "pc":
      default:
        return "Audio Streamed to PC";
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "24px 32px",
        overflowY: "auto",
        background: "radial-gradient(ellipse at top left, rgba(232, 93, 159, 0.08) 0%, transparent 60%)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "20px",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "20px",
              background: "rgba(232, 93, 159, 0.14)",
              border: "1px solid rgba(232, 93, 159, 0.3)",
              color: "var(--maru-accent-pink)",
              fontSize: "11px",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            <Sparkles size={12} />
            <span>OFF-SCREEN REMOTE HUB</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px" }}>
            Installed Apps &amp; Games
          </h1>
          <p style={{ fontSize: "13px", color: "var(--maru-text-muted)", marginTop: "4px" }}>
            Launch Android apps directly into isolated, maximized desktop windows or manage installations.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div
            style={{
              fontSize: "11.5px",
              padding: "6px 12px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--maru-border)",
              color: "var(--maru-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Volume2 size={14} color="var(--maru-accent-pink)" />
            <span>{getAudioBadgeText()}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onRefresh}
            disabled={isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "10px",
              background: "rgba(112, 165, 255, 0.15)",
              border: "1px solid rgba(112, 165, 255, 0.4)",
              color: "var(--maru-accent-blue)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={isLoading ? "spin" : ""} />
            <span>{isLoading ? "Querying..." : "Scan Apps"}</span>
          </motion.button>
        </div>
      </div>

      {/* Controls Bar: Search + Category Chips */}
      <div
        style={{
          display: "flex",
          gap: "14px",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid var(--maru-border)",
            borderRadius: "12px",
            padding: "10px 14px",
          }}
        >
          <Search size={16} color="var(--maru-text-dim)" />
          <input
            type="text"
            placeholder="Search games, music, or app names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: "13px",
              width: "100%",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: isSelected
                    ? "1px solid rgba(232, 93, 159, 0.6)"
                    : "1px solid var(--maru-border)",
                  background: isSelected
                    ? "rgba(232, 93, 159, 0.2)"
                    : "rgba(255, 255, 255, 0.03)",
                  color: isSelected ? "var(--maru-accent-pink)" : "var(--maru-text-muted)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* App Cards Grid */}
      {filteredApps.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            color: "var(--maru-text-dim)",
          }}
        >
          <Package size={48} strokeWidth={1.5} />
          <p style={{ fontSize: "14px", fontWeight: 500 }}>
            {isLoading ? "Querying device activities over ADB..." : "No apps matched your filter or no device connected."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: "14px",
            alignContent: "start",
          }}
        >
          {filteredApps.map((app) => {
            const isRunning = activePackageNames.includes(app.package_name);
            return (
              <motion.div
                key={app.package_name}
                whileHover={{ y: -3 }}
                style={{
                  background: "var(--maru-surface-card)",
                  border: isRunning
                    ? "1px solid rgba(74, 222, 128, 0.5)"
                    : "1px solid var(--maru-border)",
                  borderRadius: "14px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                  position: "relative",
                  backdropFilter: "blur(12px)",
                  boxShadow: isRunning ? "0 0 16px rgba(74, 222, 128, 0.12)" : "none",
                }}
              >
                {/* Top Info */}
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <AppIcon
                    packageName={app.package_name}
                    category={app.category}
                    size={42}
                    deviceSerial={deviceSerial}
                  />

                  <div style={{ overflow: "hidden", flex: 1 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#fff",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={app.label}
                    >
                      {app.label}
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: "var(--maru-text-dim)",
                        marginTop: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={app.package_name}
                    >
                      {app.package_name}
                    </div>
                  </div>
                </div>

                {/* Bottom Action */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "10px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: app.is_game
                        ? "var(--maru-accent-purple)"
                        : app.category === "Media"
                        ? "var(--maru-accent-pink)"
                        : "var(--maru-accent-blue)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {app.category}
                  </span>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to uninstall "${app.label}" from your phone?`)) {
                          onUninstallApp(app);
                        }
                      }}
                      title="Uninstall App from Phone"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px",
                        borderRadius: "8px",
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#f87171",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={13} />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onLaunchApp(app)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: isRunning
                          ? "rgba(74, 222, 128, 0.2)"
                          : "rgba(232, 93, 159, 0.2)",
                        border: isRunning
                          ? "1px solid rgba(74, 222, 128, 0.5)"
                          : "1px solid rgba(232, 93, 159, 0.5)",
                        color: isRunning ? "#4ade80" : "var(--maru-accent-pink)",
                        fontSize: "11.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>{isRunning ? "Running" : "Launch"}</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
