import React from "react";

export interface LoadingDotsProps {
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  dotColor?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  label = "Working on it...",
  className = "",
  style,
  dotColor,
}) => {
  return (
    <div
      className={`win-dots-container ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.9rem",
        color: "var(--theme-text-muted, #94a3b8)",
        ...style,
      }}
    >
      <div className="win-dots-track">
        <span style={dotColor ? { backgroundColor: dotColor } : undefined} />
        <span style={dotColor ? { backgroundColor: dotColor } : undefined} />
        <span style={dotColor ? { backgroundColor: dotColor } : undefined} />
        <span style={dotColor ? { backgroundColor: dotColor } : undefined} />
        <span style={dotColor ? { backgroundColor: dotColor } : undefined} />
      </div>
      {label && (
        <div
          style={{
            fontSize: "0.92rem",
            lineHeight: 1.6,
            fontWeight: 500,
            color: "var(--theme-text-muted, #94a3b8)",
            fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

export default LoadingDots;
