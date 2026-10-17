import React, { useState } from "react";
import { MaruStartConfig, CustomTile } from "../types";
import {
  Palette,
  Sliders,
  Zap,
  RotateCcw,
  Download,
  Upload,
  Check,
  LayoutGrid,
  List,
  Power,
} from "lucide-react";

interface CustomizationsTabProps {
  config: MaruStartConfig;
  onUpdateConfig: (newConfig: Partial<MaruStartConfig>) => void;
  tiles: CustomTile[];
  onResetTiles: () => void;
  onImportTiles: (tiles: CustomTile[]) => void;
}

const ACCENT_COLORS = [
  { name: "Windows Blue (Default)", hex: "#0078d7" },
  { name: "Cobalt Navy", hex: "#002050" },
  { name: "Teal Green", hex: "#008272" },
  { name: "Emerald Green", hex: "#107c41" },
  { name: "Crimson Red", hex: "#b33939" },
  { name: "Rose Pink", hex: "#ff71a2" },
  { name: "Royal Purple", hex: "#68217a" },
  { name: "Lavender Violet", hex: "#8b5cf6" },
  { name: "Rust Orange", hex: "#d83b01" },
  { name: "Charcoal Dark", hex: "#2d2d30" },
];

export const CustomizationsTab: React.FC<CustomizationsTabProps> = ({
  config,
  onUpdateConfig,
  tiles,
  onResetTiles,
  onImportTiles,
}) => {
  const [copyNotice, setCopyNotice] = useState(false);
  const [importText, setImportText] = useState("");
  const [showImportBox, setShowImportBox] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExport = () => {
    const json = JSON.stringify(tiles, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopyNotice(true);
      setTimeout(() => setCopyNotice(false), 2000);
    });
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText);
      if (Array.isArray(parsed)) {
        onImportTiles(parsed);
        setShowImportBox(false);
        setImportText("");
        setImportError(null);
      } else {
        setImportError("Invalid layout format: must be an array of tiles.");
      }
    } catch {
      setImportError("Invalid JSON syntax. Please check the pasted text.");
    }
  };

  return (
    <div
      className="relative w-full h-full flex flex-col items-center select-none overflow-y-auto no-scrollbar"
      style={{ paddingTop: "72px", paddingBottom: "80px" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="w-full max-w-3xl flex flex-col gap-8 px-6 sm:px-10">
        {/* Header */}
        <div className="flex flex-col gap-1.5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Sliders size={24} className="text-[#0078d7]" />
            <h1 className="text-2xl font-light tracking-tight text-white">
              Maru Start Customizations
            </h1>
          </div>
          <p className="text-xs text-white/60">
            Personalize your Windows 10 Start Menu experience, colors, acrylic glass, and performance.
          </p>
        </div>

        {/* 1. Potato PC Optimization Mode */}
        <div className="flex flex-col gap-3 p-4 bg-white/[0.04] border border-white/10 rounded-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">
                  Potato PC Ultra-Smooth Mode
                </div>
                <div className="text-xs text-white/60">
                  Disables heavy 3D card tilt and reduces blur passes for 100% stutter-free 60 FPS.
                </div>
              </div>
            </div>
            <button
              onClick={() =>
                onUpdateConfig({ potatoPcMode: !config.potatoPcMode })
              }
              className={`w-12 h-6 flex items-center p-0.5 rounded-full transition-colors cursor-pointer ${
                config.potatoPcMode ? "bg-[#0078d7]" : "bg-white/20"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  config.potatoPcMode ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 2. Accent Color */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Palette size={18} className="text-cyan-400" />
            <span>Accent Color</span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {ACCENT_COLORS.map((c) => {
              const isSelected = config.accentColor === c.hex;
              return (
                <button
                  key={c.hex}
                  onClick={() => onUpdateConfig({ accentColor: c.hex })}
                  title={c.name}
                  style={{ backgroundColor: c.hex }}
                  className={`w-10 h-10 flex items-center justify-center transition-all cursor-pointer rounded-none relative ${
                    isSelected ? "ring-2 ring-white scale-105" : "hover:scale-105"
                  }`}
                >
                  {isSelected && <Check size={18} className="text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Acrylic & Blur Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tile Acrylic Opacity */}
          <div className="flex flex-col gap-2 p-3.5 bg-white/[0.03] border border-white/10 rounded-none">
            <div className="flex justify-between text-xs font-medium text-white/90">
              <span>Tile Glass Opacity</span>
              <span>{Math.round(config.acrylicOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.04"
              max="0.25"
              step="0.01"
              value={config.acrylicOpacity}
              onChange={(e) =>
                onUpdateConfig({ acrylicOpacity: parseFloat(e.target.value) })
              }
              className="accent-[#0078d7] cursor-pointer"
            />
            <span className="text-[11px] text-white/50">
              Frosted glass intensity for pinned tiles
            </span>
          </div>

          {/* Background Wallpaper Blur */}
          <div className="flex flex-col gap-2 p-3.5 bg-white/[0.03] border border-white/10 rounded-none">
            <div className="flex justify-between text-xs font-medium text-white/90">
              <span>Wallpaper Blur</span>
              <span>{config.bgBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="2"
              value={config.bgBlur}
              onChange={(e) =>
                onUpdateConfig({ bgBlur: parseInt(e.target.value, 10) })
              }
              className="accent-[#0078d7] cursor-pointer"
            />
            <span className="text-[11px] text-white/50">
              Depth of blur over your desktop wallpaper
            </span>
          </div>
        </div>

        {/* 4. Start Menu Behavior */}
        <div className="flex flex-col gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-none">
          <div className="text-sm font-semibold text-white">Start Menu Behavior</div>

          {/* Default Opening View */}
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="text-xs font-medium text-white">Default Opening View</div>
              <div className="text-[11px] text-white/50">
                Choose which tab opens when pressing the Windows Key
              </div>
            </div>
            <div className="flex items-center gap-1 bg-black/40 p-0.5 border border-white/15">
              <button
                onClick={() => onUpdateConfig({ defaultView: "tiles" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  config.defaultView === "tiles"
                    ? "bg-[#0078d7] text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <LayoutGrid size={14} />
                <span>Pinned tiles</span>
              </button>
              <button
                onClick={() => onUpdateConfig({ defaultView: "all-apps" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  config.defaultView === "all-apps"
                    ? "bg-[#0078d7] text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <List size={14} />
                <span>All apps</span>
              </button>
            </div>
          </div>

          {/* Power Menu Experience */}
          <div className="flex items-center justify-between py-1 border-t border-white/10 pt-3">
            <div>
              <div className="text-xs font-medium text-white">Power Options Style</div>
              <div className="text-[11px] text-white/50">
                Choose between Full Screen Android-style cards or Classic Windows 10 flyout
              </div>
            </div>
            <div className="flex items-center gap-1 bg-black/40 p-0.5 border border-white/15">
              <button
                onClick={() => onUpdateConfig({ powerMenuStyle: "fullscreen" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  config.powerMenuStyle === "fullscreen" || !config.powerMenuStyle
                    ? "bg-[#0078d7] text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Power size={14} />
                <span>Full Screen (Android)</span>
              </button>
              <button
                onClick={() => onUpdateConfig({ powerMenuStyle: "flyout" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  config.powerMenuStyle === "flyout"
                    ? "bg-[#0078d7] text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <span>Classic Flyout</span>
              </button>
            </div>
          </div>

          {/* Live Tiles Animation */}
          <div className="flex items-center justify-between py-1 border-t border-white/10 pt-3">
            <div>
              <div className="text-xs font-medium text-white">Live Tiles 3D Flips</div>
              <div className="text-[11px] text-white/50">
                Periodically rotate live tiles to show real-time information
              </div>
            </div>
            <button
              onClick={() =>
                onUpdateConfig({ enableLiveTiles: !config.enableLiveTiles })
              }
              className={`w-12 h-6 flex items-center p-0.5 rounded-full transition-colors cursor-pointer ${
                config.enableLiveTiles ? "bg-[#0078d7]" : "bg-white/20"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  config.enableLiveTiles ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 5. Backup, Restore & Reset */}
        <div className="flex flex-col gap-3 p-4 bg-white/[0.03] border border-white/10 rounded-none">
          <div className="text-sm font-semibold text-white">Tiles Layout Management</div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors rounded-none cursor-pointer"
            >
              <Download size={15} />
              <span>Export Layout JSON</span>
            </button>

            <button
              onClick={() => setShowImportBox(!showImportBox)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors rounded-none cursor-pointer"
            >
              <Upload size={15} />
              <span>Import Layout JSON</span>
            </button>

            <button
              onClick={onResetTiles}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white/10 hover:bg-red-600/80 text-white transition-colors rounded-none cursor-pointer ml-auto"
            >
              <RotateCcw size={15} />
              <span>Reset Tiles to Default</span>
            </button>
          </div>

          {copyNotice && (
            <div className="text-xs text-emerald-400 font-medium">
              ✓ Tile layout copied to clipboard!
            </div>
          )}

          {/* Import Box */}
          {showImportBox && (
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/10">
              <textarea
                rows={4}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste your exported tiles JSON here..."
                className="w-full bg-black/50 border border-white/20 text-white text-xs p-2 font-mono outline-none focus:border-[#0078d7]"
              />
              {importError && (
                <div className="text-xs text-red-400">{importError}</div>
              )}
              <button
                onClick={handleImport}
                className="self-start px-4 py-1.5 text-xs font-semibold bg-[#0078d7] hover:bg-[#005a9e] text-white cursor-pointer"
              >
                Apply Imported Tiles
              </button>
            </div>
          )}
        </div>

        {/* Footer Credit */}
        <div className="flex items-center justify-between text-[11px] text-white/40 pt-4 border-t border-white/5">
          <span>MaruStart &bull; Windows 10 Start Menu Experience</span>
          <span className="flex items-center gap-1">
            Crafted for <span className="text-white/70">Maru-Senpai</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CustomizationsTab;
