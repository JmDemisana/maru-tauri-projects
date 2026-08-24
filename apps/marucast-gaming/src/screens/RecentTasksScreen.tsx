import React from "react";
import { motion } from "framer-motion";
import { RecentTask, AppSession } from "../types";
import { AppIcon } from "../components/AppIcon";
import {
  Layers,
  Play,
  XCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface RecentTasksScreenProps {
  tasks: RecentTask[];
  sessions: AppSession[];
  onRefresh: () => void;
  onLaunchTask: (task: RecentTask) => void;
  onStopSession: (sessionId: string) => void;
  onCloseTask: (packageName: string) => void;
  onCloseAllTasks: () => void;
  isLoading: boolean;
  deviceSerial?: string;
}

export const RecentTasksScreen: React.FC<RecentTasksScreenProps> = ({
  tasks,
  sessions,
  onRefresh,
  onLaunchTask,
  onStopSession,
  onCloseTask,
  onCloseAllTasks,
  isLoading,
  deviceSerial,
}) => {
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
          marginBottom: "24px",
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
            <Layers size={12} />
            <span>ACTIVE TASKS &amp; WINDOWS</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px" }}>
            Recent Android Tasks
          </h1>
          <p style={{ fontSize: "13px", color: "var(--maru-text-muted)", marginTop: "4px" }}>
            Resume background tasks in off-screen windows or terminate them to free memory.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {tasks.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onCloseAllTasks}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "10px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#f87171",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Trash2 size={14} />
              <span>Close All Apps</span>
            </motion.button>
          )}

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
            <span>{isLoading ? "Querying..." : "Scan Recents"}</span>
          </motion.button>
        </div>
      </div>

      {/* 1. Active Off-Screen Sessions */}
      {sessions.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px", color: "#4ade80" }}>
            Currently Running Windows ({sessions.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {sessions.map((sess) => (
              <div
                key={sess.session_id}
                style={{
                  background: "rgba(74, 222, 128, 0.08)",
                  border: "1px solid rgba(74, 222, 128, 0.4)",
                  borderRadius: "14px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <AppIcon packageName={sess.package_name} size={42} />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                      {sess.app_name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--maru-text-dim)", marginTop: "2px" }}>
                      {sess.package_name} &bull; Audio Mode: {sess.audio_mode.toUpperCase()}
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStopSession(sess.session_id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.5)",
                    color: "#f87171",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <XCircle size={14} />
                  <span>Close Window</span>
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Recent Tasks from Phone */}
      <div>
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px", color: "#fff" }}>
          Recent Phone Tasks
        </h3>

        {tasks.length === 0 ? (
          <div
            style={{
              padding: "24px",
              borderRadius: "14px",
              background: "var(--maru-surface-card)",
              border: "1px solid var(--maru-border)",
              textAlign: "center",
              color: "var(--maru-text-dim)",
              fontSize: "13px",
            }}
          >
            No recent background activities detected.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
            {tasks.map((task) => (
              <div
                key={task.package_name}
                style={{
                  background: "var(--maru-surface-card)",
                  border: "1px solid var(--maru-border)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden", flex: 1 }}>
                  <AppIcon packageName={task.package_name} size={38} deviceSerial={deviceSerial} />
                  <div style={{ overflow: "hidden", flex: 1 }}>
                    <div
                      style={{
                        fontSize: "13.5px",
                        fontWeight: 700,
                        color: "#fff",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={task.label}
                    >
                      {task.label}
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        color: "var(--maru-text-dim)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={task.package_name}
                    >
                      {task.package_name}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onCloseTask(task.package_name)}
                    title="Force Stop App on Phone"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 8px",
                      borderRadius: "8px",
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      color: "#f87171",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <XCircle size={13} />
                    <span style={{ marginLeft: "4px" }}>Close</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onLaunchTask(task)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "rgba(232, 93, 159, 0.2)",
                      border: "1px solid rgba(232, 93, 159, 0.5)",
                      color: "var(--maru-accent-pink)",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Play size={11} fill="currentColor" />
                    <span>Resume</span>
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
