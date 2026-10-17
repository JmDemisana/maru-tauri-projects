import React, { useState } from "react";
import { CustomTile } from "../types";
import {
  Globe,
  ExternalLink,
  Plus,
  Check,
  Search,
  Music,
  Tv,
  Calendar,
  Layers,
  Code,
  Heart,
  Gamepad2,
} from "lucide-react";

interface WebAppItem {
  id: string;
  name: string;
  url: string;
  category: "Maru Ecosystem" | "Media & Music" | "Productivity" | "Games & Interactive";
  description: string;
  badge?: string;
  iconName: string;
  defaultTileSize: "medium" | "wide";
}

interface WebAppsTabProps {
  pinnedTiles: CustomTile[];
  onPinTile: (tile: CustomTile) => void;
  onUnpinTile: (id: string) => void;
  onLaunchUrl: (url: string) => void;
}

export const WebAppsTab: React.FC<WebAppsTabProps> = ({
  pinnedTiles,
  onPinTile,
  onUnpinTile,
  onLaunchUrl,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const WEB_APPS: WebAppItem[] = [
    // --- MARU ECOSYSTEM ---
    {
      id: "webapp_maru_site",
      name: "MaruChan Squigle Hub",
      url: "https://maruchansquigle.vercel.app",
      category: "Maru Ecosystem",
      badge: "Official Hub",
      iconName: "Heart",
      defaultTileSize: "wide",
      description: "Main portal for Maru ecosystem, featuring notes, files, games, lyrics, and tools.",
    },
    {
      id: "webapp_schededit",
      name: "SchedEdit Timetable",
      url: "https://maruchansquigle.vercel.app/schededit",
      category: "Maru Ecosystem",
      badge: "BSECE-4",
      iconName: "Calendar",
      defaultTileSize: "wide",
      description: "Full-bleed university class schedule editor with Week, Grid, and List timelines.",
    },
    {
      id: "webapp_monika_piano",
      name: "Monika Piano Maker",
      url: "https://maruchansquigle.vercel.app/monika-piano-maker",
      category: "Maru Ecosystem",
      badge: "Studio DAW",
      iconName: "Music",
      defaultTileSize: "medium",
      description: "Notion-backed polyphonic piano roll, visual MIDI sequencer, and song workshop.",
    },
    {
      id: "webapp_lyrics_db",
      name: "Lyrics Database",
      url: "https://maruchansquigle.vercel.app/lyrics-database",
      category: "Maru Ecosystem",
      badge: "Synced Lyrics",
      iconName: "FileText",
      defaultTileSize: "medium",
      description: "Three-step synchronized lyrics editor with spacebar stamping and LRC exporter.",
    },
    {
      id: "webapp_onu",
      name: "ONU Tabletop Lobby",
      url: "https://maruchansquigle.vercel.app/console/onu",
      category: "Games & Interactive",
      badge: "Multiplayer",
      iconName: "Gamepad2",
      defaultTileSize: "medium",
      description: "Real-time 4-player QR card game room with Stack, Spin, and Wild rules.",
    },

    // --- MEDIA & MUSIC ---
    {
      id: "webapp_anilist",
      name: "AniList Profile",
      url: "https://anilist.co/user/PpolHi",
      category: "Media & Music",
      badge: "Watchlist",
      iconName: "Tv",
      defaultTileSize: "wide",
      description: "Senpai's official anime and manga tracking profile, seasonal charts, and scores.",
    },
    {
      id: "webapp_apple_music",
      name: "Apple Music Web",
      url: "https://music.apple.com/ph",
      category: "Media & Music",
      badge: "Lossless Audio",
      iconName: "Music",
      defaultTileSize: "wide",
      description: "High-resolution web music player with curated Philippine playlists and Len tracks.",
    },
    {
      id: "webapp_youtube_music",
      name: "YouTube Music",
      url: "https://music.youtube.com",
      category: "Media & Music",
      badge: "Vocaloid / OST",
      iconName: "Music",
      defaultTileSize: "medium",
      description: "Stream Vocaloid originals, indie covers, and game soundtracks directly.",
    },

    // --- PRODUCTIVITY & DEV ---
    {
      id: "webapp_notion",
      name: "Notion Workspace",
      url: "https://notion.so",
      category: "Productivity",
      badge: "Cloud Workspace",
      iconName: "Layers",
      defaultTileSize: "medium",
      description: "Personal databases, research outlines, course notes, and project backlogs.",
    },
    {
      id: "webapp_discord_web",
      name: "Discord Web",
      url: "https://discord.com/app",
      category: "Productivity",
      badge: "Communities",
      iconName: "Globe",
      defaultTileSize: "medium",
      description: "Voice, video, and text communities with lightweight zero-install memory footprint.",
    },
    {
      id: "webapp_github",
      name: "GitHub Repositories",
      url: "https://github.com",
      category: "Productivity",
      badge: "Git & Source",
      iconName: "Code",
      defaultTileSize: "medium",
      description: "Access Maru monorepos, Tauri projects, issues, PRs, and release artifacts.",
    },
    {
      id: "webapp_namitalk",
      name: "NamiTalk Messenger",
      url: "https://m.me/nanami.llm",
      category: "Maru Ecosystem",
      badge: "AI Companion",
      iconName: "Heart",
      defaultTileSize: "wide",
      description: "Direct chat line with Nanami on Messenger for daily check-ins and cheer pings.",
    },
  ];

  const CATEGORIES = ["All", "Maru Ecosystem", "Media & Music", "Productivity", "Games & Interactive"];

  const filtered = WEB_APPS.filter((app) => {
    const matchesCat = selectedCategory === "All" || app.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const isPinned = (url: string) => pinnedTiles.some((t) => t.appPath === url);

  const handleTogglePin = (app: WebAppItem) => {
    const existing = pinnedTiles.find((t) => t.appPath === app.url);
    if (existing) {
      onUnpinTile(existing.id);
    } else {
      const newTile: CustomTile = {
        id: `web_${Date.now()}`,
        title: app.name,
        appPath: app.url,
        webUrl: app.url,
        launchMode: "web",
        size: app.defaultTileSize,
        color: "acrylic",
        iconName: app.iconName,
        group: app.category === "Maru Ecosystem" ? "Maru Ecosystem" : "Explore & Media",
      };
      onPinTile(newTile);
    }
  };

  const renderIcon = (name: string) => {
    switch (name) {
      case "Heart":
        return <Heart size={20} className="text-pink-400" />;
      case "Music":
        return <Music size={20} className="text-cyan-400" />;
      case "Tv":
        return <Tv size={20} className="text-blue-400" />;
      case "Calendar":
        return <Calendar size={20} className="text-amber-400" />;
      case "Layers":
        return <Layers size={20} className="text-indigo-400" />;
      case "Code":
        return <Code size={20} className="text-emerald-400" />;
      case "Gamepad2":
        return <Gamepad2 size={20} className="text-purple-400" />;
      default:
        return <Globe size={20} className="text-cyan-300" />;
    }
  };

  return (
    <div
      className="relative w-full h-full flex flex-col items-center select-none overflow-y-auto no-scrollbar"
      style={{ paddingTop: "96px", paddingBottom: "120px" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="w-full max-w-5xl flex flex-col gap-6 px-8 sm:px-12">
        {/* Header */}
        <div className="flex flex-col gap-2 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Globe size={26} className="text-[#0078d7]" />
            <h1 className="text-2xl font-light tracking-tight text-white">
              Maru Start Web Apps
            </h1>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            Curated web applets and cloud portals designed for Maru-Senpai. Pin them directly as tiles to your Start Menu or launch instantly.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer rounded-none ${
                  selectedCategory === cat
                    ? "bg-[#0078d7] text-white"
                    : "bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 flex items-center bg-black/40 border border-white/15 px-2.5 py-1.5 focus-within:border-[#0078d7] transition-colors">
            <Search size={14} className="text-white/50 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter web apps..."
              className="bg-transparent text-xs text-white placeholder-white/40 focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Web Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((app) => {
            const pinned = isPinned(app.url);

            return (
              <div
                key={app.id}
                className="flex flex-col justify-between p-4 bg-white/[0.03] border border-white/10 hover:border-white/25 transition-all rounded-none gap-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 flex items-center justify-center rounded-none shrink-0 border border-white/10 group-hover:scale-105 transition-transform">
                        {renderIcon(app.iconName)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-white transition-colors leading-tight">
                          {app.name}
                        </h3>
                        <span className="text-[10px] text-white/50">{app.category}</span>
                      </div>
                    </div>

                    {app.badge && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#0078d7]/30 text-[#0078d7] border border-[#0078d7]/40 rounded-none shrink-0">
                        {app.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-white/65 leading-relaxed line-clamp-2">
                    {app.description}
                  </p>

                  <div className="text-[10px] text-white/40 font-mono truncate mt-2">
                    {app.url}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => onLaunchUrl(app.url)}
                    className="py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer rounded-none"
                  >
                    <ExternalLink size={13} className="text-cyan-300" />
                    <span>Launch</span>
                  </button>

                  <button
                    onClick={() => handleTogglePin(app)}
                    className={`py-1.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer rounded-none ${
                      pinned
                        ? "bg-emerald-600/80 hover:bg-red-600 text-white"
                        : "bg-[#0078d7] hover:bg-[#1e8be8] text-white"
                    }`}
                  >
                    {pinned ? (
                      <>
                        <Check size={13} />
                        <span>Pinned</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Pin to Start</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-white/40 pt-4 border-t border-white/5">
          <span>Maru Start Web Apps PWA Engine</span>
          <span>Zero local RAM when idle</span>
        </div>
      </div>
    </div>
  );
};

export default WebAppsTab;
