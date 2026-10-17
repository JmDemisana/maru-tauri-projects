import React, { useState, useEffect } from "react";
import {
  Menu,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Store,
  Folder,
  Image as ImageIcon,
  Settings,
  Power,
  Moon,
  RotateCcw,
  LogOut,
  BedDouble,
  Lock,
  Users,
  Globe,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { StartView } from "../types";

interface LeftRailProps {
  currentView: StartView;
  onViewChange: (view: StartView) => void;
  onClose: () => void;
  powerMenuStyle?: "flyout" | "fullscreen";
  onOpenPowerDialog?: () => void;
}

const CONFIRM_ACTIONS: Record<string, string> = {
  restart: "Restart now? Unsaved work will be lost.",
  shutdown: "Shut down now? Unsaved work will be lost.",
};

export const LeftRail: React.FC<LeftRailProps> = ({
  currentView,
  onViewChange,
  onClose,
  powerMenuStyle = "fullscreen",
  onOpenPowerDialog,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPowerFlyout, setShowPowerFlyout] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userAccount, setUserAccount] = useState<{
    username: string;
    display_name: string;
    picture_base64?: string;
  } | null>(null);

  useEffect(() => {
    invoke<{ username: string; display_name: string; picture_base64?: string }>("get_user_account_info")
      .then((info) => setUserAccount(info))
      .catch((err) => console.warn("Failed to get user account info:", err));
  }, []);

  const handlePowerAction = async (action: string) => {
    const confirmMsg = CONFIRM_ACTIONS[action];
    if (confirmMsg && !window.confirm(confirmMsg)) {
      setShowPowerFlyout(false);
      return;
    }
    setShowPowerFlyout(false);
    setDrawerOpen(false);
    onClose();
    try {
      await invoke("execute_power_action", { action });
    } catch (err) {
      console.error("Power action failed:", err);
    }
  };

  const openPath = async (path: string) => {
    setDrawerOpen(false);
    onClose();
    try {
      await invoke("launch_app_path", { path });
    } catch (err) {
      console.error("Failed to open path:", err);
    }
  };

  const handlePowerClick = () => {
    if (powerMenuStyle === "fullscreen" && onOpenPowerDialog) {
      setShowPowerFlyout(false);
      setShowUserMenu(false);
      setDrawerOpen(false);
      onOpenPowerDialog();
    } else {
      setShowUserMenu(false);
      setShowPowerFlyout((v) => !v);
    }
  };

  return (
    <>
      {/* Backdrop for expanded drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Base 48px Strip (Flush authentic Windows 10 rail) */}
      <div className="relative w-12 min-w-12 h-full flex flex-col justify-between z-30 bg-black/10 backdrop-blur-md select-none border-r border-white/5">
        {/* Top: Hamburger + View Toggles */}
        <div className="flex flex-col">
          {/* Hamburger Button */}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            title="Start"
            className="w-12 h-12 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors rounded-none cursor-pointer"
          >
            <Menu size={18} />
          </button>

          {/* Pinned Tiles Toggle */}
          <button
            onClick={() => {
              onViewChange("tiles");
              setDrawerOpen(false);
            }}
            title="Pinned tiles"
            className={`relative w-12 h-12 flex items-center justify-center transition-colors rounded-none cursor-pointer ${
              currentView === "tiles"
                ? "text-white bg-white/15"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {currentView === "tiles" && (
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0078d7]" />
            )}
            <LayoutGrid size={18} />
          </button>

          {/* All Apps Toggle */}
          <button
            onClick={() => {
              onViewChange("all-apps");
              setDrawerOpen(false);
            }}
            title="All apps"
            className={`relative w-12 h-12 flex items-center justify-center transition-colors rounded-none cursor-pointer ${
              currentView === "all-apps"
                ? "text-white bg-white/15"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {currentView === "all-apps" && (
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0078d7]" />
            )}
            <List size={18} />
          </button>

          {/* Maru Start Web Apps Toggle */}
          <button
            onClick={() => {
              onViewChange("web-apps");
              setDrawerOpen(false);
            }}
            title="Maru Start Web Apps"
            className={`relative w-12 h-12 flex items-center justify-center transition-colors rounded-none cursor-pointer ${
              currentView === "web-apps"
                ? "text-white bg-white/15"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {currentView === "web-apps" && (
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0078d7]" />
            )}
            <Globe size={18} />
          </button>

          {/* Maru Start Store Toggle */}
          <button
            onClick={() => {
              onViewChange("store");
              setDrawerOpen(false);
            }}
            title="Maru Start Store"
            className={`relative w-12 h-12 flex items-center justify-center transition-colors rounded-none cursor-pointer ${
              currentView === "store"
                ? "text-white bg-white/15"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {currentView === "store" && (
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0078d7]" />
            )}
            <Store size={18} />
          </button>

          {/* Maru Start Customizations Toggle */}
          <button
            onClick={() => {
              onViewChange("customizations");
              setDrawerOpen(false);
            }}
            title="Maru Start Customizations"
            className={`relative w-12 h-12 flex items-center justify-center transition-colors rounded-none cursor-pointer ${
              currentView === "customizations"
                ? "text-white bg-white/15"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {currentView === "customizations" && (
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0078d7]" />
            )}
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Bottom: User + Folders + Settings + Power */}
        <div className="flex flex-col relative">
          {/* User Profile */}
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowPowerFlyout(false);
            }}
            title={userAccount?.display_name || userAccount?.username || "User"}
            className={`w-12 h-12 flex items-center justify-center transition-colors rounded-none cursor-pointer ${
              showUserMenu ? "bg-white/20" : "hover:bg-white/10"
            }`}
          >
            {userAccount?.picture_base64 ? (
              <img
                src={userAccount.picture_base64}
                alt={userAccount.display_name}
                className="w-6 h-6 rounded-full object-cover border border-white/30 shadow-sm"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#0078d7] flex items-center justify-center text-[10px] font-bold text-white shadow">
                {userAccount?.display_name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </button>

          {/* Documents */}
          <button
            onClick={() => openPath("shell:Personal")}
            title="Documents"
            className="w-12 h-12 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-none cursor-pointer"
          >
            <Folder size={18} />
          </button>

          {/* Pictures */}
          <button
            onClick={() => openPath("shell:My Pictures")}
            title="Pictures"
            className="w-12 h-12 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-none cursor-pointer"
          >
            <ImageIcon size={18} />
          </button>

          {/* Settings */}
          <button
            onClick={() => openPath("ms-settings:")}
            title="Settings"
            className="w-12 h-12 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-none cursor-pointer"
          >
            <Settings size={18} />
          </button>

          {/* Power */}
          <button
            onClick={handlePowerClick}
            title="Power"
            className={`w-12 h-12 flex items-center justify-center transition-colors rounded-none cursor-pointer ${
              showPowerFlyout
                ? "bg-[#0078d7] text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Power size={18} />
          </button>

          {/* Power Flyout */}
          {showPowerFlyout && (
            <div
              className="absolute bottom-0 bg-[#2b2b2b] backdrop-blur-3xl border border-white/20 shadow-2xl p-2 flex flex-col gap-1 w-72 z-[70] text-white select-none rounded-none animate-in fade-in duration-100"
              style={{ left: drawerOpen ? "256px" : "48px" }}
            >
              <button
                onClick={() => handlePowerAction("hibernate")}
                className="flex items-center gap-4 px-3 py-3 text-base text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-10 h-10 bg-transparent flex items-center justify-center shrink-0 text-white rounded-none">
                  <Moon size={20} className="text-white drop-shadow-sm" />
                </div>
                <div>
                  <div className="font-medium text-[15px] text-white">Hibernate</div>
                  <div className="text-[12px] text-white/60">Saves session & powers off</div>
                </div>
              </button>

              <button
                onClick={() => handlePowerAction("sleep")}
                className="flex items-center gap-4 px-3 py-3 text-base text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-10 h-10 bg-transparent flex items-center justify-center shrink-0 text-white rounded-none">
                  <BedDouble size={20} className="text-white drop-shadow-sm" />
                </div>
                <span className="font-medium text-[15px] text-white">Sleep</span>
              </button>

              <button
                onClick={() => handlePowerAction("lock")}
                className="flex items-center gap-4 px-3 py-3 text-base text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-10 h-10 bg-transparent flex items-center justify-center shrink-0 text-white rounded-none">
                  <Lock size={20} className="text-white drop-shadow-sm" />
                </div>
                <span className="font-medium text-[15px] text-white">Lock</span>
              </button>

              <button
                onClick={() => handlePowerAction("restart")}
                className="flex items-center gap-4 px-3 py-3 text-base text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-10 h-10 bg-transparent flex items-center justify-center shrink-0 text-white rounded-none">
                  <RotateCcw size={20} className="text-white drop-shadow-sm" />
                </div>
                <span className="font-medium text-[15px] text-white">Restart</span>
              </button>

              <button
                onClick={() => handlePowerAction("signout")}
                className="flex items-center gap-4 px-3 py-3 text-base text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-10 h-10 bg-transparent flex items-center justify-center shrink-0 text-white rounded-none">
                  <LogOut size={20} className="text-white drop-shadow-sm" />
                </div>
                <span className="font-medium text-[15px] text-white">Sign out</span>
              </button>

              <div className="h-px bg-white/15 my-1.5" />

              <button
                onClick={() => handlePowerAction("shutdown")}
                className="flex items-center gap-4 px-3 py-3 text-base text-left hover:bg-red-600/80 active:bg-red-700 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-10 h-10 bg-transparent flex items-center justify-center shrink-0 text-white rounded-none">
                  <Power size={20} className="text-white drop-shadow-sm" />
                </div>
                <span className="font-medium text-[15px] text-white">Shut down</span>
              </button>
            </div>
          )}

          {/* Windows 10 User Account Flyout */}
          {showUserMenu && (
            <div
              className="absolute bottom-48 bg-[#2b2b2b] backdrop-blur-3xl border border-white/20 shadow-2xl p-2 flex flex-col gap-1 w-72 z-[70] text-white rounded-none select-none animate-in fade-in duration-100"
              style={{ left: drawerOpen ? "256px" : "48px" }}
            >
              {/* User Header */}
              <div className="flex items-center gap-4 px-3 py-4 border-b border-white/10 mb-2">
                {userAccount?.picture_base64 ? (
                  <img
                    src={userAccount.picture_base64}
                    alt={userAccount.display_name}
                    className="w-12 h-12 rounded-full object-cover border border-white/30"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#0078d7] flex items-center justify-center text-lg font-bold text-white shadow-md">
                    {userAccount?.display_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <div className="truncate flex-1">
                  <div className="text-[16px] font-semibold truncate text-white">
                    {userAccount?.display_name || userAccount?.username || "User"}
                  </div>
                  <div className="text-[13px] text-white/60">Signed in</div>
                </div>
              </div>

              {/* Change account settings */}
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  openPath("ms-settings:yourinfo");
                }}
                className="flex items-center gap-4 px-3 py-3 text-[15px] text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-10 h-10 bg-transparent flex items-center justify-center shrink-0 text-white rounded-none">
                  <Settings size={20} className="text-white drop-shadow-sm" />
                </div>
                <span>Change account settings</span>
              </button>

              {/* Lock */}
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  handlePowerAction("lock");
                }}
                className="flex items-center gap-4 px-3 py-3 text-[15px] text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-10 h-10 bg-transparent flex items-center justify-center shrink-0 text-white rounded-none">
                  <Lock size={20} className="text-white drop-shadow-sm" />
                </div>
                <span>Lock</span>
              </button>

              {/* Log out */}
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  handlePowerAction("logout");
                }}
                className="flex items-center gap-4 px-3 py-3 text-[15px] text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-10 h-10 bg-transparent flex items-center justify-center shrink-0 text-white rounded-none">
                  <LogOut size={20} className="text-white drop-shadow-sm" />
                </div>
                <span>Log out</span>
              </button>

              {/* Switch User */}
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  handlePowerAction("switch-user");
                }}
                className="flex items-center gap-4 px-3 py-3 text-[15px] text-left hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer rounded-none group"
              >
                <div className="w-10 h-10 bg-transparent flex items-center justify-center shrink-0 text-white rounded-none">
                  <Users size={20} className="text-white drop-shadow-sm" />
                </div>
                <span>Switch User</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Overlay Drawer (Matches Windows 10 Hamburger Drawer) */}
      {drawerOpen && (
        <div className="absolute inset-y-0 left-0 w-64 bg-black/70 backdrop-blur-2xl border-r border-white/10 shadow-2xl flex flex-col justify-between z-50 select-none animate-in fade-in slide-in-from-left-2 duration-150">
          {/* Top Items */}
          <div className="flex flex-col">
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-full h-12 flex items-center px-0 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer rounded-none"
            >
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <Menu size={18} />
              </div>
              <span className="text-xs font-semibold tracking-wider uppercase text-white/90">START</span>
            </button>

            <button
              onClick={() => {
                onViewChange("tiles");
                setDrawerOpen(false);
              }}
              className={`w-full h-12 flex items-center px-0 transition-colors text-left cursor-pointer rounded-none relative ${
                currentView === "tiles" ? "bg-white/15 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              {currentView === "tiles" && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0078d7]" />
              )}
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <LayoutGrid size={18} />
              </div>
              <span className="text-[13px] font-normal text-white">Pinned tiles</span>
            </button>

            <button
              onClick={() => {
                onViewChange("all-apps");
                setDrawerOpen(false);
              }}
              className={`w-full h-12 flex items-center px-0 transition-colors text-left cursor-pointer rounded-none relative ${
                currentView === "all-apps" ? "bg-white/15 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              {currentView === "all-apps" && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0078d7]" />
              )}
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <List size={18} />
              </div>
              <span className="text-[13px] font-normal text-white">All apps</span>
            </button>

            <button
              onClick={() => {
                onViewChange("web-apps");
                setDrawerOpen(false);
              }}
              className={`w-full h-12 flex items-center px-0 transition-colors text-left cursor-pointer rounded-none relative ${
                currentView === "web-apps" ? "bg-white/15 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              {currentView === "web-apps" && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0078d7]" />
              )}
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <Globe size={18} />
              </div>
              <span className="text-[13px] font-normal text-white">Maru Start Web Apps</span>
            </button>

            <button
              onClick={() => {
                onViewChange("store");
                setDrawerOpen(false);
              }}
              className={`w-full h-12 flex items-center px-0 transition-colors text-left cursor-pointer rounded-none relative ${
                currentView === "store" ? "bg-white/15 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              {currentView === "store" && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0078d7]" />
              )}
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <Store size={18} />
              </div>
              <span className="text-[13px] font-normal text-white">Maru Start Store</span>
            </button>

            <button
              onClick={() => {
                onViewChange("customizations");
                setDrawerOpen(false);
              }}
              className={`w-full h-12 flex items-center px-0 transition-colors text-left cursor-pointer rounded-none relative ${
                currentView === "customizations" ? "bg-white/15 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              {currentView === "customizations" && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0078d7]" />
              )}
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <SlidersHorizontal size={18} />
              </div>
              <span className="text-[13px] font-normal text-white">Maru Start Customizations</span>
            </button>
          </div>

          {/* Bottom Items */}
          <div className="flex flex-col">
            <button
              onClick={() => {
                setDrawerOpen(false);
                setShowUserMenu(true);
              }}
              title={`${userAccount?.display_name || userAccount?.username || "User"} (signed in)`}
              className="w-full h-12 flex items-center px-0 text-white/90 hover:bg-white/10 transition-colors text-left cursor-pointer rounded-none"
            >
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                {userAccount?.picture_base64 ? (
                  <img
                    src={userAccount.picture_base64}
                    alt={userAccount.display_name}
                    className="w-7 h-7 rounded-full object-cover border border-white/30 shadow-sm"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#0078d7] flex items-center justify-center text-xs font-bold text-white shadow">
                    {userAccount?.display_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <span className="text-[13px] font-medium truncate pr-4 text-white">
                {userAccount?.display_name || userAccount?.username || "User"}
              </span>
            </button>

            <button
              onClick={() => openPath("shell:Personal")}
              className="w-full h-12 flex items-center px-0 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer rounded-none"
            >
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <Folder size={18} />
              </div>
              <span className="text-[13px]">Documents</span>
            </button>

            <button
              onClick={() => openPath("shell:My Pictures")}
              className="w-full h-12 flex items-center px-0 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer rounded-none"
            >
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <ImageIcon size={18} />
              </div>
              <span className="text-[13px]">Pictures</span>
            </button>

            <button
              onClick={() => openPath("ms-settings:")}
              className="w-full h-12 flex items-center px-0 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer rounded-none"
            >
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <Settings size={18} />
              </div>
              <span className="text-[13px]">Settings</span>
            </button>

            <button
              onClick={handlePowerClick}
              className="w-full h-12 flex items-center px-0 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer rounded-none"
            >
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <Power size={18} />
              </div>
              <span className="text-[13px]">Power</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
