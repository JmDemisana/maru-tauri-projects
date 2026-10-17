import React from "react";
import { AppItem } from "../types";
import { Pin, Shield, FolderOpen } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

export interface AppContextMenuState {
  x: number;
  y: number;
  app: AppItem;
}

interface AllAppsContextMenuProps {
  state: AppContextMenuState;
  onClose: () => void;
  onPinToStart: (app: AppItem) => void;
}

export const AllAppsContextMenu: React.FC<AllAppsContextMenuProps> = ({
  state,
  onClose,
  onPinToStart,
}) => {
  const { app } = state;

  const handleRunAdmin = async () => {
    onClose();
    try {
      await invoke("launch_app_admin", { path: app.path });
    } catch (err) {
      console.error("Admin launch failed:", err);
    }
  };

  const handleOpenLocation = async () => {
    onClose();
    try {
      await invoke("open_file_location", { path: app.path });
    } catch (err) {
      console.error("Open location failed:", err);
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
      <div
        className="absolute w-64 sm:w-72 bg-[#2b2b2b] border border-white/20 shadow-2xl text-white py-1.5 text-[13.5px] select-none rounded-none z-50"
        style={{
          left: Math.min(state.x, window.innerWidth - 300),
          top: Math.min(state.y, window.innerHeight - 200),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            onPinToStart(app);
            onClose();
          }}
          className="w-full h-11 sm:h-12 flex items-center gap-3.5 px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
        >
          <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
            <Pin size={17} className="text-white" />
          </div>
          <span className="text-white">Pin to Start</span>
        </button>

        <button
          onClick={handleRunAdmin}
          className="w-full h-11 sm:h-12 flex items-center gap-3.5 px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
        >
          <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
            <Shield size={17} className="text-white" />
          </div>
          <span className="text-white">Run as administrator</span>
        </button>

        <button
          onClick={handleOpenLocation}
          className="w-full h-11 sm:h-12 flex items-center gap-3.5 px-3 text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
        >
          <div className="w-8 h-8 bg-[#383838] flex items-center justify-center shrink-0 text-white rounded-none">
            <FolderOpen size={17} className="text-white" />
          </div>
          <span className="text-white">Open file location</span>
        </button>
      </div>
    </div>
  );
};
