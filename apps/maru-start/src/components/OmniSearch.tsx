import React, { useState, useEffect, useRef, useMemo } from "react";
import { SearchResultItem, AppItem } from "../types";
import {
  Search,
  X,
  Sparkles,
  Calculator,
  Terminal,
  Moon,
  Lock,
  RotateCcw,
  Power,
  ChevronRight,
  BedDouble,
  LogOut,
  Copy,
  Check,
  Shield,
  Folder,
  Pin,
  Play,
  Globe,
  Settings as SettingsIcon,
  ExternalLink,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface OmniSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  allApps: AppItem[];
  onLaunchApp: (path: string) => void;
  onPowerAction: (action: string) => void;
  onClose: () => void;
  onPinToStart: (app: AppItem) => void;
  isPinned: (path: string) => boolean;
}

type FilterTab = "all" | "apps" | "documents" | "web" | "settings";

export const OmniSearch: React.FC<OmniSearchProps> = ({
  query,
  onQueryChange,
  allApps,
  onLaunchApp,
  onPowerAction,
  onClose,
  onPinToStart,
  isPinned,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedText, setCopiedText] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input automatically
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Query Rust search backend
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    let isMounted = true;
    invoke<SearchResultItem[]>("search_start_items", {
      query,
      allApps,
    })
      .then((res) => {
        if (isMounted) {
          setResults(res);
          setSelectedIndex(0);
        }
      })
      .catch((err) => {
        console.error("Search failed:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [query, allApps]);

  const isWebItem = (r: SearchResultItem) =>
    (r.kind === "action" &&
      (r.id.startsWith("web:") || r.id.startsWith("url:") || r.icon_name === "Globe")) ||
    (r.kind === "app" &&
      (r.item.category.toLowerCase() === "web" ||
        r.item.path.startsWith("http://") ||
        r.item.path.startsWith("https://")));

  const isSettingsItem = (r: SearchResultItem) =>
    (r.kind === "action" &&
      (r.id.startsWith("settings:") ||
        r.icon_name === "Settings" ||
        r.id === "hibernate" ||
        r.id === "lock" ||
        r.id === "restart" ||
        r.id === "shutdown" ||
        r.id === "sleep" ||
        r.id === "signout")) ||
    (r.kind === "app" &&
      (r.item.path.startsWith("ms-settings:") ||
        r.item.category.toLowerCase().includes("setting") ||
        r.item.category.toLowerCase().includes("system") ||
        r.item.name.toLowerCase().includes("setting")));

  const isFolderItem = (r: SearchResultItem) =>
    (r.kind === "action" && (r.id.startsWith("folder:") || r.icon_name === "Folder")) ||
    (r.kind === "app" &&
      (r.item.category.toLowerCase() === "folders" ||
        r.item.path.toLowerCase().endsWith("explorer.exe") ||
        (r.item.path.toLowerCase().startsWith("shell:") &&
          !r.item.path.toLowerCase().startsWith("shell:appsfolder"))));

  // Filter results based on active category pill tab
  const filteredResults = useMemo(() => {
    if (activeTab === "all") return results;
    if (activeTab === "apps") {
      return results.filter((r) => r.kind === "app" && !isSettingsItem(r) && !isFolderItem(r) && !isWebItem(r));
    }
    if (activeTab === "settings") {
      return results.filter(isSettingsItem);
    }
    if (activeTab === "web") {
      return results.filter(isWebItem);
    }
    if (activeTab === "documents") {
      return results.filter(isFolderItem);
    }
    return results;
  }, [results, activeTab]);

  // Keep selectedIndex within bounds
  useEffect(() => {
    if (selectedIndex >= filteredResults.length && filteredResults.length > 0) {
      setSelectedIndex(0);
    }
  }, [filteredResults, selectedIndex]);

  const selectedItem: SearchResultItem | undefined = filteredResults[selectedIndex];

  const handleExecute = (item?: SearchResultItem) => {
    const target = item || selectedItem;
    if (!target) {
      if (query.trim()) {
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        onLaunchApp(url);
        onClose();
      }
      return;
    }

    onClose();

    switch (target.kind) {
      case "app":
        onLaunchApp(target.item.path);
        break;
      case "action":
        onPowerAction(target.id);
        break;
      case "terminal":
        invoke("launch_terminal_cmd", { command: target.command }).catch(console.error);
        break;
      case "math":
        try {
          navigator.clipboard?.writeText(target.result).catch(() => {});
          setCopiedText(true);
          setTimeout(() => setCopiedText(false), 1500);
        } catch {}
        invoke("launch_app_path", { path: "calc.exe" }).catch(console.error);
        break;
    }
  };

  const handleRunAsAdmin = (path: string) => {
    onClose();
    invoke("launch_app_admin", { path }).catch((err) => {
      console.error("Admin launch failed:", err);
    });
  };

  const handleOpenFileLocation = (path: string) => {
    onClose();
    invoke("open_file_location", { path }).catch((err) => {
      console.error("Open file location failed:", err);
    });
  };

  const handleCopyClipboard = (text: string) => {
    try {
      navigator.clipboard?.writeText(text).catch(() => {});
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1600);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, filteredResults.length - 1) : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleExecute();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (query) {
        onQueryChange("");
      } else {
        onClose();
      }
    }
  };

  const renderActionIcon = (name: string, size = 20) => {
    switch (name) {
      case "Moon":
        return <Moon size={size} className="text-blue-300" />;
      case "Lock":
        return <Lock size={size} className="text-amber-300" />;
      case "RotateCcw":
        return <RotateCcw size={size} className="text-cyan-300" />;
      case "Power":
        return <Power size={size} className="text-red-400" />;
      case "BedDouble":
        return <BedDouble size={size} className="text-emerald-300" />;
      case "LogOut":
        return <LogOut size={size} className="text-violet-300" />;
      default:
        return <Sparkles size={size} className="text-white" />;
    }
  };

  // Render a single search item row with Windows 10 left-accent bar
  const renderItemRow = (item: SearchResultItem, flatIndex: number) => {
    const isSelected = flatIndex === selectedIndex;

    if (item.kind === "math") {
      return (
        <div
          key={`math-${flatIndex}`}
          onClick={() => handleExecute(item)}
          onMouseEnter={() => setSelectedIndex(flatIndex)}
          className={`flex items-center justify-between px-3 py-2.5 rounded transition-all cursor-pointer border-l-4 ${
            isSelected
              ? "bg-[#0078d7] border-l-white text-white shadow-md"
              : "bg-white/[0.04] border-l-transparent hover:bg-white/10 hover:border-l-white/40 text-white/90"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
              <Calculator size={18} className="text-emerald-300" />
            </div>
            <div>
              <div className="text-[10px] text-white/70 uppercase font-semibold">
                Calculation
              </div>
              <div className="text-sm font-bold">
                {item.expression} = {item.result}
              </div>
            </div>
          </div>
          <div className="text-xs text-white/60 flex items-center gap-1">
            <span>{copiedText ? "Copied!" : "Enter to calc"}</span>
            {copiedText ? <Check size={14} /> : <Copy size={14} />}
          </div>
        </div>
      );
    }

    if (item.kind === "terminal") {
      return (
        <div
          key={`term-${flatIndex}`}
          onClick={() => handleExecute(item)}
          onMouseEnter={() => setSelectedIndex(flatIndex)}
          className={`flex items-center justify-between px-3 py-2.5 rounded transition-all cursor-pointer border-l-4 ${
            isSelected
              ? "bg-[#0078d7] border-l-white text-white shadow-md"
              : "bg-white/[0.04] border-l-transparent hover:bg-white/10 hover:border-l-white/40 text-white/90"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center shrink-0">
              <Terminal size={17} className="text-cyan-300" />
            </div>
            <div>
              <div className="text-[10px] text-white/70 uppercase font-semibold">
                Run Command
              </div>
              <div className="font-mono text-xs font-medium truncate max-w-sm">
                &gt; {item.command}
              </div>
            </div>
          </div>
          <ChevronRight size={14} className="text-white/60" />
        </div>
      );
    }

    if (item.kind === "action") {
      return (
        <div
          key={item.id}
          onClick={() => handleExecute(item)}
          onMouseEnter={() => setSelectedIndex(flatIndex)}
          className={`flex items-center justify-between px-3 py-2.5 rounded transition-all cursor-pointer border-l-4 ${
            isSelected
              ? "bg-[#0078d7] border-l-white text-white shadow-md"
              : "bg-white/[0.04] border-l-transparent hover:bg-white/10 hover:border-l-white/40 text-white/90"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
              {renderActionIcon(item.icon_name, 17)}
            </div>
            <div>
              <div className="font-semibold text-sm">{item.title}</div>
              <div className="text-[11px] text-white/60">{item.subtitle}</div>
            </div>
          </div>
          <ChevronRight size={14} className="text-white/60" />
        </div>
      );
    }

    if (item.kind === "app") {
      const isSetting = isSettingsItem(item);
      const isFolder = isFolderItem(item);
      const isWeb = isWebItem(item);

      return (
        <div
          key={item.item.id}
          onClick={() => handleExecute(item)}
          onMouseEnter={() => setSelectedIndex(flatIndex)}
          className={`flex items-center justify-between px-3 py-2.5 rounded transition-all cursor-pointer border-l-4 ${
            isSelected
              ? "bg-[#0078d7] border-l-white text-white shadow-md"
              : "bg-white/[0.04] border-l-transparent hover:bg-white/10 hover:border-l-white/40 text-white/90"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
              {isWeb ? (
                <Globe size={18} className="text-cyan-300" />
              ) : isSetting ? (
                <SettingsIcon size={18} className="text-slate-300" />
              ) : isFolder ? (
                <Folder size={18} className="text-amber-300" />
              ) : item.item.icon ? (
                <img src={item.item.icon} alt={item.item.name} className="w-5 h-5 object-contain" />
              ) : (
                <Sparkles size={16} className="text-white/80" />
              )}
            </div>
            <div className="overflow-hidden">
              <div className="font-medium text-sm truncate">{item.item.name}</div>
              <div className="text-[11px] text-white/50 truncate">
                {isWeb
                  ? "Web Link"
                  : isSetting
                  ? "Settings"
                  : isFolder
                  ? "File Folder"
                  : `App • ${item.item.category}`}
              </div>
            </div>
          </div>
          <ChevronRight size={14} className="text-white/60 shrink-0" />
        </div>
      );
    }

    return null;
  };

  // Partition results for authentic Windows 10 categorized sections
  const categorized = useMemo(() => {
    if (filteredResults.length === 0) {
      return { bestMatch: null, apps: [], settings: [], folders: [], web: [], tools: [] };
    }

    const bestMatch = filteredResults[0];
    const rest = filteredResults.slice(1);

    const apps: { item: SearchResultItem; flatIndex: number }[] = [];
    const settings: { item: SearchResultItem; flatIndex: number }[] = [];
    const folders: { item: SearchResultItem; flatIndex: number }[] = [];
    const web: { item: SearchResultItem; flatIndex: number }[] = [];
    const tools: { item: SearchResultItem; flatIndex: number }[] = [];

    rest.forEach((item, offset) => {
      const flatIndex = offset + 1;
      if (item.kind === "math" || item.kind === "terminal") {
        tools.push({ item, flatIndex });
      } else if (isSettingsItem(item)) {
        settings.push({ item, flatIndex });
      } else if (isFolderItem(item)) {
        folders.push({ item, flatIndex });
      } else if (isWebItem(item)) {
        web.push({ item, flatIndex });
      } else {
        apps.push({ item, flatIndex });
      }
    });

    return { bestMatch, apps, settings, folders, web, tools };
  }, [filteredResults]);

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden px-8 py-6 max-w-6xl mx-auto w-full select-none animate-in fade-in duration-150">
      {/* Top Search Header Bar */}
      <div className="flex flex-col gap-3 shrink-0 mb-4">
        {/* Search Input Box */}
        <div className="relative flex items-center bg-black/40 border-b-2 border-[#0078d7] px-4 py-3 shadow-md focus-within:bg-black/60 transition-colors">
          <Search size={22} className="text-[#0078d7] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type here to search"
            className="bg-transparent text-white text-xl placeholder-white/40 focus:outline-none w-full font-light"
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              className="text-white/60 hover:text-white p-1 transition-colors"
              title="Clear search"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Windows 10 Category Tabs Bar */}
        <div className="flex items-center gap-1 text-sm border-b border-white/10 pb-0.5">
          {[
            { id: "all", label: "All" },
            { id: "apps", label: "Apps" },
            { id: "documents", label: "Documents" },
            { id: "web", label: "Web" },
            { id: "settings", label: "Settings" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as FilterTab);
                setSelectedIndex(0);
              }}
              className={`px-3.5 py-1.5 font-medium transition-colors border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? "border-[#0078d7] text-white"
                  : "border-transparent text-white/60 hover:text-white hover:border-white/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Pane Windows 10 Search Grid */}
      <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden min-h-0">
        {/* LEFT PANE: Categorized Search Results (7 cols) */}
        <div className="col-span-7 flex flex-col gap-3 overflow-y-auto pr-2 custom-scroll">
          {/* Windows 10 Zero State (When query is empty) */}
          {!query.trim() && (
            <div className="flex flex-col gap-6 py-2">
              {/* Top Apps Section */}
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase font-semibold text-white/50 tracking-wider">
                  Top Apps
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {allApps.slice(0, 5).map((app) => (
                    <button
                      key={app.id}
                      onClick={() => {
                        onLaunchApp(app.path);
                        onClose();
                      }}
                      className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-[#0078d7] text-white rounded border border-white/10 transition-colors text-center group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        {app.icon ? (
                          <img src={app.icon} alt={app.name} className="w-6 h-6 object-contain" />
                        ) : (
                          <Sparkles size={20} className="text-cyan-300" />
                        )}
                      </div>
                      <span className="text-xs font-medium truncate w-full">
                        {app.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Searches Section */}
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase font-semibold text-white/50 tracking-wider">
                  Quick Searches
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { title: "Weather Forecast", query: "weather", desc: "View Iloilo City temperature and forecast" },
                    { title: "Windows Settings", query: "settings", desc: "Bluetooth, network, display, and updates" },
                    { title: "Calculator", query: "calc", desc: "Perform instant math expressions" },
                    { title: "Task Manager", query: "taskmgr", desc: "View CPU, memory, and running processes" },
                  ].map((qs) => (
                    <button
                      key={qs.query}
                      onClick={() => onQueryChange(qs.query)}
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 text-white rounded border border-white/10 transition-colors text-left cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
                        <Search size={16} className="text-cyan-300" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-semibold text-white">{qs.title}</div>
                        <div className="text-xs text-white/50 truncate">{qs.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Query Results */}
          {query.trim() && filteredResults.length > 0 && (
            <>
              {/* BEST MATCH CARD (Top scoring result) */}
              {categorized.bestMatch && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase font-bold text-white/50 tracking-wider px-1">
                    Best Match
                  </span>
                  <div
                    onClick={() => handleExecute(categorized.bestMatch!)}
                    onMouseEnter={() => setSelectedIndex(0)}
                    className={`flex items-center justify-between p-3.5 rounded border transition-all cursor-pointer border-l-4 ${
                      selectedIndex === 0
                        ? "bg-[#0078d7] border-l-white border-white/30 text-white shadow-lg"
                        : "bg-white/10 border-l-transparent border-white/15 text-white/95 hover:bg-white/15"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0 shadow">
                        {categorized.bestMatch.kind === "math" ? (
                          <Calculator size={22} className="text-emerald-300" />
                        ) : categorized.bestMatch.kind === "terminal" ? (
                          <Terminal size={22} className="text-cyan-300" />
                        ) : categorized.bestMatch.kind === "action" ? (
                          renderActionIcon(categorized.bestMatch.icon_name, 22)
                        ) : isWebItem(categorized.bestMatch) ? (
                          <Globe size={22} className="text-cyan-300" />
                        ) : isSettingsItem(categorized.bestMatch) ? (
                          <SettingsIcon size={22} className="text-slate-300" />
                        ) : isFolderItem(categorized.bestMatch) ? (
                          <Folder size={22} className="text-amber-300" />
                        ) : categorized.bestMatch.item.icon ? (
                          <img
                            src={categorized.bestMatch.item.icon}
                            alt={categorized.bestMatch.item.name}
                            className="w-7 h-7 object-contain drop-shadow"
                          />
                        ) : (
                          <Sparkles size={22} className="text-white/90" />
                        )}
                      </div>
                      <div>
                        <div className="text-base font-semibold flex items-center gap-2">
                          <span>
                            {categorized.bestMatch.kind === "math"
                              ? `${categorized.bestMatch.expression} = ${categorized.bestMatch.result}`
                              : categorized.bestMatch.kind === "terminal"
                              ? categorized.bestMatch.command
                              : categorized.bestMatch.kind === "action"
                              ? categorized.bestMatch.title
                              : categorized.bestMatch.item.name}
                          </span>
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase text-cyan-200">
                            Best match
                          </span>
                        </div>
                        <div className="text-xs text-white/60 mt-0.5">
                          {categorized.bestMatch.kind === "math"
                            ? "Calculation"
                            : categorized.bestMatch.kind === "terminal"
                            ? "Command line"
                            : categorized.bestMatch.kind === "action"
                            ? categorized.bestMatch.subtitle
                            : isWebItem(categorized.bestMatch)
                            ? "Web Link"
                            : isSettingsItem(categorized.bestMatch)
                            ? "Windows Settings"
                            : isFolderItem(categorized.bestMatch)
                            ? "File Folder"
                            : `App • ${categorized.bestMatch.item.category}`}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-white/60" />
                  </div>
                </div>
              )}

              {/* APPS SECTION */}
              {categorized.apps.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[11px] uppercase font-bold text-white/50 tracking-wider px-1">
                    Apps
                  </span>
                  <div className="flex flex-col gap-1">
                    {categorized.apps.map(({ item, flatIndex }) =>
                      renderItemRow(item, flatIndex)
                    )}
                  </div>
                </div>
              )}

              {/* SETTINGS SECTION */}
              {categorized.settings.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[11px] uppercase font-bold text-white/50 tracking-wider px-1">
                    Settings
                  </span>
                  <div className="flex flex-col gap-1">
                    {categorized.settings.map(({ item, flatIndex }) =>
                      renderItemRow(item, flatIndex)
                    )}
                  </div>
                </div>
              )}

              {/* FOLDERS SECTION */}
              {categorized.folders.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[11px] uppercase font-bold text-white/50 tracking-wider px-1">
                    Folders
                  </span>
                  <div className="flex flex-col gap-1">
                    {categorized.folders.map(({ item, flatIndex }) =>
                      renderItemRow(item, flatIndex)
                    )}
                  </div>
                </div>
              )}

              {/* WEB SECTION */}
              {categorized.web.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[11px] uppercase font-bold text-white/50 tracking-wider px-1">
                    Web
                  </span>
                  <div className="flex flex-col gap-1">
                    {categorized.web.map(({ item, flatIndex }) =>
                      renderItemRow(item, flatIndex)
                    )}
                  </div>
                </div>
              )}

              {/* TOOLS SECTION */}
              {categorized.tools.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[11px] uppercase font-bold text-white/50 tracking-wider px-1">
                    Tools & Commands
                  </span>
                  <div className="flex flex-col gap-1">
                    {categorized.tools.map(({ item, flatIndex }) =>
                      renderItemRow(item, flatIndex)
                    )}
                  </div>
                </div>
              )}

              {/* Quick web and file explorer triggers at bottom */}
              <div className="flex flex-col gap-1 pt-3 border-t border-white/10 mt-2">
                <span className="text-[11px] uppercase font-bold text-white/40 tracking-wider px-1">
                  Search with Bing / Web
                </span>
                <div
                  onClick={() => {
                    onLaunchApp(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
                    onClose();
                  }}
                  className="flex items-center justify-between px-3 py-2 bg-white/[0.03] hover:bg-white/10 rounded cursor-pointer transition-colors text-white/80 hover:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <Globe size={16} className="text-cyan-300" />
                    <span className="text-xs">Search web for &quot;{query}&quot;</span>
                  </div>
                  <ChevronRight size={14} className="text-white/40" />
                </div>
                <div
                  onClick={() => {
                    onLaunchApp("explorer.exe");
                    onClose();
                  }}
                  className="flex items-center justify-between px-3 py-2 bg-white/[0.03] hover:bg-white/10 rounded cursor-pointer transition-colors text-white/80 hover:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <Folder size={16} className="text-amber-300" />
                    <span className="text-xs">Search documents in File Explorer</span>
                  </div>
                  <ChevronRight size={14} className="text-white/40" />
                </div>
              </div>
            </>
          )}

          {/* Empty search results fallback */}
          {filteredResults.length === 0 && query.trim() && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-white/50">
              <Search size={32} className="text-white/20 mb-2" />
              <div className="text-sm font-medium">No direct matches found</div>
              <div className="text-xs text-white/40 mt-1">
                Press Enter to search the web for &quot;{query}&quot;
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Detail Preview & Actions (5 cols) */}
        <div className="col-span-5 bg-black/40 border border-white/10 p-6 flex flex-col justify-between overflow-y-auto backdrop-blur-md rounded">
          {selectedItem ? (
            <div className="flex flex-col gap-6">
              {/* App / URL / Setting Preview */}
              {selectedItem.kind === "app" && (
                <>
                  <div className="flex items-start gap-4 pb-4 border-b border-white/10">
                    <div className="w-14 h-14 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shadow-lg shrink-0">
                      {isWebItem(selectedItem) ? (
                        <Globe size={30} className="text-cyan-300" />
                      ) : isSettingsItem(selectedItem) ? (
                        <SettingsIcon size={30} className="text-slate-300" />
                      ) : isFolderItem(selectedItem) ? (
                        <Folder size={30} className="text-amber-300" />
                      ) : selectedItem.item.icon ? (
                        <img
                          src={selectedItem.item.icon}
                          alt={selectedItem.item.name}
                          className="w-10 h-10 object-contain drop-shadow"
                        />
                      ) : (
                        <Sparkles size={28} className="text-cyan-300" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="text-xl font-semibold text-white truncate">
                        {selectedItem.item.name}
                      </h3>
                      <div className="text-xs text-white/60 mt-0.5">
                        {isWebItem(selectedItem)
                          ? "Web Link • Browser URL"
                          : isSettingsItem(selectedItem)
                          ? "Windows 10 Settings"
                          : isFolderItem(selectedItem)
                          ? "File Folder"
                          : `App • ${selectedItem.item.category}`}
                      </div>
                      <div
                        className="text-[11px] text-white/40 truncate mt-1 font-mono"
                        title={selectedItem.item.path}
                      >
                        {selectedItem.item.path}
                      </div>
                    </div>
                  </div>

                  {/* Actions List (Windows 10 MenuFlyout style) */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs uppercase font-semibold text-white/50 mb-1">
                      Quick Actions
                    </span>

                    {/* Primary Action Button */}
                    <button
                      onClick={() => handleExecute(selectedItem)}
                      className="flex items-center gap-3 px-3.5 py-2.5 bg-white/5 hover:bg-[#0078d7] text-white text-sm font-medium rounded transition-colors text-left group cursor-pointer"
                    >
                      {isWebItem(selectedItem) ? (
                        <ExternalLink size={16} className="text-cyan-300 group-hover:text-white" />
                      ) : isSettingsItem(selectedItem) ? (
                        <SettingsIcon size={16} className="text-slate-300 group-hover:text-white" />
                      ) : isFolderItem(selectedItem) ? (
                        <Folder size={16} className="text-amber-300 group-hover:text-white" />
                      ) : (
                        <Play size={16} className="text-white/80 group-hover:text-white" />
                      )}
                      <span>
                        {isWebItem(selectedItem)
                          ? "Open in web browser"
                          : isSettingsItem(selectedItem)
                          ? "Open Windows Settings"
                          : isFolderItem(selectedItem)
                          ? "Open in File Explorer"
                          : "Open"}
                      </span>
                    </button>

                    {/* Run as Administrator (only for local apps) */}
                    {!isWebItem(selectedItem) && !isSettingsItem(selectedItem) && (
                      <button
                        onClick={() => handleRunAsAdmin(selectedItem.item.path)}
                        className="flex items-center gap-3 px-3.5 py-2.5 bg-white/5 hover:bg-[#0078d7] text-white text-sm font-medium rounded transition-colors text-left group cursor-pointer"
                      >
                        <Shield size={16} className="text-amber-300 group-hover:text-white" />
                        <span>Run as administrator</span>
                      </button>
                    )}

                    {/* Open File Location (for apps & folders) */}
                    {!isWebItem(selectedItem) && !isSettingsItem(selectedItem) && (
                      <button
                        onClick={() => handleOpenFileLocation(selectedItem.item.path)}
                        className="flex items-center gap-3 px-3.5 py-2.5 bg-white/5 hover:bg-[#0078d7] text-white text-sm font-medium rounded transition-colors text-left group cursor-pointer"
                      >
                        <Folder size={16} className="text-amber-400 group-hover:text-white" />
                        <span>Open file location</span>
                      </button>
                    )}

                    {/* Pin to Start (for apps) */}
                    {!isWebItem(selectedItem) && !isSettingsItem(selectedItem) && (
                      <button
                        onClick={() => onPinToStart(selectedItem.item)}
                        className="flex items-center gap-3 px-3.5 py-2.5 bg-white/5 hover:bg-[#0078d7] text-white text-sm font-medium rounded transition-colors text-left group cursor-pointer"
                      >
                        <Pin size={16} className="text-cyan-300 group-hover:text-white" />
                        <span>
                          {isPinned(selectedItem.item.path)
                            ? "Pinned to Start"
                            : "Pin to Start"}
                        </span>
                      </button>
                    )}

                    {/* Copy Path / URI / URL */}
                    <button
                      onClick={() => handleCopyClipboard(selectedItem.item.path)}
                      className="flex items-center gap-3 px-3.5 py-2 bg-white/[0.03] hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium rounded transition-colors text-left group cursor-pointer"
                    >
                      {copiedText ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} className="text-white/50" />
                      )}
                      <span>
                        {copiedText
                          ? "Copied to clipboard!"
                          : isWebItem(selectedItem)
                          ? "Copy web address"
                          : isSettingsItem(selectedItem)
                          ? "Copy settings command"
                          : "Copy path"}
                      </span>
                    </button>
                  </div>
                </>
              )}

              {/* Instant Math Preview */}
              {selectedItem.kind === "math" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="w-12 h-12 rounded bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center">
                      <Calculator size={24} className="text-emerald-300" />
                    </div>
                    <div>
                      <div className="text-xs text-white/60 uppercase font-semibold">Calculator</div>
                      <div className="text-lg font-bold text-white">Instant Math</div>
                    </div>
                  </div>

                  <div className="bg-black/50 p-4 rounded border border-white/15 text-center">
                    <div className="text-sm text-white/60">{selectedItem.expression} =</div>
                    <div className="text-3xl font-bold text-emerald-400 mt-1">
                      {selectedItem.result}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <button
                      onClick={() => handleCopyClipboard(selectedItem.result)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0078d7] hover:bg-[#1e8be8] text-white text-sm font-medium rounded transition-colors cursor-pointer"
                    >
                      {copiedText ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copiedText ? "Copied to Clipboard!" : "Copy Result"}</span>
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        invoke("launch_app_path", { path: "calc.exe" }).catch(console.error);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded transition-colors cursor-pointer"
                    >
                      <span>Open Windows Calculator</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Terminal Command Preview */}
              {selectedItem.kind === "terminal" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="w-12 h-12 rounded bg-slate-800 border border-white/20 flex items-center justify-center">
                      <Terminal size={24} className="text-cyan-300" />
                    </div>
                    <div>
                      <div className="text-xs text-white/60 uppercase font-semibold">
                        Terminal Command
                      </div>
                      <div className="text-lg font-bold text-white">Command Execution</div>
                    </div>
                  </div>

                  <div className="bg-black/60 p-4 rounded border border-white/20 font-mono text-sm text-cyan-300 break-all">
                    &gt; {selectedItem.command}
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <button
                      onClick={() => handleExecute(selectedItem)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0078d7] hover:bg-[#1e8be8] text-white text-sm font-medium rounded transition-colors cursor-pointer"
                    >
                      <Play size={16} />
                      <span>Run in Windows Terminal</span>
                    </button>
                    <button
                      onClick={() => handleCopyClipboard(selectedItem.command)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded transition-colors cursor-pointer"
                    >
                      {copiedText ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copiedText ? "Copied!" : "Copy Command"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* System Action Preview */}
              {selectedItem.kind === "action" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <div className="w-12 h-12 rounded bg-white/10 border border-white/20 flex items-center justify-center">
                      {renderActionIcon(selectedItem.icon_name, 24)}
                    </div>
                    <div>
                      <div className="text-xs text-white/60 uppercase font-semibold">
                        System Action
                      </div>
                      <div className="text-lg font-bold text-white">{selectedItem.title}</div>
                    </div>
                  </div>

                  <div className="text-sm text-white/70 leading-relaxed bg-white/5 p-4 rounded border border-white/10">
                    {selectedItem.subtitle}
                  </div>

                  <button
                    onClick={() => handleExecute(selectedItem)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0078d7] hover:bg-[#1e8be8] text-white text-sm font-medium rounded transition-colors cursor-pointer mt-2"
                  >
                    <span>Execute {selectedItem.title}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-white/40 gap-3">
              <Sparkles size={32} className="text-white/20" />
              <div className="text-sm">Select an item on the left to preview actions</div>
            </div>
          )}

          {/* Bottom Footer Info */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
            <span>MaruStart OmniSearch</span>
            <span>Windows 10 Fluent Experience</span>
          </div>
        </div>
      </div>
    </div>
  );
};
