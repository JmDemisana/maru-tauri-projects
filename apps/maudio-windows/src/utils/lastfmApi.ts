import { LastfmTrack, LastfmProfile, TimePeriod } from "../types";

const LASTFM_API_KEY = "3a2d5930e1dfd49ecfa3898863db2583";
const DEFAULT_USER = "Maru-Chan";

export async function fetchLastfmProfile(username: string = DEFAULT_USER): Promise<LastfmProfile> {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(
      username,
    )}&api_key=${LASTFM_API_KEY}&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch profile");
    const data = await res.json();
    const user = data.user;
    const images = user.image || [];
    const avatar = images[images.length - 1]?.["#text"] || "";

    return {
      username: user.name,
      realName: user.realname || user.name,
      avatarUrl: avatar,
      totalScrobbles: parseInt(user.playcount || "0", 10),
      artistCount: parseInt(user.artist_count || "0", 10),
      trackCount: parseInt(user.track_count || "0", 10),
    };
  } catch (e) {
    console.error("Last.fm profile fetch error:", e);
    return {
      username,
      totalScrobbles: 0,
    };
  }
}

export async function fetchRecentTracks(username: string = DEFAULT_USER, limit: number = 20): Promise<LastfmTrack[]> {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(
      username,
    )}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch recent tracks");
    const data = await res.json();
    const tracks = data.recenttracks?.track || [];
    const list = Array.isArray(tracks) ? tracks : [tracks];

    return list.map((t: any) => {
      const images = t.image || [];
      const img = images[images.length - 1]?.["#text"] || "";
      const isNowPlaying = t["@attr"]?.nowplaying === "true";
      return {
        name: t.name || "Unknown Track",
        artist: t.artist?.["#text"] || t.artist?.name || "Unknown Artist",
        album: t.album?.["#text"] || "",
        image: img,
        nowPlaying: isNowPlaying,
        date: t.date?.["#text"] || (isNowPlaying ? "Scrobbling now" : ""),
        url: t.url,
      };
    });
  } catch (e) {
    console.error("Last.fm recent tracks fetch error:", e);
    return [];
  }
}

export async function fetchTopArtists(username: string = DEFAULT_USER, period: TimePeriod = "7D"): Promise<{ name: string; playcount: number; image: string }[]> {
  try {
    const periodMap: Record<TimePeriod, string> = {
      "7D": "7day",
      "1M": "1month",
      "3M": "3month",
      "1Y": "12month",
      "ALL": "overall",
    };
    const p = periodMap[period] || "7day";
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${encodeURIComponent(
      username,
    )}&api_key=${LASTFM_API_KEY}&format=json&period=${p}&limit=5`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch top artists");
    const data = await res.json();
    const artists = data.topartists?.artist || [];
    const list = Array.isArray(artists) ? artists : [artists];

    return list.map((a: any) => {
      const images = a.image || [];
      const img = images[images.length - 1]?.["#text"] || "";
      return {
        name: a.name,
        playcount: parseInt(a.playcount || "0", 10),
        image: img,
      };
    });
  } catch (e) {
    console.error("Last.fm top artists fetch error:", e);
    return [];
  }
}
