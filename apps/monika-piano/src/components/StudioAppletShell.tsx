import React from "react";
import { AppletToolbar } from "./AppletToolbar";

export type StudioAppletShellProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  filterSlot?: React.ReactNode;
  viewModesSlot?: React.ReactNode;
  previewSlot: React.ReactNode;
  controlsSlot: React.ReactNode;
  presetBarSlot?: React.ReactNode;
  exportBarSlot?: React.ReactNode;
  previewRatio?: string; // e.g. "360px" or "1.2fr"
  controlsRatio?: string; // e.g. "1fr"
  fullHeight?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

export const StudioAppletShell: React.FC<StudioAppletShellProps> = ({
  title,
  subtitle,
  actionsSlot,
  filterSlot,
  viewModesSlot,
  previewSlot,
  controlsSlot,
  presetBarSlot,
  exportBarSlot,
  previewRatio = "380px",
  controlsRatio = "1fr",
  fullHeight = true,
  style,
  className,
}) => {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        height: "100%",
        margin: 0,
        padding: "0.65rem 1rem",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        backgroundColor: "#0b0d14",
        ...style,
      }}
      className={`studio-applet-shell ${className || ""}`}
    >
      <div style={{ flexShrink: 0 }}>
        <AppletToolbar
          title={title}
          subtitle={subtitle}
          actionsSlot={actionsSlot}
          filterSlot={filterSlot}
          viewModesSlot={viewModesSlot}
        />
      </div>

      {presetBarSlot && (
        <div style={{ marginBottom: "0.65rem", flexShrink: 0 }}>
          {presetBarSlot}
        </div>
      )}

      {/* 2-Pane Workstation Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${previewRatio} ${controlsRatio}`,
          gap: "0.85rem",
          alignItems: "stretch",
          flex: 1,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
        }}
        className="studio-workstation-grid"
      >
        {/* Left / Top: Preview Pane (Piano, Transport, Metadata, Actions) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            minWidth: 0,
            minHeight: 0,
            height: "100%",
            overflowY: "auto",
            paddingRight: "2px",
          }}
          className="studio-preview-pane"
        >
          {previewSlot}
        </div>

        {/* Right / Bottom: Controls Deck (Sequencer & Lyrics Editor) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            minWidth: 0,
            minHeight: 0,
            height: "100%",
            overflowY: "hidden",
          }}
          className="studio-controls-pane"
        >
          {controlsSlot}
        </div>
      </div>

      {exportBarSlot && (
        <div style={{ marginTop: "0.85rem", flexShrink: 0 }} className="studio-export-bar">
          {exportBarSlot}
        </div>
      )}
    </div>
  );
};

export default StudioAppletShell;
