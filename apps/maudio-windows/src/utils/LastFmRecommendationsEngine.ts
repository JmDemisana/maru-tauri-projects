import { RecommendedTrackItem } from "../types";
import { LASTFM_API_KEY } from "./lastfmApi";

const BASE_URL = "https://ws.audioscrobbler.com/2.0/";

interface ItunesSongMatch {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl: string | null;
  appleMusicUrl: string | null;
  previewUrl: string | null;
}

const itunesCache = new Map<string, ItunesSongMatch | null>();

export async function searchItunesSong(title: string, artist = ""): Promise<ItunesSongMatch | null> {
  const key = `${artist.trim().toLowerCase()}::${title.trim().toLowerCase()}`;
  if (itunesCache.has(key)) {
    return itunesCache.get(key) || null;
  }

  try {
    const q = artist ? `${artist} ${title}` : title;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=1`;
    const res = await fetch(url);
    if (!res.ok) {
      itunesCache.set(key, null);
      return null;
    }
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const r = data.results[0];
      const match: ItunesSongMatch = {
        trackId: r.trackId,
        trackName: r.trackName,
        artistName: r.artistName,
        collectionName: r.collectionName,
        artworkUrl: r.artworkUrl100 ? r.artworkUrl100.replace("100x100bb", "600x600bb") : null,
        appleMusicUrl: r.trackViewUrl,
        previewUrl: r.previewUrl,
      };
      itunesCache.set(key, match);
      return match;
    }
  } catch (e) {
    console.error("iTunes search error:", e);
  }
  itunesCache.set(key, null);
  return null;
}

export async function getRecommendations(
  username: string,
  category = "ALL",
  page = 1,
): Promise<RecommendedTrackItem[]> {
  const user = username.trim() || "JmDemisana";
  const periods = ["7day", "1month", "3month", "6month", "12month", "overall"];
  const randomPeriod = periods[Math.floor(Math.random() * periods.length)];

  try {
    // 1. Fetch User Top Tracks & Top Artists
    const [resTracks, resArtists] = await Promise.all([
      fetch(`${BASE_URL}?method=user.gettoptracks&user=${encodeURIComponent(user)}&api_key=${LASTFM_API_KEY}&format=json&limit=30&period=${randomPeriod}`),
      fetch(`${BASE_URL}?method=user.gettopartists&user=${encodeURIComponent(user)}&api_key=${LASTFM_API_KEY}&format=json&limit=30&period=${randomPeriod}`),
    ]);

    const dataTracks = await resTracks.json();
    const dataArtists = await resArtists.json();

    const userTopTracks = dataTracks.toptracks?.track || [];
    const userTopArtists = dataArtists.topartists?.artist || [];

    const candidates: { reason: string; artist: string; title: string; art?: string }[] = [];

    // 2. Sample 4 top tracks and find similar tracks
    const sampleTracks = userTopTracks.slice(0, 4);
    for (const t of sampleTracks) {
      const aName = t.artist?.name || "";
      if (!aName) continue;

      try {
        const resSimilar = await fetch(
          `${BASE_URL}?method=track.getsimilar&artist=${encodeURIComponent(aName)}&track=${encodeURIComponent(t.name)}&api_key=${LASTFM_API_KEY}&format=json&limit=6`,
        );
        const dataSimilar = await resSimilar.json();
        const simList = dataSimilar.similartracks?.track || [];
        for (const s of simList.slice(0, 2)) {
          const sArtist = s.artist?.name;
          if (sArtist && s.name.toLowerCase() !== t.name.toLowerCase()) {
            candidates.push({
              reason: `Similar to "${t.name}"`,
              artist: sArtist,
              title: s.name,
              art: s.image?.find((i: any) => i.size === "extralarge")?.["#text"],
            });
          }
        }
      } catch (e) {
        // continue
      }
    }

    // 3. Sample 3 top artists and fetch other notable tracks
    const sampleArtists = userTopArtists.slice(0, 3);
    for (const a of sampleArtists) {
      try {
        const resArtTracks = await fetch(
          `${BASE_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(a.name)}&api_key=${LASTFM_API_KEY}&format=json&limit=6`,
        );
        const dataArtTracks = await resArtTracks.json();
        const aTracks = dataArtTracks.toptracks?.track || [];
        for (const at of aTracks.slice(0, 2)) {
          candidates.push({
            reason: `From your top artist ${a.name}`,
            artist: a.name,
            title: at.name,
            art: at.image?.find((i: any) => i.size === "extralarge")?.["#text"],
          });
        }
      } catch (e) {
        // continue
      }
    }

    // If still empty (e.g. fresh account), fallback to general top tracks
    if (candidates.length === 0 && userTopTracks.length > 0) {
      for (const t of userTopTracks.slice(0, 10)) {
        candidates.push({
          reason: `Featured from your recent library`,
          artist: t.artist?.name || "",
          title: t.name,
          art: t.image?.find((i: any) => i.size === "extralarge")?.["#text"],
        });
      }
    }

    // 4. Enrich with iTunes Artwork
    const enriched = await Promise.all(
      candidates.map(async (c) => {
        const match = await searchItunesSong(c.title, c.artist);
        return {
          title: c.title,
          artist: c.artist,
          reason: c.reason,
          artworkUrl: match?.artworkUrl || c.art,
          effectiveArtworkUrl: match?.artworkUrl || c.art,
          appleMusicUrl: match?.appleMusicUrl || undefined,
        };
      }),
    );

    return enriched;
  } catch (e) {
    console.error("Failed to generate recommendations:", e);
    return [];
  }
}
