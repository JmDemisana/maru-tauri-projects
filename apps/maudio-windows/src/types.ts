export enum NavigationGroup {
  RECOMMENDATION_ENGINE = "RECOMMENDATION ENGINE",
  CORE_FUNCTIONALITY = "CORE FUNCTIONALITY",
}

export enum NavigationScreen {
  DISCOVERY = "DISCOVERY",
  SEARCH = "SEARCH",
  PROFILE = "PROFILE",
  NAMIREC = "NAMIREC",
  KARAOKE = "KARAOKE",
  ARTIST_DETAIL = "ARTIST_DETAIL",
  MARUCAST = "MARUCAST",
  SCROBBLING = "SCROBBLING",
  LOCAL = "LOCAL",
  COMMON = "COMMON",
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

export interface RecommendedTrackItem {
  title: string;
  artist: string;
  album?: string;
  reason?: string;
  artworkUrl?: string;
  effectiveArtworkUrl?: string;
  appleMusicUrl?: string;
}

export interface SongDetailState {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string | null;
  appleMusicUrl?: string | null;
  genre?: string | null;
  releaseDate?: string | null;
}
