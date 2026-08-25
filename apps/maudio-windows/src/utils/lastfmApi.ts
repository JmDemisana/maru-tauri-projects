import { LastfmProfile, LastfmTrack, TimePeriod, RecommendedTrackItem } from "../types";

export const LASTFM_API_KEY = "5b573acce360566bf0ca66ab4a020e77";
export const LASTFM_SECRET = "e4c8eca5ba52e4f1fa25c5a95d48b486";
const BASE_URL = "https://ws.audioscrobbler.com/2.0/";

import md5 from "js-md5";

export function generateApiSignature(params: Record<string, string>): string {
  const keys = Object.keys(params).filter((k) => k !== "format" && k !== "api_sig").sort();
  let str = "";
  for (const k of keys) {
    str += `${k}${params[k]}`;
  }
  str += LASTFM_SECRET;
  return (typeof md5 === "function" ? (md5 as any)(str) : (md5 as any).hex(str));
}

export async function fetchLastfmProfile(username: string): Promise<LastfmProfile> {
  const user = username.trim() || "JmDemisana";
  const url = `${BASE_URL}?method=user.getinfo&user=${encodeURIComponent(user)}&api_key=${LASTFM_API_KEY}&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch profile: ${res.statusText}`);
  }
  const data = await res.json();
  if (data.error || !data.user) {
    throw new Error(data.message || "User not found on Last.fm");
  }
  const u = data.user;
  const avatar = u?.image?.find((i: any) => i.size === "large")?.["#text"] || "";
  return {
    username: u?.name || user,
    realName: u?.realname,
    avatarUrl: avatar,
    totalScrobbles: parseInt(u?.playcount || "0", 10),
    artistCount: parseInt(u?.artist_count || "0", 10),
    trackCount: parseInt(u?.track_count || "0", 10),
  };
}

export async function fetchRecentTracks(username: string, limit = 20): Promise<LastfmTrack[]> {
  const user = username.trim() || "JmDemisana";
  const url = `${BASE_URL}?method=user.getrecenttracks&user=${encodeURIComponent(user)}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch recent tracks: ${res.statusText}`);
  }
  const data = await res.json();
  const tracks = data.recenttracks?.track || [];
  return tracks.map((t: any) => {
    const isNow = t["@attr"]?.nowplaying === "true";
    const img =
      t.image?.find((i: any) => i.size === "extralarge")?.["#text"] ||
      t.image?.find((i: any) => i.size === "large")?.["#text"] ||
      "";
    return {
      name: t.name,
      artist: typeof t.artist === "string" ? t.artist : t.artist?.["#text"] || t.artist?.name || "",
      album: typeof t.album === "string" ? t.album : t.album?.["#text"] || "",
      image: img,
      nowPlaying: isNow,
      date: isNow ? "Now Playing" : t.date?.["#text"] || "Recent",
      url: t.url,
    };
  });
}

export async function fetchTopArtists(username: string, period: TimePeriod): Promise<{ name: string; playcount: number; image: string }[]> {
  const user = username.trim() || "JmDemisana";
  const periodMap: Record<TimePeriod, string> = {
    "7D": "7day",
    "1M": "1month",
    "3M": "3month",
    "1Y": "12month",
    ALL: "overall",
  };
  const url = `${BASE_URL}?method=user.gettopartists&user=${encodeURIComponent(user)}&api_key=${LASTFM_API_KEY}&format=json&limit=10&period=${periodMap[period]}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const artists = data.topartists?.artist || [];
  return artists.map((a: any) => ({
    name: a.name,
    playcount: parseInt(a.playcount || "0", 10),
    image: a.image?.find((i: any) => i.size === "large")?.["#text"] || "",
  }));
}

export async function scrobbleTrack(artist: string, track: string, album: string | null, sessionKey: string): Promise<boolean> {
  if (!artist || !track || !sessionKey) return false;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params: Record<string, string> = {
    api_key: LASTFM_API_KEY,
    method: "track.scrobble",
    artist: artist.trim(),
    track: track.trim(),
    timestamp,
    sk: sessionKey.trim(),
  };
  if (album) {
    params.album = album.trim();
  }
  const api_sig = generateApiSignature(params);
  params.api_sig = api_sig;
  params.format = "json";

  const form = new URLSearchParams();
  for (const k of Object.keys(params)) {
    form.append(k, params[k]);
  }

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    return res.ok;
  } catch (e) {
    console.error("Scrobble failed:", e);
    return false;
  }
}

export async function updateNowPlaying(artist: string, track: string, album: string | null, sessionKey: string): Promise<boolean> {
  if (!artist || !track || !sessionKey) return false;
  const params: Record<string, string> = {
    api_key: LASTFM_API_KEY,
    method: "track.updateNowPlaying",
    artist: artist.trim(),
    track: track.trim(),
    sk: sessionKey.trim(),
  };
  if (album) {
    params.album = album.trim();
  }
  const api_sig = generateApiSignature(params);
  params.api_sig = api_sig;
  params.format = "json";

  const form = new URLSearchParams();
  for (const k of Object.keys(params)) {
    form.append(k, params[k]);
  }

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    return res.ok;
  } catch (e) {
    console.error("NowPlaying update failed:", e);
    return false;
  }
}

export async function fetchSessionFromToken(token: string): Promise<{ key: string; name: string }> {
  const params: Record<string, string> = {
    api_key: LASTFM_API_KEY,
    method: "auth.getSession",
    token: token.trim(),
  };
  const api_sig = generateApiSignature(params);
  const url = `${BASE_URL}?method=auth.getSession&api_key=${LASTFM_API_KEY}&token=${encodeURIComponent(token.trim())}&api_sig=${api_sig}&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.session) {
    throw new Error(data.message || "Failed to retrieve session from Last.fm");
  }
  return {
    key: data.session.key,
    name: data.session.name,
  };
}

export async function fetchProfileFromSession(sessionKey: string): Promise<LastfmProfile> {
  const cleanKey = sessionKey.trim();
  if (!cleanKey) {
    throw new Error("Missing Last.fm session key");
  }

  const params: Record<string, string> = {
    api_key: LASTFM_API_KEY,
    method: "user.getInfo",
    sk: cleanKey,
  };
  const api_sig = generateApiSignature(params);
  const url = `${BASE_URL}?method=user.getInfo&api_key=${LASTFM_API_KEY}&sk=${encodeURIComponent(cleanKey)}&api_sig=${api_sig}&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error || !data.user) {
    throw new Error(data.message || "Failed to retrieve Last.fm profile from session");
  }

  const u = data.user;
  const avatar = u?.image?.find((i: any) => i.size === "large")?.["#text"] || "";
  return {
    username: u?.name || "",
    realName: u?.realname,
    avatarUrl: avatar,
    totalScrobbles: parseInt(u?.playcount || "0", 10),
    artistCount: parseInt(u?.artist_count || "0", 10),
    trackCount: parseInt(u?.track_count || "0", 10),
  };
}

export function isAppAllowedForScrobbling(appName: string | null | undefined, selectedApps: string[]): boolean {
  if (!appName) return true;
  const cleanName = appName.toLowerCase().trim();
  return selectedApps.some((app) => {
    const a = app.toLowerCase().trim();
    return cleanName.includes(a) || a.includes(cleanName);
  });
}
