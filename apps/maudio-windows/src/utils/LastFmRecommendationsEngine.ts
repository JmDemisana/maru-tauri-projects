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
    const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g, "").trim();
    const cleanArtist = artist.replace(/\(.*?\)/g, "").trim();
    const q = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
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

const GUEST_FEATURED_ARTISTS = [
  "GUMI",
  "YOASOBI",
  "Eve",
  "Ado",
  "Kenshi Yonezu",
  "Pastel*Palettes",
  "Roselia",
  "Poppin'Party",
  "Shizuku Osaka",
  "TUYU",
  "DECO*27",
  "Kikuo",
  "PinocchioP",
  "ZUTOMAYO",
  "King Gnu",
  "Official HIGE DANdism",
  "Minami",
  "LiSA",
  "Aimer",
  "Mrs. GREEN APPLE",
];

export async function getRecommendations(
  username: string,
  category = "ALL",
  page = 1,
): Promise<RecommendedTrackItem[]> {
  const user = username.trim();
  const periods = ["7day", "1month", "3month", "6month", "12month", "overall"];
  const periodIndex = (page - 1) % periods.length;
  const currentPeriod = periods[periodIndex];

  try {
    const candidates: { reason: string; artist: string; title: string; art?: string }[] = [];

    if (!user) {
      // Guest recommendations: slice 4 featured artists per page
      const start = ((page - 1) * 3) % GUEST_FEATURED_ARTISTS.length;
      const sampledArtists = GUEST_FEATURED_ARTISTS.slice(start, start + 3);

      for (const artistName of sampledArtists) {
        try {
          const res = await fetch(
            `${BASE_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json&limit=6`,
          );
          const data = await res.json();
          const tracks = data.toptracks?.track || [];
          for (const t of tracks.slice(0, 3)) {
            candidates.push({
              reason: `Popular from ${artistName}`,
              artist: artistName,
              title: t.name,
              art: t.image?.find((i: any) => i.size === "extralarge")?.["#text"],
            });
          }
        } catch (e) {
          // ignore
        }
      }
    } else {
      // 1. Fetch User Top Tracks & Top Artists for current period
      const [resTracks, resArtists] = await Promise.all([
        fetch(`${BASE_URL}?method=user.gettoptracks&user=${encodeURIComponent(user)}&api_key=${LASTFM_API_KEY}&format=json&limit=50&period=${currentPeriod}`),
        fetch(`${BASE_URL}?method=user.gettopartists&user=${encodeURIComponent(user)}&api_key=${LASTFM_API_KEY}&format=json&limit=50&period=${currentPeriod}`),
      ]);

      const dataTracks = await resTracks.json();
      const dataArtists = await resArtists.json();

      const userTopTracks: any[] = dataTracks.toptracks?.track || [];
      const userTopArtists: any[] = dataArtists.topartists?.artist || [];

      // Slice candidate seed tracks and artists according to page
      const trackStart = ((page - 1) * 3) % Math.max(1, userTopTracks.length);
      const sampleTracks = userTopTracks.slice(trackStart, trackStart + 3);

      const artistStart = ((page - 1) * 2) % Math.max(1, userTopArtists.length);
      const sampleArtists = userTopArtists.slice(artistStart, artistStart + 2);

      // 2. Similar tracks
      for (const t of sampleTracks) {
        const aName = t.artist?.name || "";
        if (!aName) continue;

        try {
          const resSimilar = await fetch(
            `${BASE_URL}?method=track.getsimilar&artist=${encodeURIComponent(aName)}&track=${encodeURIComponent(t.name)}&api_key=${LASTFM_API_KEY}&format=json&limit=8`,
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
          // ignore
        }
      }

      // 3. Tracks from top artists
      for (const a of sampleArtists) {
        try {
          const resArtTracks = await fetch(
            `${BASE_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(a.name)}&api_key=${LASTFM_API_KEY}&format=json&limit=8`,
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
          // ignore
        }
      }

      // 4. Similar artists' highlights
      for (const a of sampleArtists.slice(0, 1)) {
        try {
          const resSimArt = await fetch(
            `${BASE_URL}?method=artist.getsimilar&artist=${encodeURIComponent(a.name)}&api_key=${LASTFM_API_KEY}&format=json&limit=4`,
          );
          const dataSimArt = await resSimArt.json();
          const simArtists = dataSimArt.similarartists?.artist || [];
          for (const sim of simArtists.slice(0, 2)) {
            const resSimTracks = await fetch(
              `${BASE_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(sim.name)}&api_key=${LASTFM_API_KEY}&format=json&limit=3`,
            );
            const dataSimTracks = await resSimTracks.json();
            const sTracks = dataSimTracks.toptracks?.track || [];
            if (sTracks.length > 0) {
              candidates.push({
                reason: `Because you listen to ${a.name}`,
                artist: sim.name,
                title: sTracks[0].name,
                art: sTracks[0].image?.find((i: any) => i.size === "extralarge")?.["#text"],
              });
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // Fallback if empty
      if (candidates.length === 0 && userTopTracks.length > 0) {
        for (const t of userTopTracks.slice(trackStart, trackStart + 6)) {
          candidates.push({
            reason: `From your library collection`,
            artist: t.artist?.name || "",
            title: t.name,
            art: t.image?.find((i: any) => i.size === "extralarge")?.["#text"],
          });
        }
      }
    }

    // Deduplicate candidates by "artist - title"
    const seen = new Set<string>();
    const uniqueCandidates = candidates.filter((c) => {
      const key = `${c.artist.toLowerCase()} - ${c.title.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 5. Enrich with iTunes Artwork
    const enriched = await Promise.all(
      uniqueCandidates.map(async (c) => {
        const match = await searchItunesSong(c.title, c.artist);
        return {
          title: match?.trackName || c.title,
          artist: match?.artistName || c.artist,
          album: match?.collectionName || "",
          reason: c.reason,
          artworkUrl: match?.artworkUrl || c.art || "",
          effectiveArtworkUrl: match?.artworkUrl || c.art || "",
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
