export interface AppItem {
  id: string;
  name: string;
  path: string;
  category: string;
  icon?: string;
}

export type SearchResultItem =
  | {
      kind: "app";
      item: AppItem;
      score: number;
    }
  | {
      kind: "math";
      expression: string;
      result: string;
    }
  | {
      kind: "action";
      id: string;
      title: string;
      subtitle: string;
      icon_name: string;
    }
  | {
      kind: "terminal";
      command: string;
    };

export type TileSize = "small" | "medium" | "wide" | "large";

export type StartView =
  | "tiles"
  | "all-apps"
  | "customizations"
  | "store"
  | "web-apps";

export interface CustomTile {
  id: string;
  title: string;
  appPath?: string;
  webUrl?: string;
  launchMode?: "app" | "web" | "dedicated";
  size: TileSize;
  color?: string;
  iconName?: string;
  group: string;
  isLive?: boolean;
  liveType?:
    | "weather"
    | "system"
    | "music"
    | "nami"
    | "clock"
    | "calendar"
    | "storage"
    | "anilist"
    | "vocaloid"
    | "email";
  isFolder?: boolean;
  subTiles?: CustomTile[];
  isExpanded?: boolean;
  customImage?: string;
}

export interface MaruStartConfig {
  accentColor: string;
  acrylicOpacity: number;
  bgDarkness: number;
  bgBlur: number;
  enableLiveTiles: boolean;
  potatoPcMode: boolean;
  defaultView: "tiles" | "all-apps" | "web-apps";
  powerMenuStyle?: "flyout" | "fullscreen";
  tileLaunchOverrides?: Record<
    string,
    { launchMode: "app" | "web" | "dedicated"; customTarget?: string }
  >;
}

export const DEFAULT_CONFIG: MaruStartConfig = {
  accentColor: "#0078d7",
  acrylicOpacity: 85,
  bgDarkness: 65,
  bgBlur: 54,
  enableLiveTiles: true,
  potatoPcMode: false,
  defaultView: "tiles",
  powerMenuStyle: "fullscreen",
  tileLaunchOverrides: {
    anilist_live: { launchMode: "dedicated" },
    live_anilist: { launchMode: "dedicated" },
    weather: { launchMode: "app" },
    live_weather: { launchMode: "app" },
    outlook_live: { launchMode: "app" },
    live_nami: { launchMode: "web", customTarget: "https://m.me/nanami.llm" },
  },
};
