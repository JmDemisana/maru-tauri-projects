import React, { useState } from "react";
import { RefreshCw } from "lucide-react";

interface NamiRecScreenProps {
  username: string;
}

export const NamiRecScreen: React.FC<NamiRecScreenProps> = ({ username }) => {
  const [isLoading, setIsLoading] = useState(true);
  const targetUrl = `https://maruchansquigle.vercel.app/month-in-songs/webview?user=${encodeURIComponent(
    username || "JmDemisana",
  )}`;

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#050507",
        overflow: "hidden",
      }}
    >
      <iframe
        src={targetUrl}
        title="NamiRec Month in Songs"
        onLoad={() => setIsLoading(false)}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          background: "#0b0813",
        }}
      />

      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(11, 8, 19, 0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            zIndex: 10,
          }}
        >
          <RefreshCw size={36} className="animate-spin" color="var(--maru-accent-pink)" />
          <span style={{ fontSize: "13px", color: "rgba(235, 235, 245, 0.72)" }}>
            Opening Nami's Month in Songs...
          </span>
        </div>
      )}
    </div>
  );
};
