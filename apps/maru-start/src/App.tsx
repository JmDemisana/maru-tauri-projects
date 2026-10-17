import React, { useState, useEffect, useRef, useCallback } from "react";
import { LeftRail } from "./components/LeftRail";
import { TileBoard } from "./components/TileBoard";
import { AllAppsList } from "./components/AllAppsList";
import { OmniSearch } from "./components/OmniSearch";
import { CustomizationsTab } from "./components/CustomizationsTab";
import { LiveTilesStore } from "./components/LiveTilesStore";
import { WebAppsTab } from "./components/WebAppsTab";
import { AniListCompanionModal } from "./components/AniListCompanionModal";
import { ContextMenu, ContextMenuState } from "./components/ContextMenu";
import {
  AllAppsContextMenu,
  AppContextMenuState,
} from "./components/AllAppsContextMenu";
import { PowerDialog } from "./components/PowerDialog";
import {
  AppItem,
  CustomTile,
  TileSize,
  StartView,
  MaruStartConfig,
  DEFAULT_CONFIG,
} from "./types";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// REAL APPS configured directly from Senpai's machine with authentic Brand Icons
const INITIAL_TILES: CustomTile[] = [
  // --- COLUMN 1: PRODUCTIVITY & OFFICE (Microsoft 365 + Dev Tools) ---
  {
    id: "word",
    title: "Word",
    appPath: "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Word.lnk",
    size: "medium",
    color: "acrylic",
    iconName: "Word",
    group: "Productivity",
  },
  {
    id: "excel",
    title: "Excel",
    appPath: "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Excel.lnk",
    size: "medium",
    color: "acrylic",
    iconName: "Excel",
    group: "Productivity",
  },
  {
    id: "powerpoint",
    title: "PowerPoint",
    appPath: "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\PowerPoint.lnk",
    size: "medium",
    color: "acrylic",
    iconName: "PowerPoint",
    group: "Productivity",
  },
  {
    id: "onenote",
    title: "OneNote",
    appPath: "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\OneNote.lnk",
    size: "medium",
    color: "acrylic",
    iconName: "OneNote",
    group: "Productivity",
  },
  {
    id: "access",
    title: "Access",
    appPath: "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Access.lnk",
    size: "small",
    color: "acrylic",
    iconName: "Access",
    group: "Productivity",
  },
  {
    id: "publisher",
    title: "Publisher",
    appPath: "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Publisher.lnk",
    size: "small",
    color: "acrylic",
    iconName: "Publisher",
    group: "Productivity",
  },
  {
    id: "vscode",
    title: "VS Code",
    appPath: "code",
    size: "small",
    color: "acrylic",
    iconName: "VSCode",
    group: "Productivity",
  },
  {
    id: "terminal",
    title: "Windows Terminal",
    appPath: "wt.exe",
    size: "small",
    color: "acrylic",
    iconName: "Terminal",
    group: "Productivity",
  },
  {
    id: "explorer",
    title: "File Explorer",
    appPath: "explorer.exe",
    size: "wide",
    color: "acrylic",
    iconName: "Explorer",
    group: "Productivity",
  },

  // --- COLUMN 2: COMMUNICATION & TOOLS ---
  {
    id: "outlook_live",
    title: "Outlook (classic)",
    appPath: "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Outlook (classic).lnk",
    size: "wide",
    color: "acrylic",
    iconName: "Outlook",
    group: "Communication & Tools",
    isLive: true,
    liveType: "email",
  },
  {
    id: "chrome",
    title: "Google Chrome",
    appPath: "chrome",
    size: "medium",
    color: "acrylic",
    iconName: "Chrome",
    group: "Communication & Tools",
  },
  {
    id: "edge",
    title: "Microsoft Edge",
    appPath: "msedge.exe",
    size: "medium",
    color: "acrylic",
    iconName: "Edge",
    group: "Communication & Tools",
  },
  {
    id: "weather",
    title: "Weather",
    appPath: "msnweather:",
    size: "wide",
    color: "acrylic",
    iconName: "Weather",
    group: "Communication & Tools",
    isLive: true,
    liveType: "weather",
  },
  {
    id: "calc",
    title: "Calculator",
    appPath: "calc.exe",
    size: "small",
    color: "acrylic",
    iconName: "Calculator",
    group: "Communication & Tools",
  },
  {
    id: "notes",
    title: "Notepad",
    appPath: "notepad.exe",
    size: "small",
    color: "acrylic",
    iconName: "Notepad",
    group: "Communication & Tools",
  },
  {
    id: "settings_tile",
    title: "Settings",
    appPath: "ms-settings:",
    size: "small",
    color: "acrylic",
    iconName: "Settings",
    group: "Communication & Tools",
  },
  {
    id: "taskmgr",
    title: "Task Manager",
    appPath: "taskmgr.exe",
    size: "small",
    color: "acrylic",
    iconName: "Taskmgr",
    group: "Communication & Tools",
  },

  // --- COLUMN 3: EXPLORE & MEDIA ---
  {
    id: "anilist_live",
    title: "AniList",
    appPath: "https://anilist.co/user/PpolHi",
    size: "wide",
    color: "acrylic",
    iconName: "AniList",
    group: "Explore & Media",
    isLive: true,
    liveType: "anilist",
  },
  {
    id: "discord",
    title: "Discord",
    appPath: "C:\\Users\\jmdem\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Discord Inc\\Discord.lnk",
    size: "medium",
    color: "acrylic",
    iconName: "Discord",
    group: "Explore & Media",
  },
  {
    id: "spotify",
    title: "Spotify",
    appPath: "spotify",
    size: "medium",
    color: "acrylic",
    iconName: "Spotify",
    group: "Explore & Media",
  },
  {
    id: "notion",
    title: "Notion",
    appPath: "notion",
    size: "medium",
    color: "acrylic",
    iconName: "Notion",
    group: "Explore & Media",
  },
  {
    id: "matlab",
    title: "MATLAB",
    appPath: "matlab",
    size: "medium",
    color: "acrylic",
    iconName: "MATLAB",
    group: "Explore & Media",
  },
  {
    id: "autocad",
    title: "AutoCAD",
    appPath: "acad",
    size: "medium",
    color: "acrylic",
    iconName: "AutoCAD",
    group: "Explore & Media",
  },
  {
    id: "android_studio",
    title: "Android Studio",
    appPath: "studio64",
    size: "medium",
    color: "acrylic",
    iconName: "AndroidStudio",
    group: "Explore & Media",
  },
  {
    id: "zip_mgr",
    title: "7-Zip Manager",
    appPath: "7zFM.exe",
    size: "medium",
    color: "acrylic",
    iconName: "7Zip",
    group: "Explore & Media",
  },
];

const STORAGE_KEY = "maru_start_tiles_v7";

export const App: React.FC = () => {
  const [config, setConfig] = useState<MaruStartConfig>(() => {
    try {
      const saved = localStorage.getItem("maru_start_config");
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
      console.error("Failed to load config:", e);
    }
    return DEFAULT_CONFIG;
  });

  const handleUpdateConfig = (newConfig: Partial<MaruStartConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem("maru_start_config", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save config:", e);
      }
      return updated;
    });
  };

  const [currentView, setCurrentView] = useState<StartView>(() => config.defaultView || "tiles");
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isPowerDialogOpen, setIsPowerDialogOpen] = useState(false);
  const [isAniListModalOpen, setIsAniListModalOpen] = useState(false);
  const isClosingRef = useRef(false);
  const [openSession, setOpenSession] = useState(0);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Load desktop wallpaper on mount for authentic Windows 10 acrylic
  useEffect(() => {
    invoke<string | null>("get_desktop_wallpaper")
      .then((wp) => {
        if (wp) setWallpaper(wp);
      })
      .catch(() => {});
  }, []);

  // Persistent tiles state
  const [tiles, setTiles] = useState<CustomTile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load saved tiles:", e);
    }
    return INITIAL_TILES;
  });

  // Context Menu States
  const [tileMenuState, setTileMenuState] = useState<ContextMenuState | null>(null);
  const [appMenuState, setAppMenuState] = useState<AppContextMenuState | null>(null);

  // Save tiles to localStorage
  const saveTiles = (newTiles: CustomTile[]) => {
    setTiles(newTiles);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTiles));
    } catch (e) {
      console.error("Failed to save tiles:", e);
    }
  };

  // Tile Actions
  const handleUnpinTile = (id: string) => {
    saveTiles(tiles.filter((t) => t.id !== id));
  };

  const handleResizeTile = (id: string, size: TileSize) => {
    saveTiles(tiles.map((t) => (t.id === id ? { ...t, size } : t)));
  };

  const handleChangeTileColor = (id: string, color: string) => {
    saveTiles(tiles.map((t) => (t.id === id ? { ...t, color } : t)));
  };

  const handleToggleLiveTile = (id: string) => {
    saveTiles(tiles.map((t) => (t.id === id ? { ...t, isLive: !t.isLive } : t)));
  };

  const handleRenameGroup = (oldName: string, newName: string) => {
    saveTiles(tiles.map((t) => (t.group === oldName ? { ...t, group: newName } : t)));
  };

  // Drag and drop reordering
  const handleMoveTile = (sourceId: string, targetId: string) => {
    const sourceIdx = tiles.findIndex((t) => t.id === sourceId);
    let targetIdx = tiles.findIndex((t) => t.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) return;

    const updated = [...tiles];
    const [moved] = updated.splice(sourceIdx, 1);
    // Adopt target tile's group (read before splice to avoid index shift issues)
    const targetGroup = tiles[targetIdx].group;
    moved.group = targetGroup;
    // After removal, target index shifts left when source was before target
    if (sourceIdx < targetIdx) targetIdx -= 1;
    updated.splice(targetIdx, 0, moved);
    saveTiles(updated);
  };

  // Drag and drop to a different group column
  const handleMoveToGroup = (sourceId: string, targetGroup: string) => {
    const sourceIdx = tiles.findIndex((t) => t.id === sourceId);
    if (sourceIdx === -1) return;

    const updated = [...tiles];
    updated[sourceIdx] = { ...updated[sourceIdx], group: targetGroup };
    saveTiles(updated);
  };

  // Drag and drop to reorder whole groups
  const handleMoveGroup = (sourceGroup: string, targetGroup: string) => {
    if (sourceGroup === targetGroup) return;
    const currentGroups = Array.from(new Set(tiles.map((t) => t.group)));
    const srcIdx = currentGroups.indexOf(sourceGroup);
    const tgtIdx = currentGroups.indexOf(targetGroup);
    if (srcIdx === -1 || tgtIdx === -1) return;

    const newGroups = [...currentGroups];
    newGroups.splice(srcIdx, 1);
    newGroups.splice(tgtIdx, 0, sourceGroup);

    const reorderedTiles: CustomTile[] = [];
    for (const grp of newGroups) {
      reorderedTiles.push(...tiles.filter((t) => t.group === grp));
    }
    const remaining = tiles.filter((t) => !newGroups.includes(t.group));
    reorderedTiles.push(...remaining);

    saveTiles(reorderedTiles);
  };

  // Merge two tiles into a Tile Folder (or add to existing folder)
  const handleCreateFolder = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const sourceTile = tiles.find((t) => t.id === sourceId);
    const targetTile = tiles.find((t) => t.id === targetId);
    if (!sourceTile || !targetTile) return;

    if (targetTile.isFolder) {
      const updated = tiles
        .filter((t) => t.id !== sourceId)
        .map((t) => {
          if (t.id === targetId) {
            return {
              ...t,
              subTiles: [...(t.subTiles || []), sourceTile],
            };
          }
          return t;
        });
      saveTiles(updated);
    } else {
      const newFolder: CustomTile = {
        id: `folder_${Date.now()}`,
        title: targetTile.title,
        size: targetTile.size,
        color: targetTile.color || "acrylic",
        group: targetTile.group,
        isFolder: true,
        isExpanded: false,
        subTiles: [targetTile, sourceTile],
      };
      const updated = tiles
        .filter((t) => t.id !== sourceId)
        .map((t) => (t.id === targetId ? newFolder : t));
      saveTiles(updated);
    }
  };

  const handleToggleFolder = (folderId: string) => {
    saveTiles(
      tiles.map((t) => (t.id === folderId ? { ...t, isExpanded: !t.isExpanded } : t))
    );
  };

  const handleRemoveFromFolder = (folderId: string, subTileId: string) => {
    const folder = tiles.find((t) => t.id === folderId);
    if (!folder || !folder.subTiles) return;
    const subTile = folder.subTiles.find((st) => st.id === subTileId);
    if (!subTile) return;

    const remainingSubTiles = folder.subTiles.filter((st) => st.id !== subTileId);
    let updated: CustomTile[];
    if (remainingSubTiles.length <= 1) {
      const lastTile = remainingSubTiles[0];
      const releasedTile: CustomTile = { ...subTile, group: folder.group };
      if (lastTile) {
        updated = tiles.map((t) => (t.id === folderId ? { ...lastTile, group: folder.group } : t));
        updated.push(releasedTile);
      } else {
        updated = tiles.filter((t) => t.id !== folderId);
        updated.push(releasedTile);
      }
    } else {
      updated = tiles.map((t) =>
        t.id === folderId ? { ...t, subTiles: remainingSubTiles } : t
      );
      updated.push({ ...subTile, group: folder.group });
    }
    saveTiles(updated);
  };

  // Move tile to its own separate new group
  const handleMoveToNewGroup = (sourceId: string, customGroupName?: string) => {
    const sourceIdx = tiles.findIndex((t) => t.id === sourceId);
    if (sourceIdx === -1) return;

    const currentGroups = Array.from(new Set(tiles.map((t) => t.group)));
    let newGroupName = customGroupName || `Group ${currentGroups.length + 1}`;
    let counter = 1;
    while (currentGroups.includes(newGroupName)) {
      counter++;
      newGroupName = `Group ${counter}`;
    }

    const updated = [...tiles];
    updated[sourceIdx] = { ...updated[sourceIdx], group: newGroupName };
    saveTiles(updated);
  };

  const handleChangeTileImage = (id: string, customImage?: string) => {
    const updated = tiles.map((t) => {
      if (t.id === id) {
        return { ...t, customImage };
      }
      return t;
    });
    saveTiles(updated);
  };

  const handlePinAppToStart = (app: AppItem) => {
    if (tiles.some((t) => t.appPath === app.path)) {
      return;
    }    const newTile: CustomTile = {
      id: `custom_${Date.now()}`,
      title: app.name,
      appPath: app.path,
      size: "medium",
      color: "acrylic",
      iconName: "Sparkles",
      group: "Productivity",
    };
    saveTiles([...tiles, newTile]);
  };

  const handleResetTiles = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear saved tiles:", e);
    }
    saveTiles(INITIAL_TILES);
  };

  // Load installed apps from Rust backend
  const loadApps = async () => {
    try {
      const items = await invoke<AppItem[]>("get_installed_apps");
      setApps(items);
    } catch (err) {
      console.error("Failed to fetch installed apps:", err);
    }
  };

  useEffect(() => {
    loadApps();

    // Listen for menu opened event to replay tab slide animation identically
    const unlistenOpened = listen("menu-opened", () => {
      setIsClosing(false);
      setIsMenuOpen(true);
      setSlideDir("right");
      setOpenSession((s) => s + 1);
      setSearchQuery("");
      setIsSearching(false);
      setTileMenuState(null);
      setAppMenuState(null);
      setIsPowerDialogOpen(false);
    });

    // Listen for menu closed event to pause background timers and release resources
    const unlistenClosed = listen("menu-closed", () => {
      setIsMenuOpen(false);
      setIsClosing(false);
      setTileMenuState(null);
      setAppMenuState(null);
      setIsPowerDialogOpen(false);
    });

    const onWindowFocus = () => {
      setOpenSession((s) => s + 1);
    };
    window.addEventListener("focus", onWindowFocus);

    return () => {
      unlistenOpened.then((fn) => fn());
      unlistenClosed.then((fn) => fn());
      window.removeEventListener("focus", onWindowFocus);
    };
  }, []);

  const handleClose = useCallback((callback?: () => void | Promise<void>) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    setTileMenuState(null);
    setAppMenuState(null);
    setIsPowerDialogOpen(false);

    setTimeout(async () => {
      try {
        if (callback) {
          await callback();
        }
        await invoke("hide_start_menu");
      } catch (err) {
        console.error("Failed to hide start menu:", err);
      } finally {
        setIsMenuOpen(false);
        setIsClosing(false);
        isClosingRef.current = false;
      }
    }, 160);
  }, []);

  const handleLaunchApp = useCallback((path: string) => {
    handleClose(async () => {
      try {
        await invoke("launch_app_path", { path });
      } catch (err) {
        console.error("Failed to launch app:", err);
      }
    });
  }, [handleClose]);

  const handlePowerAction = useCallback((action: string) => {
    handleClose(async () => {
      try {
        await invoke("execute_power_action", { action });
      } catch (err) {
        console.error("Failed power action:", err);
      }
    });
  }, [handleClose]);

  // Global keydown handler: Escape to close, or typing to search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (isPowerDialogOpen) {
          setIsPowerDialogOpen(false);
          return;
        }
        if (tileMenuState || appMenuState) {
          setTileMenuState(null);
          setAppMenuState(null);
          return;
        }
        if (isSearching && searchQuery) {
          setSearchQuery("");
          setIsSearching(false);
        } else {
          handleClose();
        }
        return;
      }

      // If user starts typing alphanumeric without modifiers, jump straight to search!
      if (!isSearching && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setTileMenuState(null);
        setAppMenuState(null);
        setIsSearching(true);
        setSearchQuery(e.key);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSearching, searchQuery, tileMenuState, appMenuState]);

  // Permanently disable default browser right-click menu
  useEffect(() => {
    const disableContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", disableContextMenu);
    return () => window.removeEventListener("contextmenu", disableContextMenu);
  }, []);

  return (
    <div
      className={`relative w-screen h-screen win10-acrylic flex overflow-hidden select-none transition-opacity duration-150 ${
        !isMenuOpen ? "opacity-0 pointer-events-none" : isClosing ? "animate-menu-exit" : "animate-menu-entrance"
      }`}
      onClick={(e) => {
        setTileMenuState(null);
        setAppMenuState(null);
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      {/* Desktop Wallpaper Layer: Opaque base to block underlying desktop windows, crisp wallpaper, NO BLUR */}
      <div className="absolute inset-0 bg-[#101012] pointer-events-none overflow-hidden">
        {wallpaper && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${wallpaper})`,
            }}
          />
        )}
        {/* Windows 10 Start Screen Darkening Overlay (NO BLUR, crisp wallpaper with dark tint) */}
        <div
          className="absolute inset-0 bg-black"
          style={{
            opacity: (config.bgDarkness || 65) / 100,
          }}
        />
      </div>

      {/* Left Navigation Rail */}
      <LeftRail
        currentView={currentView}
        onViewChange={(v) => {
          if (v !== currentView) {
            setSlideDir(v === "all-apps" ? "right" : "left");
            setIsSearching(false);
            setSearchQuery("");
            setTileMenuState(null);
            setAppMenuState(null);
            setCurrentView(v);
          }
        }}
        onClose={handleClose}
        powerMenuStyle={config.powerMenuStyle || "fullscreen"}
        onOpenPowerDialog={() => setIsPowerDialogOpen(true)}
      />

      {/* Main Content Area */}
      <div
        ref={mainContentRef}
        className="flex-1 h-full flex overflow-hidden relative z-10"
      >
        {isSearching || searchQuery ? (
          <OmniSearch
            query={searchQuery}
            onQueryChange={(q) => {
              setSearchQuery(q);
              if (!q) setIsSearching(false);
            }}
            allApps={apps}
            onLaunchApp={handleLaunchApp}
            onPowerAction={handlePowerAction}
            onClose={handleClose}
            onPinToStart={handlePinAppToStart}
            isPinned={(path) => tiles.some((t) => t.appPath === path)}
          />
        ) : (
          <div
            key={`${currentView}-${openSession}`}
            className={`w-full h-full flex ${
              slideDir === "right" ? "animate-slide-in-right" : "animate-slide-in-left"
            }`}
          >
            {currentView === "all-apps" ? (
              <AllAppsList
                apps={apps}
                onLaunch={handleLaunchApp}
                onAppContextMenu={(e, app) => {
                  setTileMenuState(null);
                  setAppMenuState({ x: e.clientX, y: e.clientY, app });
                }}
              />
            ) : currentView === "web-apps" ? (
              <WebAppsTab
                pinnedTiles={tiles}
                onPinTile={(newTile) => {
                  if (!tiles.some((t) => t.id === newTile.id)) {
                    saveTiles([...tiles, newTile]);
                  }
                }}
                onUnpinTile={handleUnpinTile}
                onLaunchUrl={handleLaunchApp}
              />
            ) : currentView === "customizations" ? (
              <CustomizationsTab
                config={config}
                onUpdateConfig={handleUpdateConfig}
                tiles={tiles}
                onResetTiles={handleResetTiles}
                onImportTiles={(imported) => saveTiles(imported)}
              />
            ) : currentView === "store" ? (
              <LiveTilesStore
                pinnedTiles={tiles}
                onPinTile={(newTile) => {
                  if (!tiles.some((t) => t.id === newTile.id)) {
                    saveTiles([...tiles, newTile]);
                  }
                }}
                onUnpinTile={handleUnpinTile}
                onLaunchUrl={handleLaunchApp}
                onOpenAniListModal={() => setIsAniListModalOpen(true)}
                config={config}
                onUpdateConfig={handleUpdateConfig}
              />
            ) : (
              <TileBoard
                tiles={tiles}
                allApps={apps}
                isMenuOpen={isMenuOpen}
                config={config}
                onOpenAniListModal={() => setIsAniListModalOpen(true)}
                onLaunch={handleLaunchApp}
                onTileContextMenu={(e, tile) => {
                  setAppMenuState(null);
                  setTileMenuState({ x: e.clientX, y: e.clientY, tile });
                }}
                onRenameGroup={handleRenameGroup}
                onMoveTile={handleMoveTile}
                onMoveToGroup={handleMoveToGroup}
                onMoveGroup={handleMoveGroup}
                onMoveToNewGroup={handleMoveToNewGroup}
                onCreateFolder={handleCreateFolder}
                onToggleFolder={handleToggleFolder}
                onRemoveFromFolder={handleRemoveFromFolder}
                onResetTiles={handleResetTiles}
              />
            )}
          </div>
        )}
      </div>

      {/* Tile Context Menu */}
      {tileMenuState && (
        <ContextMenu
          state={tileMenuState}
          onClose={() => setTileMenuState(null)}
          onUnpin={handleUnpinTile}
          onResize={handleResizeTile}
          onChangeColor={handleChangeTileColor}
          onToggleLive={handleToggleLiveTile}
          onChangeImage={handleChangeTileImage}
        />
      )}

      {/* All Apps Context Menu */}
      {appMenuState && (
        <AllAppsContextMenu
          state={appMenuState}
          onClose={() => setAppMenuState(null)}
          onPinToStart={handlePinAppToStart}
        />
      )}

      {/* Full Screen Android Style Power Dialog */}
      <PowerDialog
        isOpen={isPowerDialogOpen}
        onClose={() => setIsPowerDialogOpen(false)}
        onAction={handlePowerAction}
      />

      {/* Dedicated AniList Watchlist Companion Modal */}
      <AniListCompanionModal
        isOpen={isAniListModalOpen}
        onClose={() => setIsAniListModalOpen(false)}
        onLaunchUrl={handleLaunchApp}
      />
    </div>
  );
};
export default App;
