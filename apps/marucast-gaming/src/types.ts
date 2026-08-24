export enum NavigationScreen {
  GAMES_HUB = "GAMES_HUB",
  RECENT_TASKS = "RECENT_TASKS",
  CONNECTIVITY = "CONNECTIVITY",
  CONTROLS = "CONTROLS",
  SETTINGS = "SETTINGS",
}

export enum NavigationGroup {
  GAMING_HUB = "GAMING & APPS",
  DEVICE_LINK = "DEVICE LINK",
  PREFERENCES = "PREFERENCES",
}

export type AudioRoutingMode = "phone" | "pc" | "both";

export interface AdbDevice {
  serial: string;
  model: string;
  is_wireless: boolean;
  state: string;
  android_version: string;
  sdk_version: number;
  supports_multi_audio: boolean;
}

export interface AndroidApp {
  package_name: string;
  activity_name: string;
  label: string;
  is_game: boolean;
  category: string;
}

export interface RecentTask {
  package_name: string;
  label: string;
  task_id: string;
}

export interface AppSession {
  session_id: string;
  package_name: string;
  app_name: string;
  device_serial: string;
  audio_mode: AudioRoutingMode;
  is_running: boolean;
}
