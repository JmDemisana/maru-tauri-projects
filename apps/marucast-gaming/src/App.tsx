import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TitleBar } from "@maru/ui";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { AppHubScreen } from "./screens/AppHubScreen";
import { RecentTasksScreen } from "./screens/RecentTasksScreen";
import { ConnectionScreen } from "./screens/ConnectionScreen";
import { ControlsScreen } from "./screens/ControlsScreen";
import {
  NavigationScreen,
  AdbDevice,
  AndroidApp,
  RecentTask,
  AppSession,
  AudioRoutingMode,
} from "./types";

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<NavigationScreen>(
    NavigationScreen.GAMES_HUB
  );
  const [devices, setDevices] = useState<AdbDevice[]>([]);
  const [activeDevice, setActiveDevice] = useState<AdbDevice | null>(null);
  const [apps, setApps] = useState<AndroidApp[]>([]);
  const [recents, setRecents] = useState<RecentTask[]>([]);
  const [activeSessions, setActiveSessions] = useState<AppSession[]>([]);
  const [audioMode, setAudioMode] = useState<AudioRoutingMode>("phone");
  const [dpi, setDpi] = useState<number>(() => {
    const saved = localStorage.getItem("marucast_dpi");
    return saved ? parseInt(saved, 10) : 240;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSelectDpi = (val: number) => {
    setDpi(val);
    localStorage.setItem("marucast_dpi", val.toString());
  };

  // 1. Fetch connected devices
  const fetchDevices = useCallback(async () => {
    try {
      const devs = await invoke<AdbDevice[]>("get_devices");
      setDevices(devs);
      if (devs.length > 0) {
        if (!activeDevice || !devs.find((d) => d.serial === activeDevice.serial)) {
          setActiveDevice(devs[0]);
        }
      } else {
        setActiveDevice(null);
      }
    } catch (e) {
      console.error("Failed to fetch devices:", e);
    }
  }, [activeDevice]);

  // 2. Fetch installed apps & recent tasks
  const fetchAppsAndRecents = useCallback(async () => {
    setIsLoading(true);
    try {
      const serial = activeDevice?.serial || "";
      const [appList, recentList] = await Promise.all([
        invoke<AndroidApp[]>("get_apps", { device: serial }),
        invoke<RecentTask[]>("get_recents", { device: serial }),
      ]);
      setApps(appList);
      setRecents(recentList);
    } catch (e) {
      console.error("Failed to fetch apps/recents:", e);
    } finally {
      setIsLoading(false);
    }
  }, [activeDevice]);

  // Live polling every 4 seconds to detect device connections/disconnections
  useEffect(() => {
    fetchDevices();
    const interval = setInterval(() => {
      fetchDevices();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  useEffect(() => {
    if (activeDevice) {
      fetchAppsAndRecents();
    }
  }, [activeDevice]);

  // 3. Global Shift+Space Keybinding -> Android Back Button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.code === "Space" || e.key === " ")) {
        e.preventDefault();
        if (activeDevice) {
          invoke("send_back", { device: activeDevice.serial }).catch(console.error);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDevice]);

  // 4. Action Handlers
  const handleConnect = async (ipPort: string) => {
    await invoke("connect_device", { ipPort });
    localStorage.setItem("marucast_last_ip_port", ipPort);
    await fetchDevices();
  };

  const handlePair = async (ipPort: string, code: string) => {
    await invoke("pair_device", { ipPort, code });
    await fetchDevices();
  };

  const handleAutoReconnect = async (): Promise<string> => {
    const res = await invoke<string>("auto_reconnect_device");
    await fetchDevices();
    return res;
  };

  const handleDiscoverMdns = async (): Promise<string[]> => {
    return await invoke<string[]>("discover_mdns");
  };

  const handleLaunchApp = async (app: AndroidApp) => {
    if (!activeDevice) {
      setCurrentScreen(NavigationScreen.CONNECTIVITY);
      return;
    }

    try {
      const session = await invoke<AppSession>("launch_app", {
        device: activeDevice.serial,
        packageName: app.package_name,
        appName: app.label,
        audioMode: audioMode,
        dpi: dpi,
      });
      setActiveSessions((prev) => [...prev, session]);
    } catch (e) {
      alert(`Failed to launch app: ${e}`);
    }
  };

  const handleLaunchTask = async (task: RecentTask) => {
    if (!activeDevice) return;
    try {
      const session = await invoke<AppSession>("launch_app", {
        device: activeDevice.serial,
        packageName: task.package_name,
        appName: task.label,
        audioMode: audioMode,
        dpi: dpi,
      });
      setActiveSessions((prev) => [...prev, session]);
    } catch (e) {
      alert(`Failed to launch task: ${e}`);
    }
  };

  const handleStopSession = async (sessionId: string) => {
    try {
      await invoke("stop_app", { sessionId });
      setActiveSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    } catch (e) {
      console.error("Failed to stop session:", e);
    }
  };

  const handleCloseTask = async (packageName: string) => {
    if (!activeDevice) return;
    try {
      await invoke("close_task", {
        device: activeDevice.serial,
        packageName: packageName,
      });
      setRecents((prev) => prev.filter((t) => t.package_name !== packageName));
    } catch (e) {
      console.error("Failed to close task:", e);
    }
  };

  const handleCloseAllTasks = async () => {
    if (!activeDevice) return;
    try {
      for (const task of recents) {
        await invoke("close_task", {
          device: activeDevice.serial,
          packageName: task.package_name,
        });
      }
      setRecents([]);
    } catch (e) {
      console.error("Failed to close all tasks:", e);
    }
  };

  const handleUninstallApp = async (app: AndroidApp) => {
    if (!activeDevice) return;
    try {
      await invoke("uninstall_app", {
        device: activeDevice.serial,
        packageName: app.package_name,
      });
      setApps((prev) => prev.filter((a) => a.package_name !== app.package_name));
      setRecents((prev) => prev.filter((t) => t.package_name !== app.package_name));
    } catch (e) {
      alert(`Failed to uninstall ${app.label}: ${e}`);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        background: "var(--maru-bg-dark)",
        color: "var(--maru-text-main)",
        overflow: "hidden",
      }}
    >
      {/* Mandatory Custom Windows 11 TitleBar */}
      <TitleBar title="Marucast for Gaming" />

      {/* Main App Body */}
      <div style={{ display: "flex", flex: 1, height: "calc(100vh - 32px)", overflow: "hidden" }}>
        <DesktopSidebar
          currentScreen={currentScreen}
          onSelectScreen={setCurrentScreen}
          activeDevice={activeDevice}
          audioMode={audioMode}
          activeSessionCount={activeSessions.length}
        />

        {/* Content View */}
        <div style={{ flex: 1, height: "100%", overflow: "hidden", display: "flex" }}>
          {currentScreen === NavigationScreen.GAMES_HUB && (
            <AppHubScreen
              apps={apps}
              isLoading={isLoading}
              onRefresh={fetchAppsAndRecents}
              onLaunchApp={handleLaunchApp}
              onUninstallApp={handleUninstallApp}
              activePackageNames={activeSessions.map((s) => s.package_name)}
              audioMode={audioMode}
            />
          )}

          {currentScreen === NavigationScreen.RECENT_TASKS && (
            <RecentTasksScreen
              tasks={recents}
              sessions={activeSessions}
              onRefresh={fetchAppsAndRecents}
              onLaunchTask={handleLaunchTask}
              onStopSession={handleStopSession}
              onCloseTask={handleCloseTask}
              onCloseAllTasks={handleCloseAllTasks}
              isLoading={isLoading}
            />
          )}

          {currentScreen === NavigationScreen.CONNECTIVITY && (
            <ConnectionScreen
              devices={devices}
              activeDevice={activeDevice}
              onSelectDevice={setActiveDevice}
              onConnect={handleConnect}
              onPair={handlePair}
              onRefresh={fetchDevices}
              onAutoReconnect={handleAutoReconnect}
              onDiscoverMdns={handleDiscoverMdns}
              isLoading={isLoading}
            />
          )}

          {currentScreen === NavigationScreen.CONTROLS && (
            <ControlsScreen
              audioMode={audioMode}
              onSelectAudioMode={setAudioMode}
              dpi={dpi}
              onSelectDpi={handleSelectDpi}
              activeDevice={activeDevice}
            />
          )}
        </div>
      </div>
    </div>
  );
};
export default App;
