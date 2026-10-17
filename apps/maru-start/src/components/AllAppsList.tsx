import React, { useState, useMemo, useRef, useCallback } from "react";
import { AppItem } from "../types";
import { Sparkles, X } from "lucide-react";

interface AllAppsListProps {
  apps: AppItem[];
  onLaunch: (path: string) => void;
  onAppContextMenu: (e: React.MouseEvent, app: AppItem) => void;
}

const ALPHABET = [
  "&",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z"
];

export const AllAppsList: React.FC<AllAppsListProps> = ({
  apps,
  onLaunch,
  onAppContextMenu,
}) => {
  const [semanticZoomOpen, setSemanticZoomOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group apps by first letter
  const grouped = useMemo(() => {
    const map: Record<string, AppItem[]> = {};

    apps.forEach((app) => {
      const firstChar = app.name.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : "&";
      if (!map[letter]) {
        map[letter] = [];
      }
      map[letter].push(app);
    });

    return Object.keys(map)
      .sort((a, b) => {
        if (a === "&") return -1;
        if (b === "&") return 1;
        return a.localeCompare(b);
      })
      .map((letter) => ({
        letter,
        items: map[letter].sort((x, y) => x.name.localeCompare(y.name)),
      }));
  }, [apps]);

  // Set of letters that have at least one app
  const activeLetters = useMemo(() => {
    return new Set(grouped.map((g) => g.letter));
  }, [grouped]);

  const scrollToLetter = useCallback((letter: string) => {
    setSemanticZoomOpen(false);
    const element = document.getElementById(`letter-group-${letter}`);
    const container = containerRef.current;
    if (element && container) {
      const parentRect = container.getBoundingClientRect();
      const elRect = element.getBoundingClientRect();
      const targetScroll = container.scrollTop + (elRect.top - parentRect.top) - 96;
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }
  }, []);

  return (
    <div
      className="relative w-full h-full flex items-stretch select-none overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Scrollable Center Content */}
      <div
        ref={containerRef}
        className="flex-1 h-full overflow-y-auto custom-scroll px-8 sm:px-14 md:px-20 flex flex-col items-center"
        style={{ paddingTop: "96px", paddingBottom: "140px" }}
      >
        <div className="w-full max-w-6xl flex flex-col gap-8">
          {/* Authentic Windows 10 "All apps" subheader */}
          <div className="flex items-center gap-3 pb-2 border-b border-white/10 w-full">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
              All Apps
            </span>
          </div>

          {apps.length === 0 ? (
            <div className="flex flex-col items-center gap-3 text-center mt-24">
              <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center">
                <Sparkles size={22} className="text-white/60" />
              </div>
              <div className="text-base text-white font-medium">No apps found</div>
            </div>
          ) : (
            grouped.map(({ letter, items }) => (
              <div
                key={letter}
                id={`letter-group-${letter}`}
                className="flex items-start gap-8 w-full scroll-mt-24"
              >
                {/* Left Letter Tile Button (Click opens Semantic Zoom) */}
                <button
                  onClick={() => setSemanticZoomOpen(true)}
                  title={`Jump to letter ${letter}...`}
                  className="w-11 h-11 flex items-center justify-center text-lg font-semibold text-white/90 bg-white/10 hover:bg-white/20 hover:border-white/10 border border-transparent active:scale-95 transition-all duration-100 cursor-pointer select-none rounded-none shrink-0"
                >
                  {letter}
                </button>

                {/* Authentic 3 by X Grid: 3 columns of apps beside the letter */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 flex-1">
                  {items.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => onLaunch(app.path)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAppContextMenu(e, app);
                      }}
                      className="h-12 flex items-center gap-4 px-3 text-left text-white hover:bg-white/10 active:bg-white/20 active:scale-[0.98] transition-all duration-100 cursor-pointer select-none rounded-none group border border-transparent hover:border-white/10"
                    >
                      <div className="w-8 h-8 flex items-center justify-center shrink-0 pointer-events-none bg-white/5 group-hover:bg-transparent transition-colors p-1.5 shadow-sm">
                        {app.icon ? (
                          <img
                            src={app.icon}
                            alt={app.name}
                            style={{ imageRendering: "-webkit-optimize-contrast" }}
                            className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
                            loading="lazy"
                          />
                        ) : (
                          <Sparkles size={18} className="text-cyan-300 pointer-events-none" />
                        )}
                      </div>
                      <span className="truncate flex-1 text-[15px] font-normal text-white/90 group-hover:text-white leading-tight">
                        {app.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alphabet Quick-Jump Rail on Far Right (Roomy tablet-friendly margins) */}
      <div className="w-10 shrink-0 h-full flex flex-col items-center justify-center py-6 mr-6 sm:mr-8 md:mr-10 select-none pointer-events-auto">
        <div className="flex flex-col items-center gap-0.5 max-h-full overflow-y-auto no-scrollbar py-2">
          {ALPHABET.map((letter) => {
            const hasApps = activeLetters.has(letter);
            return (
              <button
                key={letter}
                disabled={!hasApps}
                onClick={() => scrollToLetter(letter)}
                className={`w-7 h-5 flex items-center justify-center text-[11px] font-semibold transition-colors rounded-none ${
                  hasApps
                    ? "text-white/70 hover:text-white hover:bg-white/20 cursor-pointer active:scale-90"
                    : "text-white/20 cursor-default pointer-events-none"
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Semantic Zoom Matrix Overlay (Authentic Windows 10 A-Z letter selector) */}
      {semanticZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center p-8 select-none animate-in fade-in duration-100"
          onClick={() => setSemanticZoomOpen(false)}
        >
          <div
            className="flex flex-col gap-6 max-w-xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/15 px-1">
              <span className="text-sm font-semibold text-white/90 tracking-wide">
                Jump to...
              </span>
              <button
                onClick={() => setSemanticZoomOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer rounded-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* A-Z Letter Tiles Grid (Authentic Windows 10 Semantic Zoom) */}
            <div className="grid grid-cols-6 sm:grid-cols-7 gap-1">
              {ALPHABET.map((letter) => {
                const hasApps = activeLetters.has(letter);
                return (
                  <button
                    key={letter}
                    disabled={!hasApps}
                    onClick={() => scrollToLetter(letter)}
                    className={`w-14 h-14 flex items-center justify-center text-lg font-semibold transition-all duration-100 rounded-none border border-transparent ${
                      hasApps
                        ? "bg-white/10 hover:bg-white/20 hover:border-white/20 text-white active:scale-95 cursor-pointer"
                        : "bg-white/5 text-white/30 cursor-default pointer-events-none"
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllAppsList;
