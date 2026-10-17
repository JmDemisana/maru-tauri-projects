import React, { useState, useEffect, useRef, useMemo } from "react";
import { CustomTile, TileSize, AppItem, MaruStartConfig } from "../types";
import {
  Calculator,
  FileText,
  Settings as SettingsIcon,
  Cpu,
  Music,
  Tv,
  Heart,
  Layers,
  Sparkles,
  CloudSun,
  Flame,
  Pin,
  Plus,
  Folder,
  X,
  LogOut,
  Mail,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface TileBoardProps {
  tiles: CustomTile[];
  allApps?: AppItem[];
  onLaunch: (path: string) => void;
  onTileContextMenu: (e: React.MouseEvent, tile: CustomTile) => void;
  onRenameGroup: (oldName: string, newName: string) => void;
  onMoveTile: (sourceId: string, targetId: string) => void;
  onMoveToGroup: (sourceId: string, targetGroup: string) => void;
  onMoveGroup?: (sourceGroup: string, targetGroup: string) => void;
  onMoveToNewGroup?: (sourceId: string, groupName?: string) => void;
  onCreateFolder?: (sourceId: string, targetId: string) => void;
  onToggleFolder?: (folderId: string) => void;
  onRemoveFromFolder?: (folderId: string, subTileId: string) => void;
  onResetTiles: () => void;
  isMenuOpen?: boolean;
  config?: MaruStartConfig;
  onOpenAniListModal?: () => void;
}

const NAMI_QUOTES = [
  "Working hard, Senpai? Take a breather once in a while, baka! 💚",
  "Ehh... you actually launched an app yourself? Proud of you!",
  "GUMI is playing in the background... taste acquired, Senpai 🎵",
  "Potato PC is doing its best! Be nice to it, okay?",
  "Pastel Palettes sparkle... just like your pinned tiles ✨",
];

const getManilaTime = () =>
  new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date());

const getManilaDate = () =>
  new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date());

interface RecentEmail {
  sender: string;
  subject: string;
  time: string;
  unread_count: number;
  preview?: string;
}

interface AniListAnime {
  title: string;
  progress: number;
  episodes: number | null;
  coverImage: string;
}

export const isBrandIcon = (name?: string) => {
  if (!name) return false;
  return [
    "VSCode", "Terminal", "Chrome", "Globe", "Explorer", "Folder",
    "Discord", "Spotify", "Notion", "AutoCAD", "MATLAB", "AndroidStudio",
    "7Zip", "MAudio", "Marucast", "Nami", "MonikaPiano", "FilesCompanion",
    "TurnsCalculator", "Weather", "CloudSun", "Calculator", "Notepad",
    "FileText", "Settings", "Taskmgr", "Cpu", "Code", "Compass", "Flame",
    "Word", "Excel", "PowerPoint", "OneNote", "Outlook", "Edge", "AniList",
    "Access", "Publisher"
  ].includes(name);
};

// Rich Brand Icons fallback when exe icon is unavailable
export const renderRichIcon = (name?: string, size = 44) => {
  switch (name) {
    case "VSCode":
    case "Code":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className="drop-shadow-md">
          <path d="M17.5 2.5L7 11.5L3.5 8.5L2 9.5L5.5 13L2 16.5L3.5 17.5L7 14.5L17.5 23.5L22 21.5V4.5L17.5 2.5Z" fill="#0065a9" />
          <path d="M17.5 7.5L9.5 13L17.5 18.5V7.5Z" fill="#29b6f6" />
          <path d="M17.5 7.5L22 4.5V21.5L17.5 18.5V7.5Z" fill="#007acc" />
        </svg>
      );

    case "Terminal":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-lg bg-[#0c0c0c] border border-white/20 shadow-md flex flex-col justify-between p-1.5 overflow-hidden"
        >
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500/80" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/80" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/80" />
          </div>
          <div className="font-mono text-cyan-400 font-bold text-xs pl-0.5">&gt;_</div>
        </div>
      );

    case "Chrome":
    case "Globe":
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className="drop-shadow-md">
          <circle cx="24" cy="24" r="20" fill="#f8f9fa" />
          <path d="M24 4c8.4 0 15.6 5.2 18.5 12.6l-11.4 19.8C28.8 38.6 26.5 40 24 40c-8.8 0-16-7.2-16-16 0-1.4.2-2.8.5-4.1l11.4 19.7c.3.5.7 1 1.1 1.4L24 4z" fill="#34A853"/>
          <path d="M42.5 16.6C43.5 18.9 44 21.4 44 24c0 11-9 20-20 20-1.5 0-3-.2-4.4-.5l11.5-19.9c1.6-.9 2.9-2.3 3.7-3.9l5.2-3.1z" fill="#FBBC05"/>
          <path d="M24 4c7.3 0 13.7 3.9 17.2 9.8l-11.5 19.9C28.1 33.9 26.2 34 24 34c-5.5 0-10-4.5-10-10 0-2.3.8-4.4 2.1-6.1L4.6 20.3C6.8 10.9 14.6 4 24 4z" fill="#EA4335"/>
          <circle cx="24" cy="24" r="8" fill="#ffffff" />
          <circle cx="24" cy="24" r="6" fill="#1a73e8" />
        </svg>
      );

    case "Discord":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-[#5865F2] flex items-center justify-center shadow-md p-1.5"
        >
          <svg viewBox="0 0 127.14 96.36" className="w-full h-full fill-white">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
          </svg>
        </div>
      );

    case "Spotify":
    case "Headphones":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-full bg-[#1DB954] flex items-center justify-center shadow-md p-1.5"
        >
          <svg viewBox="0 0 24 24" className="w-full h-full fill-black">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>
      );

    case "Notion":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-white flex items-center justify-center shadow-md p-1"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path d="M6.1 19.3L15.3 12.2C17.5 10.5 19.3 10.1 22.3 10.5L83.1 15.3C87.1 15.6 88.8 17.8 88.8 21.3V82.8C88.8 86.3 86.6 88.8 82.2 88.8H17.8C13.4 88.8 11.2 86.6 11.2 82.8V23.7C11.2 21.5 12.5 19.8 15.1 17.8L6.1 19.3Z" fill="#f8f9fa"/>
            <path d="M26.7 30.1V74.2H36.9V45.2L63.1 74.2H73.3V30.1H63.1V59.1L36.9 30.1H26.7Z" fill="#111111"/>
          </svg>
        </div>
      );

    case "Explorer":
    case "Folder":
      return (
        <svg viewBox="0 0 48 48" width={size} height={size} className="drop-shadow-md">
          <path d="M6 10a4 4 0 0 1 4-4h10l4 4h14a4 4 0 0 1 4 4v2H6v-6z" fill="#0078d7" />
          <rect x="4" y="14" width="40" height="26" rx="3" fill="#ffc83b" />
          <path d="M6 16h36v6H6z" fill="#ffffff" fillOpacity="0.25" />
        </svg>
      );

    case "AutoCAD":
    case "Compass":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-tr from-[#c4151c] to-[#e5252d] flex items-center justify-center text-white font-black text-2xl shadow-md border border-white/20"
        >
          A
        </div>
      );

    case "MATLAB":
    case "Flame":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-tr from-[#b33a00] to-[#e65100] flex items-center justify-center text-white shadow-md border border-white/20"
        >
          <Flame size={size > 30 ? 28 : 18} className="fill-white/20 text-white drop-shadow" />
        </div>
      );

    case "AndroidStudio":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-tr from-[#2d6b35] to-[#3ddc84] flex items-center justify-center text-white shadow-md border border-white/20 p-1.5"
        >
          <svg viewBox="0 0 24 24" className="w-full h-full fill-white">
            <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4107 13.8533 8.0827 12 8.0827s-3.5902.328-5.1368.867L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3433-4.1021-2.689-7.5743-6.1185-9.4396"/>
          </svg>
        </div>
      );

    case "7Zip":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-lg bg-[#1a1a1a] border border-white/30 flex items-center justify-center font-black text-white text-base tracking-tighter shadow-md"
        >
          7z
        </div>
      );

    case "Calculator":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-tr from-[#0284c7] to-[#38bdf8] flex items-center justify-center text-white shadow-md"
        >
          <Calculator size={size > 30 ? 24 : 16} />
        </div>
      );

    case "Notepad":
    case "FileText":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-tr from-[#059669] to-[#34d399] flex items-center justify-center text-white shadow-md"
        >
          <FileText size={size > 30 ? 24 : 16} />
        </div>
      );

    case "Settings":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-tr from-[#475569] to-[#64748b] flex items-center justify-center text-white shadow-md"
        >
          <SettingsIcon size={size > 30 ? 24 : 16} />
        </div>
      );

    case "Taskmgr":
    case "Cpu":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-tr from-[#0f766e] to-[#2dd4bf] flex items-center justify-center text-emerald-50 shadow-md"
        >
          <Cpu size={size > 30 ? 24 : 16} />
        </div>
      );

    case "MAudio":
    case "Music":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-full bg-gradient-to-tr from-[#1a237e] to-[#00b0ff] flex items-center justify-center text-white shadow-lg border border-cyan-400/30 p-1.5"
        >
          <Music size={size > 30 ? 24 : 16} className="text-white drop-shadow" />
        </div>
      );

    case "Marucast":
    case "Tv":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-tr from-[#7b1fa2] to-[#ba68c8] flex items-center justify-center text-white shadow-lg border border-purple-400/30"
        >
          <Tv size={size > 30 ? 24 : 16} className="text-white drop-shadow" />
        </div>
      );

    case "Nami":
    case "Heart":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-full bg-gradient-to-tr from-[#e91e63] to-[#ff4081] flex items-center justify-center text-white shadow-lg border border-pink-300/40"
        >
          <Heart size={size > 30 ? 24 : 16} className="fill-white text-white drop-shadow" />
        </div>
      );

    case "MonikaPiano":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-tr from-[#ec4899] to-[#8b5cf6] flex items-center justify-center text-white shadow-lg border border-pink-400/30"
        >
          <Music size={size > 30 ? 24 : 16} className="text-white drop-shadow" />
        </div>
      );

    case "FilesCompanion":
    case "Layers":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-tr from-[#3b82f6] to-[#6366f1] flex items-center justify-center text-white shadow-lg border border-blue-400/30"
        >
          <Layers size={size > 30 ? 24 : 16} className="text-white drop-shadow" />
        </div>
      );

    case "TurnsCalculator":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-tr from-[#0d9488] to-[#14b8a6] flex items-center justify-center text-white shadow-lg border border-teal-400/30"
        >
          <Calculator size={size > 30 ? 24 : 16} className="text-white drop-shadow" />
        </div>
      );

    case "Weather":
    case "CloudSun":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-full bg-gradient-to-tr from-[#f59e0b] to-[#fbbf24] flex items-center justify-center text-amber-950 shadow-md"
        >
          <CloudSun size={size > 30 ? 26 : 18} />
        </div>
      );

    case "Word":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded bg-[#185abd] flex items-center justify-center shadow-md border border-white/20"
        >
          <span className="font-extrabold text-white text-xl font-sans tracking-tight">W</span>
        </div>
      );

    case "Excel":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded bg-[#107c41] flex items-center justify-center shadow-md border border-white/20"
        >
          <span className="font-extrabold text-white text-xl font-sans tracking-tight">X</span>
        </div>
      );

    case "PowerPoint":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded bg-[#c43e1c] flex items-center justify-center shadow-md border border-white/20"
        >
          <span className="font-extrabold text-white text-xl font-sans tracking-tight">P</span>
        </div>
      );

    case "OneNote":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded bg-[#7719aa] flex items-center justify-center shadow-md border border-white/20"
        >
          <span className="font-extrabold text-white text-xl font-sans tracking-tight">N</span>
        </div>
      );

    case "Access":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded bg-[#a4373a] flex items-center justify-center shadow-md border border-white/20"
        >
          <span className="font-extrabold text-white text-xl font-sans tracking-tight">A</span>
        </div>
      );

    case "Publisher":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded bg-[#077568] flex items-center justify-center shadow-md border border-white/20"
        >
          <span className="font-extrabold text-white text-xl font-sans tracking-tight">P</span>
        </div>
      );

    case "Outlook":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded bg-[#0078d7] flex items-center justify-center shadow-md border border-white/20"
        >
          <Mail size={Math.round(size * 0.58)} className="text-white drop-shadow" />
        </div>
      );

    case "Edge":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-full bg-gradient-to-tr from-[#0078d7] to-[#00bcf2] flex items-center justify-center shadow-md border border-white/20"
        >
          <div className="w-1/2 h-1/2 rounded-full border-2 border-white" />
        </div>
      );

    case "AniList":
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-[#02a9ff] flex items-center justify-center shadow-md border border-white/20"
        >
          <span className="font-black text-white text-lg font-sans tracking-tighter">AL</span>
        </div>
      );

    default:
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md"
        >
          <Sparkles size={size > 30 ? 24 : 16} />
        </div>
      );
  }
};

export const getTileBrandPlateColor = (tile?: CustomTile): string => {
  if (tile?.color && tile.color !== "acrylic" && !tile.color.startsWith("rgba(255")) {
    return tile.color;
  }
  // Pure frosted acrylic glass - authentic Windows 10 Theme-Aware Tiles (no harsh solid colors)
  return "rgba(255, 255, 255, 0.08)";
};

export const TileBoard: React.FC<TileBoardProps> = ({
  tiles,
  allApps,
  onLaunch,
  onTileContextMenu,
  onRenameGroup,
  onMoveTile,
  onMoveToGroup,
  onMoveGroup,
  onMoveToNewGroup,
  onCreateFolder,
  onToggleFolder,
  onRemoveFromFolder,
  onResetTiles,
  isMenuOpen = true,
  config,
  onOpenAniListModal,
}) => {
  const [flippedMap, setFlippedMap] = useState<Record<string, boolean>>({});
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [groupInput, setGroupInput] = useState("");
  const [namiIndex, setNamiIndex] = useState(0);
  const [musicProgress, setMusicProgress] = useState(0.62);
  const [nowLabel, setNowLabel] = useState(() => getManilaTime());
  const [emails, setEmails] = useState<RecentEmail[]>([]);
  const [emailIndex, setEmailIndex] = useState(0);
  const [animeList, setAnimeList] = useState<AniListAnime[]>([]);
  const [animeIndex, setAnimeIndex] = useState(0);

  // Real .exe icon cache
  const [iconCache, setIconCache] = useState<Record<string, string>>({});

  // Fluent Reveal highlight cursor tracking
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);

  // Pointer-based tile drag state (for visual ghost and target highlights)
  const [pointerDrag, setPointerDrag] = useState<{
    tile: CustomTile;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
  } | null>(null);

  // Group drag state (for dragging entire group columns)
  const [groupDrag, setGroupDrag] = useState<{
    groupName: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
  } | null>(null);

  const [dragOverTileId, setDragOverTileId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [dragOverNewGroup, setDragOverNewGroup] = useState(false);
  const [makeWayTileId, setMakeWayTileId] = useState<string | null>(null);
  const [folderTargetId, setFolderTargetId] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronous ref to prevent ANY dropped events, React batching delay, or closure bugs
  const dragStateRef = useRef<{
    type: "tile" | "group";
    tile?: CustomTile;
    groupName?: string;
    startX: number;
    startY: number;
    hasDragged: boolean;
    targetTileId: string | null;
    targetGroupId: string | null;
    targetNewGroup: boolean;
    dropAction: "reorder" | "folder" | null;
  } | null>(null);

  // Fetch real exe icons for tiles
  useEffect(() => {
    tiles.forEach((t) => {
      const appPath = t.appPath;
      if (!appPath || iconCache[t.id]) return;

      // 1. Check if allApps already has this shortcut with an icon
      if (allApps && allApps.length > 0) {
        const match = allApps.find(
          (a) =>
            a.path.toLowerCase() === appPath.toLowerCase() ||
            a.name.toLowerCase() === t.title.toLowerCase() ||
            a.path.toLowerCase().endsWith(appPath.toLowerCase())
        );
        if (match?.icon) {
          setIconCache((prev) => ({ ...prev, [t.id]: match.icon! }));
          return;
        }
      }

      // 2. Fetch directly from native Rust shell extractor
      invoke<string | null>("get_app_icon", { path: appPath })
        .then((icon) => {
          if (icon) {
            setIconCache((prev) => ({ ...prev, [t.id]: icon }));
          }
        })
        .catch(() => {});
    });
  }, [tiles, allApps, iconCache]);

  // Pointer Drag Event Listeners on Window for 100% reliable tracking
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state) return;

      const dist = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
      if (dist > 6) {
        state.hasDragged = true;

        if (state.type === "tile" && state.tile) {
          setPointerDrag({
            tile: state.tile,
            startX: state.startX,
            startY: state.startY,
            currentX: e.clientX,
            currentY: e.clientY,
            isDragging: true,
          });

          // Inspect elements underneath cursor (ghost has pointer-events-none)
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const tileEl = el?.closest("[data-tile-id]");
          const groupEl = el?.closest("[data-group-name]");
          const newGroupEl = el?.closest("[data-new-group-zone]");

          const overTile = tileEl?.getAttribute("data-tile-id") || null;
          const overGroup = groupEl?.getAttribute("data-group-name") || null;
          const isOverNewGroupZone = !!newGroupEl;

          state.targetNewGroup = isOverNewGroupZone;
          setDragOverNewGroup(isOverNewGroupZone);

          const validTileTarget = overTile && overTile !== state.tile.id ? overTile : null;

          if (validTileTarget !== state.targetTileId) {
            state.targetTileId = validTileTarget;
            setDragOverTileId(validTileTarget);

            if (hoverTimerRef.current) {
              clearTimeout(hoverTimerRef.current);
              hoverTimerRef.current = null;
            }

            if (validTileTarget) {
              // Initially in folder drop mode (drop immediately = create folder!)
              state.dropAction = "folder";
              setFolderTargetId(validTileTarget);
              setMakeWayTileId(null);

              // If held over the tile for >= 380ms, tiles make way!
              hoverTimerRef.current = setTimeout(() => {
                state.dropAction = "reorder";
                setMakeWayTileId(validTileTarget);
                setFolderTargetId(null);
              }, 380);
            } else {
              state.dropAction = null;
              setFolderTargetId(null);
              setMakeWayTileId(null);
            }
          }

          state.targetGroupId = overGroup;
          setDragOverGroupId(overGroup);
        } else if (state.type === "group" && state.groupName) {
          setGroupDrag({
            groupName: state.groupName,
            startX: state.startX,
            startY: state.startY,
            currentX: e.clientX,
            currentY: e.clientY,
            isDragging: true,
          });

          const el = document.elementFromPoint(e.clientX, e.clientY);
          const groupEl = el?.closest("[data-group-name]");
          const overGroup = groupEl?.getAttribute("data-group-name") || null;

          const validGroupTarget = overGroup && overGroup !== state.groupName ? overGroup : null;
          state.targetGroupId = validGroupTarget;

          setDragOverGroupId(validGroupTarget);
        }
      }
    };

    const onPointerUp = () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }

      const state = dragStateRef.current;
      if (state) {
        if (state.hasDragged) {
          if (state.type === "tile" && state.tile) {
            if (state.targetNewGroup && onMoveToNewGroup) {
              onMoveToNewGroup(state.tile.id);
            } else if (state.targetTileId && state.targetTileId !== state.tile.id) {
              if (state.dropAction === "folder" && onCreateFolder) {
                onCreateFolder(state.tile.id, state.targetTileId);
              } else {
                onMoveTile(state.tile.id, state.targetTileId);
              }
            } else if (state.targetGroupId) {
              onMoveToGroup(state.tile.id, state.targetGroupId);
            }
          } else if (state.type === "group" && state.groupName) {
            if (state.targetGroupId && state.targetGroupId !== state.groupName && onMoveGroup) {
              onMoveGroup(state.groupName, state.targetGroupId);
            }
          }
        } else {
          // Clean Click!
          if (state.type === "tile" && state.tile) {
            const tile = state.tile;
            if (tile.isFolder && onToggleFolder) {
              onToggleFolder(tile.id);
            } else {
              const override = config?.tileLaunchOverrides?.[tile.id];
              const mode =
                override?.launchMode ||
                tile.launchMode ||
                (tile.liveType === "anilist" ? "dedicated" : "app");

              if (
                mode === "dedicated" &&
                (tile.liveType === "anilist" || tile.id.includes("anilist")) &&
                onOpenAniListModal
              ) {
                onOpenAniListModal();
              } else if (mode === "web") {
                const targetUrl =
                  override?.customTarget ||
                  tile.webUrl ||
                  (tile.liveType === "anilist"
                    ? "https://anilist.co/user/PpolHi"
                    : tile.appPath);
                if (targetUrl) onLaunch(targetUrl);
              } else {
                const target =
                  override?.customTarget || tile.appPath || tile.webUrl;
                if (target) onLaunch(target);
              }
            }
          }
        }
      }

      dragStateRef.current = null;
      setPointerDrag(null);
      setGroupDrag(null);
      setDragOverTileId(null);
      setDragOverGroupId(null);
      setDragOverNewGroup(false);
      setFolderTargetId(null);
      setMakeWayTileId(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [
    onMoveTile,
    onMoveToGroup,
    onMoveGroup,
    onMoveToNewGroup,
    onCreateFolder,
    onToggleFolder,
    onLaunch,
    config,
    onOpenAniListModal,
  ]);

  // Fetch Outlook MAPI emails and AniList watchlist when menu is open
  useEffect(() => {
    if (!isMenuOpen) return;

    // 1. Outlook MAPI Local
    invoke<RecentEmail[]>("get_recent_emails")
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setEmails(res);
        }
      })
      .catch(() => {});

    // 2. AniList currently watching for user PpolHi
    const query = `
      query {
        MediaListCollection(userName: "PpolHi", type: ANIME, status: CURRENT) {
          lists {
            entries {
              progress
              media {
                title {
                  userPreferred
                  english
                  romaji
                }
                episodes
                coverImage {
                  medium
                  large
                }
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
        const entries = lists.flatMap((l: any) => l.entries || []);
        if (entries.length > 0) {
          const parsed: AniListAnime[] = entries.map((e: any) => ({
            title:
              e.media?.title?.userPreferred ||
              e.media?.title?.english ||
              e.media?.title?.romaji ||
              "Anime",
            progress: e.progress ?? 0,
            episodes: e.media?.episodes ?? null,
            coverImage: e.media?.coverImage?.large || e.media?.coverImage?.medium || "",
          }));
          setAnimeList(parsed);
        }
      })
      .catch(() => {});
  }, [isMenuOpen]);

  // Cycle Live Tiles every 6 seconds ONLY when menu is open
  useEffect(() => {
    if (!isMenuOpen) return;
    const timer = setInterval(() => {
      setFlippedMap((prev) => {
        const next = { ...prev };
        tiles.forEach((t) => {
          if (t.isLive) {
            next[t.id] = !next[t.id];
          }
        });
        return next;
      });
      setNamiIndex((i) => (i + 1) % NAMI_QUOTES.length);
      setMusicProgress((p) => (p >= 0.97 ? 0.05 : Math.min(0.97, p + 0.015)));
      setEmailIndex((i) => (emails.length > 0 ? (i + 1) % emails.length : 0));
      setAnimeIndex((i) => (animeList.length > 0 ? (i + 1) % animeList.length : 0));
    }, 6000);
    return () => clearInterval(timer);
  }, [tiles, isMenuOpen, emails.length, animeList.length]);

  // Manila clock for live tiles ONLY when menu is open
  useEffect(() => {
    if (!isMenuOpen) return;
    const clock = setInterval(() => setNowLabel(getManilaTime()), 30000);
    return () => clearInterval(clock);
  }, [isMenuOpen]);

  // Empty groups dissolve automatically: only include groups that currently have at least one tile!
  const groups = Array.from(
    new Set(tiles.map((t) => t.group).filter(Boolean))
  ).filter((groupName) => tiles.some((t) => t.group === groupName));

  const handleGroupClick = (group: string) => {
    setEditingGroup(group);
    setGroupInput(group);
  };

  const handleGroupSave = (oldName: string) => {
    const trimmed = groupInput.trim();
    if (trimmed && trimmed !== oldName) {
      onRenameGroup(oldName, trimmed);
    }
    setEditingGroup(null);
  };

  const getTileIcon = (tile: CustomTile): string | undefined => {
    if (iconCache[tile.id]) return iconCache[tile.id];
    if (allApps && allApps.length > 0) {
      const tTitle = tile.title.toLowerCase().trim();
      const tPath = (tile.appPath || "").toLowerCase().trim();

      // 1. Exact path match or endsWith match
      if (tPath) {
        const pathMatch = allApps.find(
          (a) =>
            a.path.toLowerCase() === tPath ||
            a.path.toLowerCase().endsWith(tPath) ||
            tPath.endsWith(a.path.toLowerCase())
        );
        if (pathMatch?.icon) return pathMatch.icon;
      }

      // 2. Exact name match
      const exactNameMatch = allApps.find((a) => a.name.toLowerCase() === tTitle);
      if (exactNameMatch?.icon) return exactNameMatch.icon;

      // 3. Substring / inclusion match (e.g. "VS Code" vs "Visual Studio Code", "Chrome" vs "Google Chrome")
      const fuzzyMatch = allApps.find((a) => {
        const aName = a.name.toLowerCase();
        return (
          aName.includes(tTitle) ||
          tTitle.includes(aName) ||
          (tTitle.includes("vscode") && aName.includes("code")) ||
          (tTitle.includes("terminal") && aName.includes("terminal")) ||
          (tTitle.includes("chrome") && aName.includes("chrome")) ||
          (tTitle.includes("discord") && aName.includes("discord")) ||
          (tTitle.includes("spotify") && aName.includes("spotify")) ||
          (tTitle.includes("notion") && aName.includes("notion")) ||
          (tTitle.includes("explorer") && (aName.includes("explorer") || aName.includes("file"))) ||
          (tTitle.includes("autocad") && aName.includes("autocad")) ||
          (tTitle.includes("matlab") && aName.includes("matlab")) ||
          (tTitle.includes("android") && aName.includes("android")) ||
          (tTitle.includes("7zip") && aName.includes("7-zip")) ||
          (tTitle.includes("calc") && aName.includes("calculator")) ||
          (tTitle.includes("note") && aName.includes("notepad")) ||
          (tTitle.includes("taskmgr") && aName.includes("task manager")) ||
          (tTitle.includes("settings") && aName.includes("settings")) ||
          (tTitle.includes("steam") && aName.includes("steam")) ||
          (tTitle.includes("telegram") && aName.includes("telegram")) ||
          (tTitle.includes("stremio") && aName.includes("stremio"))
        );
      });
      if (fuzzyMatch?.icon) return fuzzyMatch.icon;
    }
    return undefined;
  };

  let globalTileCounter = 0;

  return (
    <div
      className="flex-1 h-full overflow-x-auto overflow-y-auto flex items-start justify-start select-none relative custom-scroll"
      onContextMenu={(e) => e.preventDefault()}
      onPointerMove={(e) => setPointerPos({ x: e.clientX, y: e.clientY })}
      onPointerLeave={() => setPointerPos(null)}
    >
      {tiles.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-20 pointer-events-auto">
          <div className="w-16 h-16 rounded-none bg-white/[0.08] border border-white/20 flex items-center justify-center text-white shadow-xl mb-4">
            <Pin size={30} className="text-white drop-shadow-sm -rotate-45" strokeWidth={1.8} />
          </div>
          <div className="text-lg md:text-xl font-normal text-white/90 max-w-lg leading-relaxed">
            Pin Tiles by selecting them from the Live Tiles Store or All Apps
          </div>
          <button
            onClick={onResetTiles}
            className="mt-5 px-5 py-2 bg-[#0078d7] hover:bg-[#1e8be8] active:bg-[#005a9e] text-white text-sm font-medium rounded-none transition-colors shadow-md cursor-pointer"
          >
            Restore default tiles
          </button>
        </div>
      ) : (
        <div
          className="flex flex-row gap-10 lg:gap-14 items-start min-w-max mx-auto overflow-visible no-scrollbar"
          style={{ paddingTop: "96px", paddingBottom: "120px", paddingLeft: "56px", paddingRight: "72px", minHeight: "100%" }}
        >
          {groups.map((groupName) => {
            const groupTiles = tiles.filter((t) => t.group === groupName);
            const isGroupBeingDragged = groupDrag?.isDragging && groupDrag.groupName === groupName;
            const isGroupTarget = dragOverGroupId === groupName;

            return (
              <div
                key={groupName}
                data-group-name={groupName}
                className={`flex flex-col gap-4 w-[472px] shrink-0 p-1.5 rounded-none transition-all ${
                  isGroupBeingDragged
                    ? "opacity-35 scale-[0.98] border-2 border-dashed border-white/40"
                    : isGroupTarget && groupDrag?.isDragging
                    ? "bg-white/[0.08] ring-2 ring-[#0078d7]"
                    : isGroupTarget && pointerDrag?.isDragging
                    ? "bg-white/[0.04] ring-1 ring-[#0078d7]/50"
                    : ""
                }`}
              >
                {/* Category Header */}
                <div
                  className="group flex items-center justify-between px-1 pb-1 cursor-grab active:cursor-grabbing select-none"
                  onPointerDown={(e) => {
                    if (editingGroup === groupName) return;
                    if (e.button === 0) {
                      dragStateRef.current = {
                        type: "group",
                        groupName,
                        startX: e.clientX,
                        startY: e.clientY,
                        hasDragged: false,
                        targetTileId: null,
                        targetGroupId: null,
                        targetNewGroup: false,
                        dropAction: null,
                      };
                    }
                  }}
                >
                  {editingGroup === groupName ? (
                    <input
                      type="text"
                      value={groupInput}
                      autoFocus
                      onChange={(e) => setGroupInput(e.target.value)}
                      onBlur={() => handleGroupSave(groupName)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleGroupSave(groupName);
                        if (e.key === "Escape") setEditingGroup(null);
                      }}
                      className="bg-black/80 border-b-2 border-[#0078d7] text-white px-2 py-1 text-lg font-semibold rounded-none focus:outline-none w-64 cursor-text"
                    />
                  ) : (
                    <h2
                      onClick={() => {
                        if (!dragStateRef.current?.hasDragged) {
                          handleGroupClick(groupName);
                        }
                      }}
                      title="Click to rename, or drag to reorder group"
                      className="text-xl font-semibold tracking-wide text-white/95 hover:text-white select-none transition-colors cursor-pointer"
                    >
                      {groupName}
                    </h2>
                  )}
                  <span
                    className="opacity-60 group-hover:opacity-100 text-base font-mono text-white/80 select-none cursor-grab active:cursor-grabbing transition-opacity"
                    title="Drag to reorder group"
                  >
                    ☰
                  </span>
                </div>

                {/* 6-Column CSS Grid with 72px base unit and authentic 4px gap */}
                <div className="grid grid-cols-6 auto-rows-[72px] gap-1">
                  {groupTiles.map((tile) => {
                    const tileIndex = globalTileCounter++;
                    const realIcon = getTileIcon(tile);

                    return (
                      <TileItem
                        key={tile.id}
                        tile={tile}
                        index={tileIndex}
                        realIcon={realIcon}
                        isFlipped={!!flippedMap[tile.id]}
                        namiQuote={NAMI_QUOTES[namiIndex % NAMI_QUOTES.length]}
                        musicProgress={musicProgress}
                        nowLabel={nowLabel}
                        dateLabel={getManilaDate()}
                        pointerPos={pointerPos}
                        isDraggingThis={pointerDrag?.isDragging === true && pointerDrag.tile.id === tile.id}
                        isDragTarget={dragOverTileId === tile.id && pointerDrag?.tile.id !== tile.id}
                        isMakeWayTarget={makeWayTileId === tile.id}
                        isFolderTarget={folderTargetId === tile.id}
                        currentEmail={emails[emailIndex % (emails.length || 1)] || null}
                        nextEmail={emails[(emailIndex + 1) % (emails.length || 1)] || null}
                        totalUnreadEmails={emails[0]?.unread_count ?? 0}
                        emailsCount={emails.length}
                        currentAnime={animeList[animeIndex % (animeList.length || 1)] || null}
                        nextAnime={animeList[(animeIndex + 1) % (animeList.length || 1)] || null}
                        animeListCount={animeList.length}
                        onToggleFolder={onToggleFolder}
                        onRemoveFromFolder={onRemoveFromFolder}
                        onLaunchApp={onLaunch}
                        getTileIconFn={getTileIcon}
                        onPointerDownTile={(e) => {
                          if (e.button === 0) {
                            dragStateRef.current = {
                              type: "tile",
                              tile,
                              startX: e.clientX,
                              startY: e.clientY,
                              hasDragged: false,
                              targetTileId: null,
                              targetGroupId: null,
                              targetNewGroup: false,
                              dropAction: null,
                            };
                          }
                        }}
                        onContextMenu={(e) => onTileContextMenu(e, tile)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* New Group Drop Zone (illuminates when dragging any tile) */}
          {pointerDrag?.isDragging && (
            <div
              data-new-group-zone="true"
              className={`flex flex-col items-center justify-center w-56 shrink-0 h-[340px] border-2 border-dashed transition-all select-none p-4 rounded-none ${
                dragOverNewGroup
                  ? "border-[#0078d7] bg-[#0078d7]/20 text-white scale-[1.02] shadow-2xl shadow-[#0078d7]/30"
                  : "border-white/30 text-white/50 bg-white/[0.02] hover:border-white/50"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  dragOverNewGroup ? "bg-[#0078d7] text-white" : "bg-white/10 text-white/70"
                }`}
              >
                <Plus size={28} />
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider text-center leading-snug">
                Drag here to create<br />new tab group
              </span>
            </div>
          )}
        </div>
      )}

      {/* Floating Dragged Group Ghost */}
      {groupDrag?.isDragging && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-black/85 border border-[#0078d7] backdrop-blur-xl shadow-2xl flex items-center gap-3 text-white select-none scale-105"
          style={{
            left: groupDrag.currentX,
            top: groupDrag.currentY,
          }}
        >
          <span className="font-mono text-[#0078d7] text-lg">☰</span>
          <span className="text-base font-semibold tracking-wide">{groupDrag.groupName}</span>
        </div>
      )}

      {/* Floating Dragged Tile Ghost (pinned to cursor while dragging) */}
      {pointerDrag?.isDragging && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 shadow-2xl scale-105 border border-white/40 backdrop-blur-xl transition-transform overflow-hidden"
          style={{
            left: pointerDrag.currentX,
            top: pointerDrag.currentY,
            width:
              pointerDrag.tile.size === "small"
                ? 72
                : pointerDrag.tile.size === "wide" || pointerDrag.tile.size === "large"
                ? 312
                : 152,
            height:
              pointerDrag.tile.size === "small"
                ? 72
                : pointerDrag.tile.size === "large"
                ? 312
                : 152,
            backgroundColor: getTileBrandPlateColor(pointerDrag.tile),
          }}
        >
          <div className="w-full h-full p-2.5 flex flex-col justify-between text-white select-none">
            <div className="flex-1 flex items-center justify-center">
              {getTileIcon(pointerDrag.tile) ? (
                <img
                  src={getTileIcon(pointerDrag.tile)}
                  alt={pointerDrag.tile.title}
                  style={{ imageRendering: "-webkit-optimize-contrast" }}
                  className={
                    pointerDrag.tile.size === "small"
                      ? "w-7 h-7 object-contain drop-shadow"
                      : "w-12 h-12 object-contain drop-shadow"
                  }
                />
              ) : isBrandIcon(pointerDrag.tile.iconName) ? (
                renderRichIcon(
                  pointerDrag.tile.iconName,
                  pointerDrag.tile.size === "small" ? 28 : 52
                )
              ) : (
                renderRichIcon(
                  pointerDrag.tile.iconName,
                  pointerDrag.tile.size === "small" ? 28 : 52
                )
              )}
            </div>
            {pointerDrag.tile.size !== "small" && (
              <div className="text-[11px] font-normal leading-tight truncate drop-shadow pl-1.5 pb-1 text-white/90">
                {pointerDrag.tile.title}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface TileItemProps {
  tile: CustomTile;
  index: number;
  realIcon?: string;
  isFlipped: boolean;
  namiQuote: string;
  musicProgress: number;
  nowLabel: string;
  dateLabel: string;
  pointerPos: { x: number; y: number } | null;
  isDraggingThis: boolean;
  isDragTarget: boolean;
  isMakeWayTarget?: boolean;
  isFolderTarget?: boolean;
  currentEmail?: RecentEmail | null;
  nextEmail?: RecentEmail | null;
  totalUnreadEmails?: number;
  emailsCount?: number;
  currentAnime?: AniListAnime | null;
  nextAnime?: AniListAnime | null;
  animeListCount?: number;
  onPointerDownTile: (e: React.PointerEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onToggleFolder?: (folderId: string) => void;
  onRemoveFromFolder?: (folderId: string, subTileId: string) => void;
  onLaunchApp?: (path: string) => void;
  getTileIconFn?: (tile: CustomTile) => string | undefined;
}

const TileItem: React.FC<TileItemProps> = ({
  tile,
  index,
  realIcon,
  isFlipped,
  namiQuote,
  musicProgress,
  nowLabel,
  pointerPos,
  isDraggingThis,
  isDragTarget,
  isMakeWayTarget,
  isFolderTarget,
  currentEmail,
  nextEmail,
  totalUnreadEmails = 0,
  currentAnime,
  nextAnime,
  animeListCount = 0,
  onPointerDownTile,
  onContextMenu,
  onToggleFolder,
  onRemoveFromFolder,
  onLaunchApp,
  getTileIconFn,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const [localGlow, setLocalGlow] = useState<{ x: number; y: number } | null>(null);

  // Compute authentic Windows 10 Reveal highlight proximity (<140px)
  const reveal = useMemo(() => {
    if (!pointerPos || !itemRef.current) return null;
    const rect = itemRef.current.getBoundingClientRect();
    const radius = 140;
    if (
      pointerPos.x < rect.left - radius ||
      pointerPos.x > rect.right + radius ||
      pointerPos.y < rect.top - radius ||
      pointerPos.y > rect.bottom + radius
    ) {
      return null;
    }
    const relX = pointerPos.x - rect.left;
    const relY = pointerPos.y - rect.top;
    const isHovered =
      relX >= 0 && relX <= rect.width && relY >= 0 && relY <= rect.height;

    return { relX, relY, isHovered };
  }, [pointerPos]);

  const getGridSpan = (size: TileSize) => {
    switch (size) {
      case "small":
        return "col-span-1 row-span-1"; // 72px x 72px
      case "medium":
        return "col-span-2 row-span-2"; // 152px x 152px
      case "wide":
        return "col-span-4 row-span-2"; // 312px x 152px
      case "large":
        return "col-span-4 row-span-4"; // 312px x 312px
    }
  };

  // Authentic Windows 10 Ghost Placeholder when being dragged
  if (isDraggingThis) {
    return (
      <div
        data-tile-id={tile.id}
        className={`relative select-none border-2 border-dashed border-white/35 bg-white/[0.04] flex items-center justify-center scale-[0.98] transition-all ${getGridSpan(
          tile.size
        )}`}
      >
        <div className="opacity-20 flex flex-col items-center justify-center pointer-events-none">
          {realIcon ? (
            <img
              src={realIcon}
              alt={tile.title}
              style={{ imageRendering: "-webkit-optimize-contrast" }}
              className="w-8 h-8 object-contain"
            />
          ) : isBrandIcon(tile.iconName) ? (
            renderRichIcon(tile.iconName, tile.size === "small" ? 24 : 40)
          ) : (
            renderRichIcon(tile.iconName, tile.size === "small" ? 24 : 40)
          )}
        </div>
      </div>
    );
  }

  // 3D Tilt on Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    onPointerDownTile(e);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -10;
    const rotY = ((x - centerX) / centerX) * 10;

    setTiltStyle({
      transform: `perspective(450px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(0.97)`,
      transition: "transform 0.08s ease-out",
    });
  };

  const handlePointerUp = () => {
    setTiltStyle({
      transform: "perspective(450px) rotateX(0deg) rotateY(0deg) scale(1)",
      transition: "transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)",
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setLocalGlow({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    handlePointerUp();
    setLocalGlow(null);
  };

  const tileBackground = getTileBrandPlateColor(tile);
  const cascadeDelay = `${Math.min(index * 24, 400)}ms`;

  const renderTileIcon = () => {
    // 1. Known brand icons where Windows shortcuts often extract a generic white document
    if (tile.iconName === "Discord") {
      return renderRichIcon("Discord", tile.size === "small" ? 28 : 52);
    }
    // 2. ALWAYS prioritize authentic extracted Windows application icon!
    if (realIcon) {
      return (
        <img
          src={realIcon}
          alt={tile.title}
          style={{ imageRendering: "-webkit-optimize-contrast" }}
          className={
            tile.size === "small"
              ? "w-7 h-7 object-contain drop-shadow"
              : "w-12 h-12 object-contain drop-shadow"
          }
        />
      );
    }
    // 3. High-fidelity brand SVG fallback if exe icon is not yet loaded
    if (isBrandIcon(tile.iconName)) {
      return renderRichIcon(tile.iconName, tile.size === "small" ? 28 : 52);
    }
    return renderRichIcon(tile.iconName, tile.size === "small" ? 28 : 52);
  };

  return (
    <div
      ref={itemRef}
      data-tile-id={tile.id}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e);
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...tiltStyle,
        backgroundColor: tileBackground,
        animationDelay: cascadeDelay,
        cursor: "pointer",
      }}
      className={`relative select-none reveal-surface overflow-hidden animate-cascade flip-card transition-all duration-150 ${getGridSpan(
        tile.size
      )} ${tile.isLive && isFlipped ? "is-flipped" : ""} ${
        isFolderTarget
          ? "ring-2 ring-emerald-400 border-emerald-400 scale-[0.96] z-20 shadow-xl shadow-emerald-500/30"
          : isMakeWayTarget
          ? "translate-x-3 ring-2 ring-[#0078d7] border-[#0078d7] z-20 shadow-xl"
          : isDragTarget
          ? "ring-2 ring-[#0078d7] border-[#0078d7] scale-[1.03] z-20 shadow-2xl shadow-black/60"
          : ""
      }`}
    >
      {/* Folder or Reorder Indicators */}
      {isFolderTarget && (
        <div className="absolute top-1.5 right-1.5 z-30 bg-emerald-600 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider rounded text-white shadow-md flex items-center gap-1 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
          <Folder size={11} />
          <span>Folder</span>
        </div>
      )}
      {isMakeWayTarget && (
        <div className="absolute top-1.5 right-1.5 z-30 bg-[#0078d7] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider rounded text-white shadow-md flex items-center gap-1 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
          <span>Move</span>
        </div>
      )}

      {/* Fluent Reveal Border Spotlight (illuminates neighbouring tiles within 140px) */}
      {reveal && (
        <div
          className="pointer-events-none absolute inset-0 z-10 border border-transparent"
          style={{
            borderImage: `radial-gradient(circle 120px at ${reveal.relX}px ${reveal.relY}px, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.08) 60%, transparent 100%) 1`,
          }}
        />
      )}

      {/* Fluent Reveal Surface Spotlight Glow (on hovered tile) */}
      {(reveal?.isHovered || localGlow) && (
        <div
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            background: `radial-gradient(circle 130px at ${
              localGlow?.x ?? reveal?.relX ?? 75
            }px ${localGlow?.y ?? reveal?.relY ?? 75}px, rgba(255, 255, 255, 0.18), transparent 75%)`,
          }}
        />
      )}

      {/* Card Content (3D Tumbler for Live Tiles) */}
      <div className="flip-card-inner w-full h-full pointer-events-none">
        {/* Front Face */}
        <div className="flip-front flex flex-col justify-between text-white">
          {tile.isLive && tile.liveType === "weather" ? (
            <div className="w-full h-full flex flex-col justify-between p-3.5 bg-white/[0.04] text-white select-none">
              <div className="flex items-start justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-light tracking-tighter leading-none text-white font-sans">
                    29°
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-normal text-white/95 leading-tight">Partly Cloudy</span>
                    <span className="text-[11px] text-white/60">H: 31° &bull; L: 25°</span>
                  </div>
                </div>
                <CloudSun size={32} className="text-amber-300 drop-shadow shrink-0" />
              </div>

              {/* Authentic Windows 10 App Label Stamp at bottom-left */}
              <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                <div className="flex items-center gap-1.5">
                  <CloudSun size={13} className="text-white/80" />
                  <span>Weather</span>
                </div>
                <span className="text-white/50 text-[11px]">Iloilo City</span>
              </div>
            </div>
          ) : tile.isLive && tile.liveType === "music" ? (
            <div className="w-full h-full flex flex-col justify-between p-3.5 bg-white/[0.04] text-white select-none">
              <div className="flex flex-col gap-1">
                <div className="text-[16px] font-semibold text-white tracking-tight truncate leading-tight">
                  Lavie
                </div>
                <div className="text-[12px] text-white/75 truncate font-normal">
                  THREEE feat. Kagamine Len
                </div>
                <div className="text-[11px] text-white/50 truncate font-normal">
                  Apple Music &bull; Lossless
                </div>
              </div>

              {/* 2px Flat Accent Line for Progress */}
              <div className="w-full bg-white/10 h-[2px] rounded-none overflow-hidden my-auto">
                <div
                  className="bg-[#0078d7] h-full rounded-none transition-all duration-1000"
                  style={{ width: `${Math.round(musicProgress * 100)}%` }}
                />
              </div>

              {/* Authentic Windows 10 App Label Stamp at bottom-left */}
              <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                <div className="flex items-center gap-1.5">
                  <Music size={13} className="text-white/80" />
                  <span>Groove Music</span>
                </div>
                <span className="text-cyan-300 text-[11px] font-mono">{nowLabel}</span>
              </div>
            </div>
          ) : tile.isLive && tile.liveType === "nami" ? (
            <div className="w-full h-full flex flex-col justify-between p-3.5 bg-white/[0.04] text-white select-none">
              <div className="flex flex-col gap-1.5">
                <div className="text-[13px] font-semibold text-white flex items-center gap-1.5">
                  <span>Nanami</span>
                  <span className="text-[10px] text-emerald-400 font-mono">ACTIVE</span>
                </div>
                <p className="text-[12px] text-white/85 leading-snug line-clamp-2 font-normal italic">
                  &quot;{namiQuote}&quot;
                </p>
              </div>

              {/* Authentic Windows 10 App Label Stamp at bottom-left */}
              <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                <div className="flex items-center gap-1.5">
                  <Heart size={13} className="fill-pink-400 text-pink-400" />
                  <span>Nanami Companion</span>
                </div>
                <span className="text-white/50 text-[11px]">Maru AI</span>
              </div>
            </div>
          ) : tile.isLive && tile.liveType === "system" ? (
            <div className="w-full h-full flex flex-col justify-between p-3.5 bg-white/[0.04] text-white select-none">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-4xl font-light tracking-tighter text-white font-sans">
                    18%
                  </div>
                  <div className="text-[12px] text-white/80 font-normal mt-0.5">
                    CPU Utilization
                  </div>
                </div>
                <Cpu size={24} className="text-emerald-400 shrink-0" />
              </div>

              <div className="text-[11px] text-white/60">
                RAM: 3.2 / 8.0 GB &bull; Snappy ⚡
              </div>

              {/* Authentic Windows 10 App Label Stamp at bottom-left */}
              <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                <div className="flex items-center gap-1.5">
                  <Cpu size={13} className="text-white/80" />
                  <span>Task Manager</span>
                </div>
                <span className="text-emerald-400 text-[11px]">Healthy</span>
              </div>
            </div>
          ) : tile.isLive && tile.liveType === "email" ? (
            <div className="w-full h-full flex flex-col justify-between p-3.5 bg-white/[0.04] text-white select-none">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <div className="text-[14px] font-semibold text-white truncate max-w-[200px]">
                    {currentEmail?.sender || "Outlook (classic)"}
                  </div>
                  <span className="text-[11px] text-white/60 font-normal">
                    {currentEmail?.time || nowLabel}
                  </span>
                </div>
                <div className="text-[12.5px] font-normal text-white/90 truncate leading-snug mt-0.5">
                  {currentEmail?.subject || "Inbox up to date"}
                </div>
                <div className="text-[11.5px] text-white/50 truncate font-normal mt-0.5">
                  {totalUnreadEmails > 0 ? `${totalUnreadEmails} unread messages` : "All caught up"}
                </div>
              </div>

              {/* Authentic Windows 10 App Label Stamp at bottom-left */}
              <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                <div className="flex items-center gap-1.5">
                  <Mail size={13} className="text-white/80" />
                  <span>Outlook (classic)</span>
                </div>
                {totalUnreadEmails > 0 && (
                  <span className="text-[11px] font-bold text-cyan-300">
                    {totalUnreadEmails}
                  </span>
                )}
              </div>
            </div>
          ) : tile.isLive && tile.liveType === "anilist" ? (
            <div className="w-full h-full flex flex-col justify-between p-3.5 bg-white/[0.04] text-white select-none">
              <div className="flex items-center gap-3.5">
                {currentAnime?.coverImage ? (
                  <img
                    src={currentAnime.coverImage}
                    alt={currentAnime.title}
                    style={{ imageRendering: "-webkit-optimize-contrast" }}
                    className="w-14 h-20 rounded-none object-cover shadow-md shrink-0 border border-white/10"
                  />
                ) : (
                  <div className="w-14 h-20 rounded-none bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="font-bold text-white text-base">AL</span>
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-[15px] font-semibold text-white truncate leading-snug">
                    {currentAnime?.title || "AniList Watchlist"}
                  </div>
                  <div className="text-[12px] text-white/85 font-normal mt-1 truncate">
                    {currentAnime
                      ? `Episode ${currentAnime.progress} of ${currentAnime.episodes || "?"}`
                      : "Currently Watching"}
                  </div>
                  <div className="text-[11px] text-white/50 mt-0.5 truncate">
                    Next: Seasonal broadcast
                  </div>
                  {currentAnime && (
                    <div className="w-full bg-white/15 h-[2px] mt-2.5 rounded-none overflow-hidden">
                      <div
                        className="bg-[#02a9ff] h-full rounded-none transition-all duration-700"
                        style={{
                          width: `${
                            currentAnime.episodes
                              ? Math.min(100, Math.round((currentAnime.progress / currentAnime.episodes) * 100))
                              : 50
                          }%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Authentic Windows 10 App Label Stamp at bottom-left */}
              <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#02a9ff] font-bold text-xs">AL</span>
                  <span>AniList</span>
                </div>
                <span className="text-white/50 text-[11px]">Watching</span>
              </div>
            </div>
          ) : tile.isFolder ? (
            <div className="w-full h-full p-2.5 flex flex-col justify-between text-white">
              <div className="grid grid-cols-2 gap-1.5 flex-1 items-center justify-center p-1">
                {(tile.subTiles || []).slice(0, 4).map((sub) => (
                  <div
                    key={sub.id}
                    className="w-10 h-10 rounded-none bg-white/10 flex items-center justify-center shadow-sm"
                  >
                    {getTileIconFn?.(sub) ? (
                      <img
                        src={getTileIconFn(sub)}
                        alt={sub.title}
                        style={{ imageRendering: "-webkit-optimize-contrast" }}
                        className="w-6 h-6 object-contain drop-shadow"
                      />
                    ) : (
                      <Sparkles size={16} className="text-cyan-300" />
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[11px] font-medium leading-tight truncate drop-shadow pl-1 pb-0.5 text-white/90 flex items-center gap-1.5">
                <Folder size={12} className="text-amber-300 shrink-0" />
                <span>{tile.title || "Folder"}</span>
              </div>
            </div>
          ) : tile.customImage ? (
            <div className="w-full h-full relative overflow-hidden select-none">
              <img
                src={tile.customImage}
                alt={tile.title}
                style={{ imageRendering: "-webkit-optimize-contrast" }}
                className="w-full h-full object-cover pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
              {tile.size !== "small" && (
                <div className="absolute bottom-1.5 left-2 right-2 text-[11px] font-normal leading-tight truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] text-white select-none">
                  {tile.title}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col justify-between p-2.5 text-white">
              <div className="flex-1 flex items-center justify-center">
                {renderTileIcon()}
              </div>
              {tile.size !== "small" && (
                <div className="text-[11px] font-normal leading-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] pl-1 pb-0.5 text-white/95">
                  {tile.title}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back Face (Rich Windows 10 Live Info) */}
        {tile.isLive && (
          <div className="flip-back flex flex-col justify-between text-white overflow-hidden">
            {tile.liveType === "weather" && (
              <div className="flex flex-col justify-between h-full p-3.5 bg-white/[0.04] text-white select-none">
                <div className="flex items-center justify-between text-[11px] font-normal text-white/70 uppercase tracking-wider">
                  <span>Iloilo City 4-Day Forecast</span>
                  <span className="font-mono text-white/50">{nowLabel}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center my-auto">
                  <div className="flex flex-col items-center p-1">
                    <span className="text-[10px] text-white/60 uppercase">Thu</span>
                    <CloudSun size={18} className="text-amber-300 my-1" />
                    <span className="text-xs font-semibold">29°</span>
                  </div>
                  <div className="flex flex-col items-center p-1">
                    <span className="text-[10px] text-white/60 uppercase">Fri</span>
                    <CloudSun size={18} className="text-cyan-300 my-1" />
                    <span className="text-xs font-semibold">28°</span>
                  </div>
                  <div className="flex flex-col items-center p-1">
                    <span className="text-[10px] text-white/60 uppercase">Sat</span>
                    <CloudSun size={18} className="text-amber-300 my-1" />
                    <span className="text-xs font-semibold">31°</span>
                  </div>
                  <div className="flex flex-col items-center p-1">
                    <span className="text-[10px] text-white/60 uppercase">Sun</span>
                    <CloudSun size={18} className="text-amber-200 my-1" />
                    <span className="text-xs font-semibold">30°</span>
                  </div>
                </div>
                {/* Authentic Windows 10 App Label Stamp at bottom-left */}
                <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                  <div className="flex items-center gap-1.5">
                    <CloudSun size={13} className="text-white/80" />
                    <span>Weather</span>
                  </div>
                  <span className="text-white/50 text-[11px]">MSN Weather</span>
                </div>
              </div>
            )}
            {tile.liveType === "music" && (
              <div className="flex flex-col justify-between h-full p-3.5 bg-white/[0.04] text-white select-none">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-cyan-300 font-semibold uppercase tracking-wider">
                    Now Playing
                  </div>
                  <div className="flex items-end gap-1 h-3">
                    <div className="w-[2px] bg-cyan-400 h-3" />
                    <div className="w-[2px] bg-cyan-400 h-2" />
                    <div className="w-[2px] bg-cyan-400 h-3.5" />
                    <div className="w-[2px] bg-cyan-400 h-1.5" />
                  </div>
                </div>
                <div className="my-auto">
                  <div className="text-[15px] font-semibold truncate text-white">Lavie</div>
                  <div className="text-xs text-white/75 truncate mt-0.5">THREEE feat. Kagamine Len</div>
                  <div className="text-[11px] text-white/50 mt-0.5">Last.fm Scrobbler Active</div>
                </div>
                {/* Authentic Windows 10 App Label Stamp at bottom-left */}
                <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Music size={13} className="text-white/80" />
                    <span>Groove Music</span>
                  </div>
                  <span className="text-white/50 text-[11px]">MAudio</span>
                </div>
              </div>
            )}
            {tile.liveType === "system" && (
              <div className="flex flex-col justify-between h-full p-3.5 bg-white/[0.04] text-white select-none">
                <div className="text-[11px] text-white/70 font-normal uppercase tracking-wider flex items-center justify-between">
                  <span>Performance</span>
                  <span className="text-white/50 font-mono">{nowLabel}</span>
                </div>
                <div className="flex flex-col gap-2 my-auto">
                  <div>
                    <div className="flex justify-between text-xs font-normal mb-1">
                      <span>CPU</span>
                      <span className="text-emerald-300 font-mono">18%</span>
                    </div>
                    <div className="w-full bg-white/10 h-[2px]">
                      <div className="bg-emerald-400 h-full w-[18%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-normal mb-1">
                      <span>Memory</span>
                      <span className="text-cyan-300 font-mono">3.2 / 8.0 GB (40%)</span>
                    </div>
                    <div className="w-full bg-white/10 h-[2px]">
                      <div className="bg-cyan-400 h-full w-[40%]" />
                    </div>
                  </div>
                </div>
                {/* Authentic Windows 10 App Label Stamp at bottom-left */}
                <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Cpu size={13} className="text-white/80" />
                    <span>Task Manager</span>
                  </div>
                  <span className="text-white/50 text-[11px]">Resource Monitor</span>
                </div>
              </div>
            )}
            {tile.liveType === "nami" && (
              <div className="flex flex-col justify-between h-full p-3.5 bg-white/[0.04] text-white select-none">
                <div className="text-[11px] text-pink-300 font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>Nanami Daily Cheer</span>
                  <span className="text-[10px] text-emerald-400 font-mono">READY</span>
                </div>
                <div key={namiQuote} className="text-xs font-normal italic text-white/95 leading-relaxed my-auto">
                  &quot;{namiQuote}&quot;
                </div>
                {/* Authentic Windows 10 App Label Stamp at bottom-left */}
                <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Heart size={13} className="fill-pink-400 text-pink-400" />
                    <span>Nanami</span>
                  </div>
                  <span className="text-white/50 text-[11px]">Maru Ecosystem</span>
                </div>
              </div>
            )}
            {tile.liveType === "email" && (
              <div className="flex flex-col justify-between h-full p-3.5 bg-white/[0.04] text-white select-none">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[14px] font-semibold text-white truncate max-w-[200px]">
                      {nextEmail?.sender || currentEmail?.sender || "Outlook (classic)"}
                    </div>
                    <span className="text-[11px] text-white/60 font-normal">
                      {nextEmail?.time || currentEmail?.time || nowLabel}
                    </span>
                  </div>
                  <div className="text-[12.5px] font-normal text-white/90 truncate leading-snug mt-0.5">
                    {nextEmail?.subject || currentEmail?.subject || "Inbox up to date"}
                  </div>
                  <div className="text-[11.5px] text-white/50 truncate font-normal mt-0.5">
                    {nextEmail?.preview || "No additional recent unread mail"}
                  </div>
                </div>

                {/* Authentic Windows 10 App Label Stamp at bottom-left */}
                <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Mail size={13} className="text-white/80" />
                    <span>Outlook (classic)</span>
                  </div>
                  {totalUnreadEmails > 0 && (
                    <span className="text-[11px] font-bold text-cyan-300">
                      {totalUnreadEmails}
                    </span>
                  )}
                </div>
              </div>
            )}
            {tile.liveType === "anilist" && (
              <div className="flex flex-col justify-between h-full p-3.5 bg-white/[0.04] text-white select-none">
                <div className="flex items-center gap-3.5">
                  {(nextAnime?.coverImage || currentAnime?.coverImage) ? (
                    <img
                      src={nextAnime?.coverImage || currentAnime?.coverImage}
                      alt={nextAnime?.title || currentAnime?.title}
                      style={{ imageRendering: "-webkit-optimize-contrast" }}
                      className="w-14 h-20 rounded-none object-cover shadow-md shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-14 h-20 rounded-none bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                      <span className="font-bold text-white text-base">AL</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="text-[15px] font-semibold text-white truncate leading-snug">
                      {nextAnime?.title || currentAnime?.title || "AniList Watchlist"}
                    </div>
                    <div className="text-[12px] text-white/85 font-normal mt-1 truncate">
                      {(nextAnime || currentAnime)
                        ? `Episode ${(nextAnime || currentAnime)?.progress} of ${(nextAnime || currentAnime)?.episodes || "?"}`
                        : "Up to date"}
                    </div>
                    {(nextAnime || currentAnime) && (
                      <div className="w-full bg-white/15 h-[2px] mt-2.5 rounded-none overflow-hidden">
                        <div
                          className="bg-[#02a9ff] h-full rounded-none transition-all duration-700"
                          style={{
                            width: `${
                              (nextAnime || currentAnime)?.episodes
                                ? Math.min(
                                    100,
                                    Math.round(
                                      (((nextAnime || currentAnime)?.progress || 0) /
                                        ((nextAnime || currentAnime)?.episodes || 1)) *
                                        100
                                    )
                                  )
                                : 50
                            }%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Authentic Windows 10 App Label Stamp at bottom-left */}
                <div className="flex items-center justify-between text-[11px] text-white/70 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#02a9ff] font-bold text-xs">AL</span>
                    <span>AniList</span>
                  </div>
                  <span className="text-white/50 text-[11px]">
                    {animeListCount > 0 ? `${animeListCount} Shows Watching` : "Watchlist"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Expanded Tile Folder Overlay Shelf */}
      {tile.isFolder && tile.isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-100"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleFolder) onToggleFolder(tile.id);
          }}
        >
          <div
            className="bg-[#1e1e24]/95 border border-white/20 p-6 shadow-2xl max-w-md w-full flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/15 pb-2.5">
              <div className="flex items-center gap-2 text-white text-base font-semibold">
                <Folder size={18} className="text-amber-300" />
                <span>{tile.title || "Folder"}</span>
              </div>
              <button
                onClick={() => onToggleFolder && onToggleFolder(tile.id)}
                className="text-white/60 hover:text-white p-1 transition-colors cursor-pointer rounded-none"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 py-2">
              {(tile.subTiles || []).map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-col items-center gap-2 p-2.5 hover:bg-white/10 rounded cursor-pointer group transition-colors relative"
                  onClick={() => {
                    if (sub.appPath && onLaunchApp) onLaunchApp(sub.appPath);
                    if (onToggleFolder) onToggleFolder(tile.id);
                  }}
                >
                  <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center shadow">
                    {getTileIconFn?.(sub) ? (
                      <img
                        src={getTileIconFn(sub)}
                        alt={sub.title}
                        style={{ imageRendering: "-webkit-optimize-contrast" }}
                        className="w-8 h-8 object-contain drop-shadow"
                      />
                    ) : (
                      <Sparkles size={20} className="text-cyan-300" />
                    )}
                  </div>
                  <span className="text-xs text-white/90 text-center truncate w-full group-hover:text-white">
                    {sub.title}
                  </span>
                  {onRemoveFromFolder && (
                    <button
                      title="Extract out of folder"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromFolder(tile.id, sub.id);
                      }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-black/70 rounded text-white/70 hover:text-red-400 transition-opacity"
                    >
                      <LogOut size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
