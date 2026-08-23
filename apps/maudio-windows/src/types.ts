export enum NavigationScreen {
  DISCOVERY = "DISCOVERY",
  SCROBBLING = "SCROBBLING",
  MARUCAST = "MARUCAST",
  SETTINGS = "SETTINGS",
}

export type TimePeriod = "7D" | "1M" | "3M" | "1Y" | "ALL";

export interface LastfmTrack {
  name: string;
  artist: string;
  album: string;
  image: string;
  nowPlaying?: boolean;
  date?: string;
  url?: string;
}

export interface LastfmProfile {
  username: string;
  realName?: string;
  avatarUrl?: string;
  totalScrobbles: number;
  artistCount?: number;
  trackCount?: number;
}

export interface MediaState {
  title: string | null;
  artist: string | null;
  album: string | null;
  app_name: string | null;
  is_playing: boolean;
  position_ms: number | null;
  duration_ms: number | null;
  artwork_base64: string | null;
}

export interface LyricLine {
  timeMs: number;
  text: string;
}
