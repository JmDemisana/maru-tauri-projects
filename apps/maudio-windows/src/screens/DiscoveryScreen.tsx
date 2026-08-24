import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RecommendedTrackItem } from "../types";
import { Sparkles, LayoutList, LayoutGrid, ChevronRight, Disc, RefreshCw } from "lucide-react";
import { getRecommendations } from "../utils/LastFmRecommendationsEngine";

interface DiscoveryScreenProps {
  username: string;
  onSongClick: (item: RecommendedTrackItem) => void;
}

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({ username, onSongClick }) => {
  const [isGridView, setIsGridView] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedTrackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const items = await getRecommendations(username);
      setRecommendations(items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [username]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 24px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        maxWidth: "1100px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* 1. Header (Matching Kotlin Row) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={15} color="var(--maru-accent-pink)" />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: "var(--maru-accent-pink)",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
            }}
          >
            Discovery Feed
          </span>
        </div>

        {/* Refresh & LIST / GRID Toggle Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchFeed}
            disabled={isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "24px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.094)",
              color: "#f4f4f9fa",
              cursor: "pointer",
              fontSize: "9.5px",
              fontWeight: 800,
            }}
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} color="var(--maru-accent-pink)" />
            <span>REFRESH</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsGridView(!isGridView)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "24px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.094)",
              color: "#f4f4f9fa",
              cursor: "pointer",
              fontSize: "9.5px",
              fontWeight: 800,
            }}
          >
            {isGridView ? (
              <LayoutList size={14} color="var(--maru-accent-pink)" />
            ) : (
              <LayoutGrid size={14} color="var(--maru-accent-pink)" />
            )}
            <span>{isGridView ? "LIST" : "GRID"}</span>
          </motion.button>
        </div>
      </div>

      {/* 2. Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            height: "280px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
          }}
        >
          <RefreshCw size={32} className="animate-spin" color="var(--maru-accent-pink)" />
          <span style={{ fontSize: "13px", color: "rgba(235, 235, 245, 0.72)" }}>
            Curating personalized recommendations from Last.fm...
          </span>
        </motion.div>
      )}

      {/* 3. Empty State */}
      {!isLoading && recommendations.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card"
          style={{
            padding: "32px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            textAlign: "center",
          }}
        >
          <Disc size={36} color="rgba(235, 235, 245, 0.5)" />
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#f4f4f9fa" }}>
            No recommendations found
          </div>
          <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.6)" }}>
            Scrobble some music or change your Last.fm username in Profile!
          </div>
        </motion.div>
      )}

      {/* 4. Recommendation Cards (List or Grid) */}
      {!isLoading && !isGridView && (
        <motion.div layout style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <AnimatePresence>
            {recommendations.map((item, idx) => (
              <motion.div
                key={`${item.title}-${idx}`}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18, delay: Math.min(idx * 0.02, 0.2) }}
                whileHover={{ scale: 1.008, x: 2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSongClick(item)}
                className="glass-card"
                style={{
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  cursor: "pointer",
                  transition: "background 140ms ease, border 140ms ease",
                }}
              >
                {/* Artwork Box */}
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.1)",
                    overflow: "hidden",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.effectiveArtworkUrl ? (
                    <img
                      src={item.effectiveArtworkUrl}
                      alt={item.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://lastfm.freetls.fastly.net/i/u/64s/4128a6eb29f94943c9d206c08e625904.png";
                      }}
                    />
                  ) : (
                    <Disc size={24} color="var(--maru-accent-pink)" />
                  )}
                </div>

                {/* Title & Contextual Reason */}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  {item.reason && (
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "var(--maru-accent-pink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginBottom: "2px",
                      }}
                    >
                      {item.reason}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 700,
                      color: "#f4f4f9fa",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "rgba(235, 235, 245, 0.72)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: "1px",
                    }}
                  >
                    {item.artist}
                  </div>
                </div>

                <ChevronRight size={20} color="var(--maru-accent-pink)" />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Grid Mode */}
      {!isLoading && isGridView && (
        <motion.div layout style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
          {recommendations.map((item, idx) => (
            <motion.div
              key={`${item.title}-${idx}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, delay: Math.min(idx * 0.02, 0.2) }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSongClick(item)}
              className="glass-card"
              style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                cursor: "pointer",
                borderRadius: "12px",
              }}
            >
              <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "rgba(255,255,255,0.08)" }}>
                {item.effectiveArtworkUrl ? (
                  <img
                    src={item.effectiveArtworkUrl}
                    alt={item.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://lastfm.freetls.fastly.net/i/u/300x300/4128a6eb29f94943c9d206c08e625904.png";
                    }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Disc size={36} color="var(--maru-accent-pink)" />
                  </div>
                )}

                {item.reason && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      right: "8px",
                      background: "rgba(22, 16, 38, 0.85)",
                      border: "1px solid rgba(232, 93, 159, 0.6)",
                      borderRadius: "24px",
                      padding: "3px 7px",
                      fontSize: "8.5px",
                      fontWeight: 700,
                      color: "var(--maru-accent-pink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.reason}
                  </div>
                )}
              </div>

              <div style={{ padding: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#f4f4f9fa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "11.5px", color: "rgba(235, 235, 245, 0.72)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.artist}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};
