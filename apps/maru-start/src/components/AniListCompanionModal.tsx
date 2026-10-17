import React, { useState, useEffect } from "react";
import { X, ExternalLink, Plus, Play, Sparkles, RefreshCw } from "lucide-react";

interface AniListEntry {
  id: number;
  progress: number;
  media: {
    id: number;
    title: {
      userPreferred: string;
      english: string | null;
      romaji: string | null;
    };
    episodes: number | null;
    coverImage: {
      large: string;
      medium: string;
    };
    bannerImage: string | null;
    status: string;
    genres: string[];
    averageScore: number | null;
  };
}

interface AniListCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchUrl: (url: string) => void;
}

export const AniListCompanionModal: React.FC<AniListCompanionModalProps> = ({
  isOpen,
  onClose,
  onLaunchUrl,
}) => {
  const [entries, setEntries] = useState<AniListEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AniListEntry | null>(null);
  const [localProgress, setLocalProgress] = useState<Record<number, number>>({});

  const fetchWatchingList = () => {
    setLoading(true);
    const query = `
      query {
        MediaListCollection(userName: "PpolHi", type: ANIME, status: CURRENT) {
          lists {
            entries {
              id
              progress
              media {
                id
                title {
                  userPreferred
                  english
                  romaji
                }
                episodes
                coverImage {
                  large
                  medium
                }
                bannerImage
                status
                genres
                averageScore
              }
            }
          }
        }
      }
    `;

    fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query }),
    })
      .then((res) => res.json())
      .then((json) => {
        const lists = json?.data?.MediaListCollection?.lists || [];
        const flat = lists.flatMap((l: any) => l.entries || []);
        setEntries(flat);
        if (flat.length > 0 && !selectedEntry) {
          setSelectedEntry(flat[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch AniList:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchWatchingList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleIncrement = (entryId: number, maxEpisodes: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalProgress((prev) => {
      const current = prev[entryId] ?? entries.find((e) => e.id === entryId)?.progress ?? 0;
      const next = maxEpisodes ? Math.min(maxEpisodes, current + 1) : current + 1;
      return { ...prev, [entryId]: next };
    });
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[82vh] bg-[#1a1b22] border border-white/20 shadow-2xl flex flex-col overflow-hidden text-white rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Windows 10 Style Header Bar */}
        <div className="h-14 bg-black/40 border-b border-white/10 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none bg-[#02a9ff] flex items-center justify-center font-black text-white text-xs tracking-tighter shadow-md">
              AL
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide flex items-center gap-2">
                <span>AniList Companion</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-[#02a9ff]/20 text-[#02a9ff] border border-[#02a9ff]/40 font-mono">
                  LIVE
                </span>
              </div>
              <div className="text-[11px] text-white/50">
                Watching list for <span className="text-white/80 font-medium">PpolHi</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchWatchingList}
              title="Refresh AniList Watchlist"
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer rounded-none"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>

            <button
              onClick={() => onLaunchUrl("https://anilist.co/user/PpolHi")}
              title="Open full AniList profile in browser"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-[#0078d7] border border-white/15 text-white transition-colors cursor-pointer rounded-none"
            >
              <ExternalLink size={14} />
              <span>Open on Web</span>
            </button>

            <button
              onClick={onClose}
              title="Close"
              className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-red-600 transition-colors cursor-pointer rounded-none ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Split Layout: Grid on left (7 cols), Selected anime details on right (5 cols) */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden">
          {/* Left Grid: Anime Cards */}
          <div className="col-span-7 overflow-y-auto p-6 flex flex-col gap-3 custom-scroll border-r border-white/10">
            <div className="flex items-center justify-between text-xs text-white/60 pb-2 border-b border-white/5">
              <span>CURRENTLY WATCHING ({entries.length})</span>
              <span>Click to inspect &bull; +1 to bump episode</span>
            </div>

            {loading && entries.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 text-white/50">
                <RefreshCw size={24} className="animate-spin text-[#02a9ff]" />
                <span className="text-xs">Fetching live anime watchlist from AniList...</span>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-white/50">
                <span>No currently watching anime found for PpolHi</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {entries.map((entry) => {
                  const media = entry.media;
                  const title = media.title.userPreferred || media.title.english || media.title.romaji || "Anime";
                  const currentProg = localProgress[entry.id] ?? entry.progress;
                  const total = media.episodes;
                  const pct = total ? Math.min(100, Math.round((currentProg / total) * 100)) : 50;
                  const isSelected = selectedEntry?.id === entry.id;

                  return (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className={`flex gap-3 p-3 transition-all cursor-pointer rounded-none border text-left group ${
                        isSelected
                          ? "bg-white/[0.09] border-[#0078d7] ring-1 ring-[#0078d7]"
                          : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                      }`}
                    >
                      <img
                        src={media.coverImage.large || media.coverImage.medium}
                        alt={title}
                        className="w-16 h-22 object-cover rounded-none shrink-0 shadow-md"
                        style={{ imageRendering: "-webkit-optimize-contrast" }}
                      />

                      <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight group-hover:text-[#02a9ff] transition-colors">
                            {title}
                          </h4>
                          <span className="text-[10px] text-white/50 mt-1 block">
                            {media.genres.slice(0, 2).join(", ")}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-mono text-white/80">
                              Ep {currentProg} {total ? `/ ${total}` : ""}
                            </span>
                            <button
                              onClick={(e) => handleIncrement(entry.id, total, e)}
                              title="Increment progress +1"
                              className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-[#0078d7] text-white rounded-none transition-colors"
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          <div className="w-full bg-white/10 h-1.5 rounded-none overflow-hidden">
                            <div
                              className="bg-[#02a9ff] h-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Pane: Selected Anime Spotlight */}
          <div className="col-span-5 bg-black/30 p-6 flex flex-col justify-between overflow-y-auto">
            {selectedEntry ? (
              <div className="flex flex-col gap-5">
                <div className="relative w-full h-44 overflow-hidden rounded-none border border-white/15 shadow-xl bg-black/60">
                  <img
                    src={
                      selectedEntry.media.bannerImage ||
                      selectedEntry.media.coverImage.large
                    }
                    alt={selectedEntry.media.title.userPreferred}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#02a9ff] text-white">
                        {selectedEntry.media.status}
                      </span>
                      {selectedEntry.media.averageScore && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-black/60 text-amber-300 ml-1.5 border border-white/20">
                          ★ {selectedEntry.media.averageScore}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white leading-snug">
                    {selectedEntry.media.title.userPreferred}
                  </h3>
                  {selectedEntry.media.title.english && (
                    <div className="text-xs text-white/60 mt-0.5">
                      {selectedEntry.media.title.english}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {selectedEntry.media.genres.map((g) => (
                    <span
                      key={g}
                      className="text-[10px] px-2 py-0.5 bg-white/10 text-white/75 rounded-none"
                    >
                      {g}
                    </span>
                  ))}
                </div>

                <div className="p-3.5 bg-white/[0.04] border border-white/10 flex flex-col gap-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Watch Progress</span>
                    <span className="font-bold text-[#02a9ff]">
                      Episode {localProgress[selectedEntry.id] ?? selectedEntry.progress}
                      {selectedEntry.media.episodes ? ` / ${selectedEntry.media.episodes}` : ""}
                    </span>
                  </div>

                  <div className="w-full bg-white/10 h-2 rounded-none overflow-hidden">
                    <div
                      className="bg-[#02a9ff] h-full transition-all duration-300"
                      style={{
                        width: `${
                          selectedEntry.media.episodes
                            ? Math.min(
                                100,
                                Math.round(
                                  ((localProgress[selectedEntry.id] ?? selectedEntry.progress) /
                                    selectedEntry.media.episodes) *
                                    100
                                )
                              )
                            : 50
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() =>
                      onLaunchUrl(
                        `https://anilist.co/anime/${selectedEntry.media.id}`
                      )
                    }
                    className="w-full py-2.5 px-4 bg-[#0078d7] hover:bg-[#1e8be8] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer rounded-none shadow"
                  >
                    <ExternalLink size={14} />
                    <span>View Anime Details on AniList</span>
                  </button>

                  <button
                    onClick={() => onLaunchUrl("manime")}
                    className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/15 text-white/90 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer rounded-none"
                  >
                    <Play size={14} className="text-cyan-300" />
                    <span>Stream with MAnime Companion</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-white/40 text-center">
                <Sparkles size={32} className="text-white/20 mb-2" />
                <span className="text-xs">Select an anime title to inspect details</span>
              </div>
            )}

            <div className="text-[10px] text-white/40 pt-4 border-t border-white/5 text-center">
              AniList GraphQL API &bull; Maru Start Companion Engine
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AniListCompanionModal;
