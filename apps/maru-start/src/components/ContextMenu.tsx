import React, { useState, useRef } from "react";
import { CustomTile, TileSize } from "../types";
import {
  PinOff,
  Maximize2,
  ChevronRight,
  Shield,
  FolderOpen,
  Palette,
  Sparkles,
  Check,
  Image as ImageIcon,
  Trash2,
  Radio,
  Settings as SettingsIcon,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

export interface ContextMenuState {
  x: number;
  y: number;
  tile: CustomTile;
}

interface ContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onUnpin: (id: string) => void;
  onResize: (id: string, size: TileSize) => void;
  onChangeColor: (id: string, color: string) => void;
  onToggleLive: (id: string) => void;
  onChangeImage?: (id: string, image?: string) => void;
}

const COLOR_OPTIONS = [
  { name: "Acrylic Plate (Default)", color: "acrylic" },
  { name: "Windows Blue", color: "#0078d7" },
  { name: "Cobalt Navy", color: "#002050" },
  { name: "Teal", color: "#008272" },
  { name: "Emerald Green", color: "#107c41" },
  { name: "Crimson Red", color: "#b33939" },
  { name: "Rose Pink", color: "#ff71a2" },
  { name: "Royal Purple", color: "#68217a" },
  { name: "Lavender Violet", color: "#8b5cf6" },
  { name: "Rust Orange", color: "#d83b01" },
  { name: "Dark Charcoal", color: "#2d2d30" },
];

export const ContextMenu: React.FC<ContextMenuProps> = ({
  state,
  onClose,
  onUnpin,
  onResize,
  onChangeColor,
  onToggleLive,
  onChangeImage,
}) => {
  const [activeSubmenu, setActiveSubmenu] = useState<"resize" | "more" | "color" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { tile } = state;

  const handleRunAdmin = async () => {
    onClose();
    if (tile.appPath) {
      try {
        await invoke("launch_app_admin", { path: tile.appPath });
      } catch (err) {
        console.error("Admin launch failed:", err);
      }
    }
  };

  const handleOpenLocation = async () => {
    onClose();
    if (tile.appPath) {
      try {
        await invoke("open_file_location", { path: tile.appPath });
      } catch (err) {
        console.error("Open location failed:", err);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onChangeImage) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onChangeImage(tile.id, reader.result);
        }
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  // Render authentic Windows 10 geometric size icons
  const renderSizeIcon = (size: TileSize) => {
    switch (size) {
      case "small":
        return <div className="w-2.5 h-2.5 border border-white/80 shrink-0" />;
      case "medium":
        return <div className="w-3.5 h-3.5 border border-white/80 shrink-0" />;
      case "wide":
        return <div className="w-5 h-3 border border-white/80 shrink-0" />;
      case "large":
        return <div className="w-4.5 h-4.5 border border-white/80 shrink-0" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 select-none"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {/* Hidden file picker for custom tile photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Authentic Windows 10 Context Menu: Charcoal, 0px radius, sharp drop shadow, roomy tablet touch targets */}
      <div
        className="absolute w-64 sm:w-72 bg-[#2b2b2b] border border-white/20 shadow-2xl text-white py-1.5 text-[13.5px] select-none rounded-none z-50"
        style={{
          left: Math.min(state.x, window.innerWidth - 300),
          top: Math.min(state.y, window.innerHeight - 340),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Unpin from Start */}
        <button
          onClick={() => {
            onUnpin(tile.id);
            onClose();
          }}
          className="w-full h-11 sm:h-12 flex items-center gap-3.5 px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
        >
          <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
            <PinOff size={17} className="text-white" />
          </div>
          <span className="text-white">Unpin from Start</span>
        </button>

        {/* Resize Submenu */}
        <div
          className="relative"
          onMouseEnter={() => setActiveSubmenu("resize")}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          <button className="w-full h-11 sm:h-12 flex items-center justify-between px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group">
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
                <Maximize2 size={17} className="text-white" />
              </div>
              <span className="text-white">Resize</span>
            </div>
            <ChevronRight size={16} className="text-white/70 mr-1" />
          </button>

          {activeSubmenu === "resize" && (
            <div className="absolute left-full -top-1.5 w-52 bg-[#2b2b2b] border border-white/20 shadow-2xl py-1 text-[13.5px] rounded-none z-50">
              {(["small", "medium", "wide", "large"] as TileSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    onResize(tile.id, size);
                    onClose();
                  }}
                  className="w-full h-11 flex items-center justify-between px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none capitalize group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
                      {renderSizeIcon(size)}
                    </div>
                    <span className="text-white">{size}</span>
                  </div>
                  {tile.size === size && <Check size={16} className="text-white font-bold mr-1" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Change Tile Picture Option */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-11 sm:h-12 flex items-center gap-3.5 px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
        >
          <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
            <ImageIcon size={17} className="text-white" />
          </div>
          <span className="text-white">Change tile picture...</span>
        </button>

        {/* Remove Tile Picture (if custom image is active) */}
        {tile.customImage && (
          <button
            onClick={() => {
              onChangeImage?.(tile.id, undefined);
              onClose();
            }}
            className="w-full h-11 sm:h-12 flex items-center gap-3.5 px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group text-red-300 hover:text-red-200"
          >
            <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
              <Trash2 size={16} className="text-red-400" />
            </div>
            <span>Remove custom picture</span>
          </button>
        )}

        {/* More Submenu */}
        <div
          className="relative"
          onMouseEnter={() => setActiveSubmenu("more")}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          <button className="w-full h-11 sm:h-12 flex items-center justify-between px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group">
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
                <Sparkles size={17} className="text-white" />
              </div>
              <span className="text-white">More</span>
            </div>
            <ChevronRight size={16} className="text-white/70 mr-1" />
          </button>

          {activeSubmenu === "more" && (
            <div className="absolute left-full -top-1.5 w-60 bg-[#2b2b2b] border border-white/20 shadow-2xl py-1 text-[13.5px] rounded-none z-50">
              {tile.isLive !== undefined && (
                <button
                  onClick={() => {
                    onToggleLive(tile.id);
                    onClose();
                  }}
                  className="w-full h-11 flex items-center gap-3.5 px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
                >
                  <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
                    <Radio size={16} className="text-white" />
                  </div>
                  <span className="text-white">{tile.isLive ? "Turn Live Tile off" : "Turn Live Tile on"}</span>
                </button>
              )}

              <button
                onClick={handleRunAdmin}
                className="w-full h-11 flex items-center gap-3.5 px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
                  <Shield size={16} className="text-white" />
                </div>
                <span className="text-white">Run as administrator</span>
              </button>

              <button
                onClick={handleOpenLocation}
                className="w-full h-11 flex items-center gap-3.5 px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
                  <FolderOpen size={16} className="text-white" />
                </div>
                <span className="text-white">Open file location</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  invoke("launch_app_path", { path: "ms-settings:" }).catch(() => {});
                }}
                className="w-full h-11 flex items-center gap-3.5 px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
                  <SettingsIcon size={16} className="text-white" />
                </div>
                <span className="text-white">App settings</span>
              </button>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-px bg-white/15 my-1.5" />

        {/* Tile Color Flyout */}
        <div
          className="relative"
          onMouseEnter={() => setActiveSubmenu("color")}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          <button className="w-full h-11 sm:h-12 flex items-center justify-between px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group">
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
                <Palette size={17} className="text-white" />
              </div>
              <span className="text-white">Tile Color</span>
            </div>
            <ChevronRight size={16} className="text-white/70 mr-1" />
          </button>

          {activeSubmenu === "color" && (
            <div className="absolute left-full -top-1.5 p-2.5 w-56 bg-[#2b2b2b] border border-white/20 shadow-2xl grid grid-cols-4 gap-2 rounded-none z-50">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.color}
                  onClick={() => {
                    onChangeColor(tile.id, c.color);
                    onClose();
                  }}
                  title={c.name}
                  style={{
                    backgroundColor: c.color === "acrylic" ? "rgba(255, 255, 255, 0.2)" : c.color,
                  }}
                  className="w-10 h-10 rounded-none border border-white/25 hover:border-white transition-all flex items-center justify-center cursor-pointer"
                >
                  {(tile.color === c.color || (!tile.color && c.color === "acrylic")) && (
                    <Check size={16} className="text-white drop-shadow font-bold" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
