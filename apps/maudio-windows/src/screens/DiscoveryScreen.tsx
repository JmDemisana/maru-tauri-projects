import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RecommendedTrackItem } from "../types";
import { Sparkles, LayoutList, LayoutGrid, ChevronRight, Disc, RefreshCw, Loader2 } from "lucide-react";
import { getRecommendations } from "../utils/LastFmRecommendationsEngine";

interface DiscoveryScreenProps {
  username: string;
  onSongClick: (item: RecommendedTrackItem) => void;
}

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({ username, onSongClick }) => {
  const [isGridView, setIsGridView] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedTrackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchFeed = async () => {
    setIsLoading(true);
    setPage(1);
    try {
      const items = await getRecommendations(username, "ALL", 1);
      setRecommendations(items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (isLoading || isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const newItems = await getRecommendations(username, "ALL", nextPage);
      setPage(nextPage);
      setRecommendations((prev) => {
        const existingKeys = new Set(prev.map((i) => `${i.artist.toLowerCase()} - ${i.title.toLowerCase()}`));
        const filtered = newItems.filter((i) => !existingKeys.has(`${i.artist.toLowerCase()} - ${i.title.toLowerCase()}`));
        return [...prev, ...filtered];
      });
    } catch (e) {
      console.error("Failed to load more recommendations:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [username]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + clientHeight) < 450) {
      loadMore();
    }
  };

  return (
    <motion.div
      ref={containerRef}
      onScroll={handleScroll}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 24px 36px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        maxWidth: "1100px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* 1. Header Row */}
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
            Discovery Feed ({recommendations.length} Tracks)
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

      {/* 2. Loading Spinner */}
      {isLoading && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 0",
            gap: "14px",
          }}
        >
          <RefreshCw size={36} className="animate-spin" color="var(--maru-accent-pink)" />
          <span style={{ fontSize: "13px", color: "rgba(235, 235, 245, 0.72)", fontWeight: 600 }}>
            Curating personalized recommendations...
          </span>
        </div>
      )}

      {/* 3. Empty State */}
      {!isLoading && recommendations.length === 0 && (
        <div
          className="glass-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            marginTop: "24px",
          }}
        >
          <Disc size={40} color="var(--maru-accent-pink)" />
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#f4f4f9fa" }}>
            No Recommendations Available
          </div>
          <div style={{ fontSize: "12px", color: "rgba(235, 235, 245, 0.72)", maxWidth: "420px" }}>
            Start scrobbling your music or connect your Last.fm account to get tailored song discoveries!
          </div>
        </div>
      )}

      {/* 4. Track List View */}
      {!isLoading && !isGridView && recommendations.length > 0 && (
        <motion.div
          layout
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {recommendations.map((item, idx) => (
            <motion.div
              key={`${item.artist}-${item.title}-${idx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: (idx % 12) * 0.02 }}
              whileHover={{ scale: 1.008, x: 2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSongClick(item)}
              className="glass-card"
              style={{
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                cursor: "pointer",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Artwork Box */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
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

              {/* Track Title, Artist, and Reason */}
              <div style={{ flex: 1, overflow: "hidden" }}>
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
                    fontSize: "11.5px",
                    color: "rgba(235, 235, 245, 0.72)",
                    marginTop: "2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.artist} {item.album ? `• ${item.album}` : ""}
                </div>

                {item.reason && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--maru-accent-pink)",
                      fontWeight: 600,
                      marginTop: "3px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✨ {item.reason}
                  </div>
                )}
              </div>

              <ChevronRight size={18} color="rgba(235, 235, 245, 0.4)" />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* 5. Track Grid View */}
      {!isLoading && isGridView && recommendations.length > 0 && (
        <motion.div
          layout
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          {recommendations.map((item, idx) => (
            <motion.div
              key={`${item.artist}-${item.title}-${idx}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, delay: (idx % 12) * 0.02 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSongClick(item)}
              className="glass-card"
              style={{
                borderRadius: "14px",
                overflow: "hidden",
                cursor: "pointer",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                flexDirection: "column",
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
                      background: "rgba(22, 16, 28, 0.88)",
                      border: "1px solid rgba(232, 93, 159, 0.6)",
                      borderRadius: "24px",
                      padding: "3px 8px",
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

      {/* 6. Infinite Scroll Loading Indicator & Load More Action */}
      {!isLoading && recommendations.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0 10px" }}>
          {isLoadingMore ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "24px",
                background: "rgba(232, 93, 159, 0.15)",
                border: "1px solid rgba(232, 93, 159, 0.4)",
                color: "var(--maru-accent-pink)",
                fontSize: "11px",
                fontWeight: 800,
              }}
            >
              <RefreshCw size={14} className="animate-spin" color="var(--maru-accent-pink)" />
              <span>DISCOVERING MORE TRACKS...</span>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={loadMore}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 20px",
                borderRadius: "24px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "rgba(235, 235, 245, 0.8)",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Sparkles size={13} color="var(--maru-accent-pink)" />
              <span>LOAD MORE DISCOVERIES</span>
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
};
