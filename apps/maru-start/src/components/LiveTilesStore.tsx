import React, { useState } from "react";
import { CustomTile, MaruStartConfig } from "../types";
import {
  Store,
  CloudSun,
  Music,
  Heart,
  Cpu,
  Clock,
  Calendar,
  HardDrive,
  Tv,
  Plus,
  Check,
  Tag,
  Star,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Sliders,
  X,
} from "lucide-react";

interface StoreItem {
  id: string;
  title: string;
  category: "Utilities & Time" | "System & Hardware" | "Entertainment & Music" | "Maru & Anime";
  size: "medium" | "wide";
  description: string;
  liveType: "weather" | "music" | "nami" | "system" | "clock" | "calendar" | "storage" | "anilist" | "vocaloid" | "email";
  appPath?: string;
  webUrl?: string;
  hasDedicatedInterface?: boolean;
  dedicatedInterfaceName?: string;
  rating: number;
  reviewsCount: number;
  preview: React.ReactNode;
}

interface LiveTilesStoreProps {
  pinnedTiles: CustomTile[];
  onPinTile: (tile: CustomTile) => void;
  onUnpinTile: (id: string) => void;
  onLaunchUrl?: (url: string) => void;
  onOpenAniListModal?: () => void;
  config?: MaruStartConfig;
  onUpdateConfig?: (newConfig: Partial<MaruStartConfig>) => void;
}

export const LiveTilesStore: React.FC<LiveTilesStoreProps> = ({
  pinnedTiles,
  onPinTile,
  onUnpinTile,
  onLaunchUrl: _onLaunchUrl,
  onOpenAniListModal,
  config,
  onUpdateConfig,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"combos" | "live-tiles" | "all">("all");
  const [configuringItem, setConfiguringItem] = useState<StoreItem | null>(null);
  const [selectedLaunchMode, setSelectedLaunchMode] = useState<"app" | "web" | "dedicated">("dedicated");
  const [customTargetInput, setCustomTargetInput] = useState("");

  const isPinned = (id: string) => pinnedTiles.some((t) => t.id === id);

  const STORE_CATALOG: StoreItem[] = [
    {
      id: "live_anilist",
      title: "AniList Tracker Combo",
      category: "Maru & Anime",
      size: "wide",
      liveType: "anilist",
      appPath: "manime",
      webUrl: "https://anilist.co/user/PpolHi",
      hasDedicatedInterface: true,
      dedicatedInterfaceName: "AniList Companion Modal",
      rating: 5.0,
      reviewsCount: 384,
      description: "Live animated tile tracking current season anime + full in-app companion interface or web sync.",
      preview: (
        <div className="w-full h-full flex flex-col justify-between p-3.5 bg-white/[0.05] border border-white/10 text-white rounded-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv size={18} className="text-[#02a9ff]" />
              <span className="text-xs font-bold text-white">AniList Watchlist</span>
            </div>
            <span className="text-[10px] text-[#02a9ff] font-bold bg-[#02a9ff]/20 px-1.5 py-0.5 border border-[#02a9ff]/40">
              LIVE SYNC
            </span>
          </div>
          <div className="my-auto">
            <div className="text-xs font-bold text-white truncate">Dandadan &bull; Ep 9 / 12</div>
            <div className="text-[10px] text-white/70">Next: Tomorrow 11:30 PM</div>
          </div>
          <div className="text-[10px] text-white/50">Combo &bull; Dedicated Interface Available</div>
        </div>
      ),
    },
    {
      id: "live_weather",
      title: "MSN Weather & Radar Combo",
      category: "Utilities & Time",
      size: "wide",
      liveType: "weather",
      appPath: "msnweather:",
      webUrl: "https://www.accuweather.com",
      rating: 4.8,
      reviewsCount: 219,
      description: "Live weather radar, 4-day forecast and temperature highs/lows for Iloilo City.",
      preview: (
        <div className="w-full h-full flex flex-col justify-between p-3.5 bg-white/[0.05] border border-white/10 text-white rounded-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CloudSun size={32} className="text-amber-300 drop-shadow" />
              <div>
                <div className="text-2xl font-bold tracking-tight">29°C</div>
                <div className="text-[11px] text-white/80">Partly Cloudy</div>
              </div>
            </div>
            <div className="text-right text-[10px] text-white/60">
              <div>H: 31°</div>
              <div>L: 25°</div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-white/60">
            <span>Iloilo City</span>
            <span>Live Weather &bull; Web Combo</span>
          </div>
        </div>
      ),
    },
    {
      id: "live_music",
      title: "MAudio Now Playing Combo",
      category: "Entertainment & Music",
      size: "wide",
      liveType: "music",
      appPath: "maudio-windows",
      webUrl: "https://music.apple.com/ph",
      rating: 4.9,
      reviewsCount: 512,
      description: "Real-time Last.fm scrobble monitor, animated frequency bars, and synchronized lyrics.",
      preview: (
        <div className="w-full h-full flex flex-col justify-between p-3.5 bg-white/[0.05] border border-white/10 text-white rounded-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <Music size={18} className="text-cyan-300" />
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-white truncate">Lavie</div>
              <div className="text-[11px] text-white/70 truncate">THREEE feat. Kagamine Len</div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-cyan-300/80">
            <span>MAudio Desktop</span>
            <span>Live Broadcast</span>
          </div>
        </div>
      ),
    },
    {
      id: "live_nami",
      title: "Nanami AI Cheer Combo",
      category: "Maru & Anime",
      size: "wide",
      liveType: "nami",
      appPath: "nanami-ai-desktop",
      webUrl: "https://m.me/nanami.llm",
      rating: 5.0,
      reviewsCount: 999,
      description: "Warm, expressive tsundere cheer pings, daily encouragement, and Senpai ecosystem status.",
      preview: (
        <div className="w-full h-full flex flex-col justify-between p-3.5 bg-white/[0.05] border border-white/10 text-white rounded-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center border border-pink-300/30 shrink-0">
              <Heart size={18} className="fill-pink-300 text-pink-300" />
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Nanami</span>
                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-600 text-white">💚 ACTIVE</span>
              </div>
              <div className="text-[11px] text-pink-200/80 truncate">Always cheering for Senpai</div>
            </div>
          </div>
          <div className="text-[10px] text-white/50">Nami Companion &bull; Messenger Line</div>
        </div>
      ),
    },
    {
      id: "live_system",
      title: "Potato PC Resource Gauge",
      category: "System & Hardware",
      size: "medium",
      liveType: "system",
      appPath: "taskmgr.exe",
      rating: 4.9,
      reviewsCount: 140,
      description: "Snappy health monitor, lightweight CPU load meter, and low RAM consumption overview.",
      preview: (
        <div className="w-full h-full flex flex-col justify-between p-3 bg-white/[0.05] border border-white/10 text-white rounded-none">
          <div className="flex items-center justify-between">
            <Cpu size={22} className="text-emerald-400" />
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              OPTIMAL
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-white">Potato PC</div>
            <div className="text-[10px] text-emerald-300/90 font-medium mt-0.5">Snappy ⚡ &bull; Clean RAM</div>
          </div>
          <div className="text-[9px] text-white/50">Resource Monitor</div>
        </div>
      ),
    },
    {
      id: "live_clock",
      title: "Manila World Clock Combo",
      category: "Utilities & Time",
      size: "medium",
      liveType: "clock",
      appPath: "timedate.cpl",
      rating: 4.7,
      reviewsCount: 88,
      description: "Precision time display in Philippine Standard Time (PHT, UTC+8) with seconds ticker.",
      preview: (
        <div className="w-full h-full flex flex-col justify-between p-3 bg-white/[0.05] border border-white/10 text-white rounded-none">
          <div className="flex items-center justify-between">
            <Clock size={20} className="text-cyan-300" />
            <span className="text-[10px] text-cyan-300/80 font-mono">PHT (UTC+8)</span>
          </div>
          <div className="my-auto">
            <div className="text-2xl font-bold tracking-tight text-white font-mono">
              {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </div>
            <div className="text-[10px] text-white/60 mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
          <div className="text-[9px] text-white/50">World Clock</div>
        </div>
      ),
    },
    {
      id: "live_calendar",
      title: "Calendar & SchedEdit Combo",
      category: "Utilities & Time",
      size: "medium",
      liveType: "calendar",
      appPath: "outlookcal:",
      webUrl: "https://maruchansquigle.vercel.app/schededit",
      rating: 4.9,
      reviewsCount: 164,
      description: "Quick-glance calendar tile highlighting today's date, weekday, and timetable editor.",
      preview: (
        <div className="w-full h-full flex flex-col justify-between p-3 bg-white/[0.05] border border-white/10 text-white rounded-none">
          <div className="flex items-center justify-between text-rose-300 font-bold text-xs uppercase tracking-wider">
            <Calendar size={18} />
            <span>{new Date().toLocaleString("en-US", { month: "short" })}</span>
          </div>
          <div className="text-center my-auto">
            <div className="text-3xl font-extrabold text-white leading-none">
              {new Date().getDate()}
            </div>
            <div className="text-[11px] text-white/75 mt-1 font-medium">
              {new Date().toLocaleDateString("en-US", { weekday: "long" })}
            </div>
          </div>
          <div className="text-[9px] text-white/50">SchedEdit &bull; Calendar</div>
        </div>
      ),
    },
    {
      id: "live_storage",
      title: "Storage Sense Drive Health",
      category: "System & Hardware",
      size: "wide",
      liveType: "storage",
      appPath: "ms-settings:storagesense",
      rating: 4.8,
      reviewsCount: 95,
      description: "Displays C: SSD and D: Archive breakdown with automatic health warnings.",
      preview: (
        <div className="w-full h-full flex flex-col justify-between p-3.5 bg-white/[0.05] border border-white/10 text-white rounded-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive size={18} className="text-cyan-300" />
              <span className="text-xs font-bold text-white">Storage Overview</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">Healthy</span>
          </div>
          <div className="flex flex-col gap-1.5 my-auto">
            <div className="flex justify-between text-[11px]">
              <span>C: System SSD</span>
              <span className="text-white/60">Preserved ⚡</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full w-[45%]" />
            </div>
          </div>
          <div className="text-[10px] text-white/50">Storage Sense &bull; D: Archive Connected</div>
        </div>
      ),
    },
  ];

  const CATEGORIES = [
    "All",
    "Utilities & Time",
    "System & Hardware",
    "Entertainment & Music",
    "Maru & Anime",
  ];

  const filtered = STORE_CATALOG.filter((item) => {
    const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleTogglePin = (item: StoreItem) => {
    if (isPinned(item.id)) {
      onUnpinTile(item.id);
    } else {
      const override = config?.tileLaunchOverrides?.[item.id];
      onPinTile({
        id: item.id,
        title: item.title,
        size: item.size,
        color: "acrylic",
        iconName: item.liveType,
        group: item.category === "Maru & Anime" ? "Maru Ecosystem" : "Live Widgets",
        isLive: true,
        liveType: item.liveType,
        appPath: override?.customTarget || item.appPath,
        webUrl: item.webUrl,
        launchMode: override?.launchMode || (item.hasDedicatedInterface ? "dedicated" : "app"),
      });
    }
  };

  const openConfigurator = (item: StoreItem) => {
    setConfiguringItem(item);
    const existing = config?.tileLaunchOverrides?.[item.id];
    setSelectedLaunchMode(existing?.launchMode || (item.hasDedicatedInterface ? "dedicated" : "app"));
    setCustomTargetInput(existing?.customTarget || item.appPath || item.webUrl || "");
  };

  const saveLaunchConfiguration = () => {
    if (!configuringItem || !onUpdateConfig) return;
    const existingOverrides = config?.tileLaunchOverrides || {};
    const updated = {
      ...existingOverrides,
      [configuringItem.id]: {
        launchMode: selectedLaunchMode,
        customTarget: customTargetInput.trim() || undefined,
      },
    };
    onUpdateConfig({ tileLaunchOverrides: updated });
    setConfiguringItem(null);
  };

  return (
    <div
      className="relative w-full h-full flex flex-col items-center select-none overflow-y-auto no-scrollbar"
      style={{ paddingTop: "96px", paddingBottom: "120px" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="w-full max-w-6xl flex flex-col gap-8 px-8 sm:px-12">
        {/* Windows 10 Store Top App Bar */}
        <div className="flex flex-col gap-4 pb-4 border-b border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-[#0078d7] flex items-center justify-center text-white rounded-none shadow">
                <Store size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-light tracking-tight text-white flex items-center gap-2">
                  <span>Maru Start Store</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/10 text-white/70 border border-white/15">
                    Windows 10 Edition
                  </span>
                </h1>
                <p className="text-xs text-white/60">
                  Discover Live Tile & Web App combos, customized launch actions, and dedicated companions.
                </p>
              </div>
            </div>

            {/* Store Search Box */}
            <div className="relative w-full sm:w-72 flex items-center bg-black/40 border border-white/20 px-3 py-2 focus-within:border-[#0078d7] transition-colors">
              <Search size={16} className="text-white/50 mr-2.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search combos, live tiles..."
                className="bg-transparent text-xs text-white placeholder-white/40 focus:outline-none w-full"
              />
            </div>
          </div>

          {/* Windows 10 Store Department Nav Tabs */}
          <div className="flex items-center gap-6 text-sm pt-2">
            {[
              { id: "all", label: "Home" },
              { id: "combos", label: "Live Tile + Web Combos" },
              { id: "live-tiles", label: "Widgets & Gauges" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-1 font-medium transition-colors border-b-2 cursor-pointer ${
                  activeTab === tab.id
                    ? "border-[#0078d7] text-white"
                    : "border-transparent text-white/60 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* SPOTLIGHT HERO BANNER: AniList Live Watchlist + Companion Combo */}
        <div className="relative w-full bg-gradient-to-r from-[#0d2a45] via-[#102035] to-[#12131a] border border-white/15 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl overflow-hidden rounded-none">
          <div className="flex-1 flex flex-col gap-2.5 z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-[#02a9ff] text-white shadow">
                SPOTLIGHT COMBO
              </span>
              <span className="text-[10px] text-cyan-300 font-semibold">
                AniList GraphQL + Dedicated Companion
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              AniList Live Watchlist + Companion Combo
            </h2>

            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              Track your currently watching anime on your Start menu live tile with live episode progress bars.
              Clicking the tile opens a dedicated companion interface with +1 episode bump, or directly opens the web app.
            </p>

            <div className="flex items-center gap-4 text-xs text-white/70 mt-1">
              <div className="flex items-center text-amber-400 gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="fill-amber-400" />
                ))}
                <span className="text-white font-semibold ml-1.5">5.0</span>
              </div>
              <span>&bull;</span>
              <span>Free</span>
              <span>&bull;</span>
              <span>Curated for Maru-Senpai</span>
            </div>

            {/* Spotlight CTA Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                onClick={() => {
                  const anilistItem = STORE_CATALOG.find((s) => s.id === "live_anilist");
                  if (anilistItem) handleTogglePin(anilistItem);
                }}
                className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer rounded-none shadow-md ${
                  isPinned("live_anilist")
                    ? "bg-emerald-600 hover:bg-red-600 text-white"
                    : "bg-[#0078d7] hover:bg-[#1e8be8] text-white"
                }`}
              >
                {isPinned("live_anilist") ? (
                  <>
                    <Check size={16} />
                    <span>Combo Installed on Start</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Get Live Tile + Web Combo</span>
                  </>
                )}
              </button>

              {onOpenAniListModal && (
                <button
                  onClick={onOpenAniListModal}
                  className="px-4 py-2.5 text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-2 transition-colors cursor-pointer rounded-none"
                >
                  <Sparkles size={15} className="text-[#02a9ff]" />
                  <span>Open Dedicated Interface</span>
                </button>
              )}

              <button
                onClick={() => {
                  const anilistItem = STORE_CATALOG.find((s) => s.id === "live_anilist");
                  if (anilistItem) openConfigurator(anilistItem);
                }}
                className="px-3.5 py-2.5 text-xs font-medium bg-black/40 hover:bg-white/10 border border-white/15 text-white/90 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer rounded-none"
              >
                <Sliders size={14} />
                <span>Configure Launch Action</span>
              </button>
            </div>
          </div>

          <div className="w-64 h-36 shrink-0 shadow-2xl border border-white/20 hidden md:block">
            {STORE_CATALOG.find((s) => s.id === "live_anilist")?.preview}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer rounded-none flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? "bg-[#0078d7] text-white"
                  : "bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white"
              }`}
            >
              <Tag size={12} />
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Windows Store Catalog Grid */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-white/60 pb-1 border-b border-white/10">
            <span className="uppercase font-semibold tracking-wider">
              Top Live Tile & Web App Combos ({filtered.length})
            </span>
            <span>Configure what opens when clicked</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const pinned = isPinned(item.id);
              const override = config?.tileLaunchOverrides?.[item.id];
              const launchMode = override?.launchMode || (item.hasDedicatedInterface ? "dedicated" : "app");

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between p-4 bg-white/[0.03] border border-white/10 hover:border-white/25 transition-all rounded-none gap-3.5 group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-white leading-tight">
                          {item.title}
                        </h3>
                        <span className="text-[10px] text-white/50">{item.category}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-white/10 text-white/80 border border-white/15 shrink-0">
                        {item.size}
                      </span>
                    </div>

                    {/* Preview Canvas */}
                    <div className="w-full h-28 overflow-hidden rounded-none shadow-inner my-2">
                      {item.preview}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>

                    {/* Rating & Action Info */}
                    <div className="flex items-center justify-between text-[11px] text-white/50 mt-2.5 pt-2 border-t border-white/5">
                      <div className="flex items-center text-amber-400 gap-1">
                        <Star size={12} className="fill-amber-400" />
                        <span className="text-white/80 font-medium">{item.rating}</span>
                        <span className="text-white/40">({item.reviewsCount})</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                        Opens: {launchMode}
                      </span>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleTogglePin(item)}
                        className={`py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer rounded-none ${
                          pinned
                            ? "bg-emerald-600/80 hover:bg-red-600 text-white"
                            : "bg-[#0078d7] hover:bg-[#005a9e] text-white"
                        }`}
                      >
                        {pinned ? (
                          <>
                            <Check size={13} />
                            <span>Installed</span>
                          </>
                        ) : (
                          <>
                            <Plus size={13} />
                            <span>Get Combo</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => openConfigurator(item)}
                        title="Configure what happens when this tile is clicked"
                        className="py-2 px-3 bg-white/5 hover:bg-white/15 border border-white/15 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer rounded-none"
                      >
                        <SettingsIcon size={13} className="text-white/70" />
                        <span>Configure</span>
                      </button>
                    </div>

                    {item.hasDedicatedInterface && onOpenAniListModal && (
                      <button
                        onClick={onOpenAniListModal}
                        className="w-full py-1.5 px-3 bg-[#02a9ff]/20 hover:bg-[#02a9ff]/30 text-[#02a9ff] border border-[#02a9ff]/40 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer rounded-none"
                      >
                        <Sparkles size={13} />
                        <span>Launch Dedicated Interface</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-white/40 pt-4 border-t border-white/5">
          <span>Maru Start Store &bull; Windows 10 Fluent Catalog Engine</span>
          <span>Zero Background CPU &bull; Curated for Maru-Senpai</span>
        </div>
      </div>

      {/* TILE CLICK ACTION CONFIGURATOR MODAL */}
      {configuringItem && (
        <div
          className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-xl flex items-center justify-center p-6 select-none animate-in fade-in duration-150"
          onClick={() => setConfiguringItem(null)}
        >
          <div
            className="w-full max-w-lg bg-[#252528] border border-white/20 shadow-2xl p-6 flex flex-col gap-6 text-white rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Configure Tile Click Action
                </h3>
                <div className="text-xs text-white/60 mt-0.5">
                  Choose what happens when you click &quot;{configuringItem.title}&quot;
                </div>
              </div>
              <button
                onClick={() => setConfiguringItem(null)}
                className="p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer rounded-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Launch Mode Radios */}
            <div className="flex flex-col gap-3">
              {configuringItem.hasDedicatedInterface && (
                <label
                  onClick={() => setSelectedLaunchMode("dedicated")}
                  className={`flex items-start gap-3 p-3.5 border transition-colors cursor-pointer rounded-none ${
                    selectedLaunchMode === "dedicated"
                      ? "bg-[#0078d7]/20 border-[#0078d7] text-white"
                      : "bg-white/[0.03] border-white/10 text-white/80 hover:bg-white/[0.06]"
                  }`}
                >
                  <input
                    type="radio"
                    name="launchMode"
                    checked={selectedLaunchMode === "dedicated"}
                    onChange={() => setSelectedLaunchMode("dedicated")}
                    className="mt-0.5 accent-[#0078d7]"
                  />
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-1.5">
                      <span>Dedicated In-App Interface</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#02a9ff] text-white font-bold">
                        RECOMMENDED
                      </span>
                    </div>
                    <div className="text-xs text-white/60 mt-0.5">
                      Opens a rich fluent modal right inside Maru Start (e.g. watchlist, bump episode, stats).
                    </div>
                  </div>
                </label>
              )}

              {configuringItem.webUrl && (
                <label
                  onClick={() => setSelectedLaunchMode("web")}
                  className={`flex items-start gap-3 p-3.5 border transition-colors cursor-pointer rounded-none ${
                    selectedLaunchMode === "web"
                      ? "bg-[#0078d7]/20 border-[#0078d7] text-white"
                      : "bg-white/[0.03] border-white/10 text-white/80 hover:bg-white/[0.06]"
                  }`}
                >
                  <input
                    type="radio"
                    name="launchMode"
                    checked={selectedLaunchMode === "web"}
                    onChange={() => setSelectedLaunchMode("web")}
                    className="mt-0.5 accent-[#0078d7]"
                  />
                  <div>
                    <div className="text-sm font-semibold">Web App Portal (Browser)</div>
                    <div className="text-xs text-white/60 mt-0.5">
                      Opens the official web app in your default browser ({configuringItem.webUrl}).
                    </div>
                  </div>
                </label>
              )}

              {configuringItem.appPath && (
                <label
                  onClick={() => setSelectedLaunchMode("app")}
                  className={`flex items-start gap-3 p-3.5 border transition-colors cursor-pointer rounded-none ${
                    selectedLaunchMode === "app"
                      ? "bg-[#0078d7]/20 border-[#0078d7] text-white"
                      : "bg-white/[0.03] border-white/10 text-white/80 hover:bg-white/[0.06]"
                  }`}
                >
                  <input
                    type="radio"
                    name="launchMode"
                    checked={selectedLaunchMode === "app"}
                    onChange={() => setSelectedLaunchMode("app")}
                    className="mt-0.5 accent-[#0078d7]"
                  />
                  <div>
                    <div className="text-sm font-semibold">Native Desktop Application</div>
                    <div className="text-xs text-white/60 mt-0.5">
                      Launches the local Windows executable or shortcut ({configuringItem.appPath}).
                    </div>
                  </div>
                </label>
              )}
            </div>

            {/* Custom Target Override Input */}
            <div className="flex flex-col gap-1.5 pt-2">
              <label className="text-xs font-semibold text-white/80">
                Custom URL or Executable Path (Optional Override)
              </label>
              <input
                type="text"
                value={customTargetInput}
                onChange={(e) => setCustomTargetInput(e.target.value)}
                placeholder="e.g. https://... or C:\Program Files\..."
                className="bg-black/50 border border-white/20 p-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#0078d7]"
              />
              <span className="text-[11px] text-white/50">
                Leave empty to use the default target for the selected mode.
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                onClick={() => setConfiguringItem(null)}
                className="px-4 py-2 text-xs font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/15 transition-colors cursor-pointer rounded-none"
              >
                Cancel
              </button>
              <button
                onClick={saveLaunchConfiguration}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#0078d7] hover:bg-[#1e8be8] transition-colors cursor-pointer rounded-none shadow"
              >
                Save Launch Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTilesStore;
