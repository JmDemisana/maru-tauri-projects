import React from "react";

interface EqualizerHUDProps {
  isPlaying: boolean;
}

export const EqualizerHUD: React.FC<EqualizerHUDProps> = ({ isPlaying }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "3.5px",
        height: "22px",
        padding: "2px",
      }}
    >
      {[
        { delay: "0s", dur: "0.85s", color: "#ff71a2" },
        { delay: "0.2s", dur: "0.65s", color: "#a78bfa" },
        { delay: "0.1s", dur: "0.95s", color: "#70a5ff" },
        { delay: "0.3s", dur: "0.75s", color: "#ff71a2" },
      ].map((bar, i) => (
        <span
          key={i}
          style={{
            width: "3.5px",
            borderRadius: "999px",
            backgroundColor: bar.color,
            boxShadow: isPlaying ? `0 0 8px ${bar.color}` : "none",
            height: isPlaying ? "100%" : "4px",
            animation: isPlaying
              ? `eqBounce ${bar.dur} infinite ease-in-out ${bar.delay}`
              : "none",
            transition: "all 200ms ease",
          }}
        />
      ))}
    </div>
  );
};
