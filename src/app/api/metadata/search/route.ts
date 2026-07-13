import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto/encryption";

function httpsGet(url: string, timeoutMs = 25000): Promise<string> {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "GET",
      family: 4,
      headers: {
        "User-Agent": "RetroMan/1.0",
        "Accept": "application/json",
        "Accept-Encoding": "identity",
        "Connection": "close",
      },
    }, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      res.on("end", () => resolve(body));
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error(`OpenLibrary timeout after ${timeoutMs}ms`)); });
    req.on("error", reject);
    req.end();
  });
}

export type MetadataResult = {
  title: string;
  year: number | null;
  description: string | null;
  imageUrl: string | null;
  externalId: string;
  externalSource: string;
  metadata: Record<string, unknown> | null;
};

type TrackEntry = { pos: string; title: string; dur: string };

async function fetchDiscogsTracklist(releaseId: number, apiKey: string): Promise<TrackEntry[] | null> {
  try {
    const res = await fetch(`https://api.discogs.com/releases/${releaseId}`, {
      headers: { Authorization: `Discogs token=${apiKey}`, "User-Agent": "RetroMan/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const tracks = (data.tracklist ?? []) as Array<{ position: string; title: string; duration: string; type_?: string }>;
    const filtered = tracks
      .filter((t) => t.type_ !== "heading" && t.title?.trim())
      .map((t) => ({ pos: t.position ?? "", title: t.title, dur: t.duration ?? "" }));
    return filtered.length > 0 ? filtered : null;
  } catch {
    return null;
  }
}

type DiscogsRaw = {
  id: number; title: string; cover_image?: string; thumb?: string; year?: string;
  label?: string[]; format?: string[]; genre?: string[]; barcode?: string[];
};

async function fetchDiscogsPage(params: URLSearchParams, apiKey: string): Promise<DiscogsRaw[]> {
  const res = await fetch(`https://api.discogs.com/database/search?${params}`, {
    headers: { Authorization: `Discogs token=${apiKey}`, "User-Agent": "RetroMan/1.0" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[Discogs] ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
    throw new Error(`Discogs ${res.status}: ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  return (data.results ?? []) as DiscogsRaw[];
}

function mapDiscogsRaw(r: DiscogsRaw): MetadataResult {
  const sepIdx = r.title.indexOf(" - ");
  const artist = sepIdx > -1 ? r.title.slice(0, sepIdx) : null;
  const releaseTitle = sepIdx > -1 ? r.title.slice(sepIdx + 3) : r.title;
  const meta: Record<string, unknown> = {};
  if (artist) meta.artist = artist;
  if (releaseTitle !== r.title) meta.releaseTitle = releaseTitle;
  if (r.label?.[0]) meta.label = r.label[0];
  if (r.format?.length) meta.format = r.format.filter((f) => !["Album", "Single", "EP", "Compilation"].includes(f)).join(", ") || r.format[0];
  if (r.genre?.[0]) meta.genre = r.genre[0];
  if (r.barcode?.[0]) meta.barcode = r.barcode[0];
  return {
    title: r.title,
    year: r.year ? parseInt(r.year) : null,
    description: null,
    imageUrl: r.cover_image?.startsWith("http") ? r.cover_image : (r.thumb?.startsWith("http") ? r.thumb : null),
    externalId: String(r.id),
    externalSource: "Discogs",
    metadata: Object.keys(meta).length ? meta : null,
  };
}

// Build multiple candidate search param sets without requiring a separator.
// Tries splitting the query at artist-name lengths of 1, 2, and 3 words so that
// "Depeche Mode M" → artist="Depeche Mode" title="M" is found automatically.
function buildDiscogsParamSets(query: string): URLSearchParams[] {
  const separatorMatch = query.match(/^(.+?)\s*(?::\s*|-\s+)(.+)$/);
  if (separatorMatch) {
    return [new URLSearchParams({ artist: separatorMatch[1].trim(), title: separatorMatch[2].trim(), type: "release", per_page: "8" })];
  }

  const words = query.trim().split(/\s+/);
  if (words.length <= 1) {
    return [new URLSearchParams({ q: query, type: "release", per_page: "8" })];
  }

  const sets: URLSearchParams[] = [];
  // Artist name lengths 1..3, title = remaining words
  const maxArtist = Math.min(3, words.length - 1);
  for (let i = 1; i <= maxArtist; i++) {
    sets.push(new URLSearchParams({
      artist: words.slice(0, i).join(" "),
      title: words.slice(i).join(" "),
      type: "release",
      per_page: "8",
    }));
  }
  // For short queries also include a broad fallback (catches pure artist searches like "Pink Floyd")
  if (words.length <= 3) {
    sets.push(new URLSearchParams({ q: query, type: "release", per_page: "8" }));
  }
  return sets;
}

const DISCOGS_STOPWORDS = new Set(["the", "a", "an", "of", "in", "on", "at", "to", "and", "or", "with", "by", "for", "from", "das", "die", "der", "ein", "eine"]);

function scoreDiscogsResult(raw: DiscogsRaw, queryWords: string[]): number {
  if (queryWords.length === 0) return 0;
  const resultTokens = new Set(raw.title.toLowerCase().split(/\W+/).filter(Boolean));
  return queryWords.filter((w) => resultTokens.has(w)).length;
}

function mergeDiscogsRoundRobin(sets: DiscogsRaw[][], limit: number): DiscogsRaw[] {
  const seen = new Set<number>();
  const merged: DiscogsRaw[] = [];
  const maxLen = sets.reduce((m, s) => Math.max(m, s.length), 0);
  for (let i = 0; i < maxLen && merged.length < limit; i++) {
    for (const set of sets) {
      if (merged.length >= limit) break;
      if (i < set.length && !seen.has(set[i].id)) {
        seen.add(set[i].id);
        merged.push(set[i]);
      }
    }
  }
  return merged;
}

async function searchDiscogs(query: string, apiKey: string): Promise<MetadataResult[]> {
  const paramSets = buildDiscogsParamSets(query);
  const rawSets = await Promise.allSettled(paramSets.map((p) => fetchDiscogsPage(p, apiKey)));

  const successSets: DiscogsRaw[][] = rawSets.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    console.error(`[Discogs] search variant ${i} failed:`, r.reason);
    return [];
  });

  if (rawSets.every((r) => r.status === "rejected")) {
    throw (rawSets[0] as PromiseRejectedResult).reason;
  }

  // Merge with round-robin (preserves search-variant priority), then re-rank by relevance
  const merged = mergeDiscogsRoundRobin(successSets, 24);
  const queryWords = query.toLowerCase().split(/\W+/).filter((w) => w.length > 0 && !DISCOGS_STOPWORDS.has(w));
  const ranked = merged
    .map((r) => ({ r, score: scoreDiscogsResult(r, queryWords) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.r);

  const results = ranked.map(mapDiscogsRaw);

  // Fetch tracklists for the final merged set only
  const tracklists = await Promise.allSettled(
    results.map((r) => fetchDiscogsTracklist(parseInt(r.externalId), apiKey))
  );

  return results.map((r, i) => {
    const tl = tracklists[i].status === "fulfilled" ? tracklists[i].value : null;
    if (!tl || tl.length === 0) return r;
    return { ...r, metadata: { ...(r.metadata ?? {}), tracklist: tl } };
  });
}

function esrbToUsk(esrb: string): string | null {
  const s = esrb.toLowerCase();
  if (s.includes("early childhood"))                         return "USK 0";
  if (s.includes("e10+") || s.includes("everyone 10+"))     return "USK 6";
  if (s.includes("everyone"))                                return "USK 0";
  if (s.includes("teen"))                                    return "USK 12";
  if (s.includes("adults only"))                             return "USK 18";
  if (s.includes("mature"))                                  return "USK 18";
  return null;
}

async function searchTheGamesDb(query: string, apiKey: string): Promise<MetadataResult[]> {
  const params = new URLSearchParams({
    apikey: apiKey,
    name: query,
    fields: "overview,platform,players,rating,publishers,genres,developers",
    include: "boxart,platform,publishers,genres,developers",
  });
  const res = await fetch(`https://api.thegamesdb.net/v1/Games/ByGameName?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TheGamesDB ${res.status}: ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  if (data.code !== 200) throw new Error(`TheGamesDB code ${data.code}: ${data.status ?? ""}`);

  type TgdbGame = {
    id: number; game_title: string; release_date?: string; overview?: string;
    platform?: number; players?: string; rating?: string;
    publishers?: number[]; genres?: number[]; developers?: number[];
  };
  const games = (data.data?.games ?? []) as TgdbGame[];
  const boxartBase: string = data.include?.boxart?.base_url?.large ?? "";
  const boxartData: Record<string, Array<{ type: string; side?: string; filename: string }>> = data.include?.boxart?.data ?? {};
  // TheGamesDB returns platform either as { data: {...} } or directly as { id: {...} }
  const _platRaw = data.include?.platform;
  const platformData: Record<string, { name: string }> = _platRaw?.data ?? _platRaw ?? {};

  // TheGamesDB only returns boxart+platform via `include`; publishers/developers/genres
  // require separate lookup calls with the IDs from the game objects.
  const publisherIds = [...new Set(games.flatMap((g) => g.publishers ?? []))];
  const developerIds = [...new Set(games.flatMap((g) => g.developers ?? []))];
  const genreIds     = [...new Set(games.flatMap((g) => g.genres ?? []))];

  async function tgdbIds(endpoint: string, ids: number[]): Promise<Record<string, string>> {
    if (!ids.length) return {};
    try {
      const p = new URLSearchParams({ apikey: apiKey, id: ids.join(",") });
      const r = await fetch(`https://api.thegamesdb.net/v1/${endpoint}?${p}`, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return {};
      const d = await r.json();
      const map: Record<string, { name: string }> = d.data?.[endpoint.toLowerCase()] ?? {};
      return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.name]));
    } catch { return {}; }
  }

  async function wikiDeDesc(title: string): Promise<string | null> {
    try {
      const res = await fetch(
        `https://de.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { "User-Agent": "RetroMan/1.0" }, signal: AbortSignal.timeout(4000) },
      );
      if (!res.ok) return null;
      const d = await res.json();
      if (d.type === "disambiguation") return null;
      const text = d.extract as string | undefined;
      return text && text.length > 40 ? text : null;
    } catch { return null; }
  }

  const gameSlice = games.slice(0, 8);
  const [[publisherMap, developerMap, genreMap], wikiResults] = await Promise.all([
    Promise.all([tgdbIds("Publishers", publisherIds), tgdbIds("Developers", developerIds), tgdbIds("Genres", genreIds)]),
    Promise.allSettled(gameSlice.map((g) => wikiDeDesc(g.game_title))),
  ]);

  return gameSlice.map((g, i) => {
    const arts = boxartData[String(g.id)] ?? [];
    const front = arts.find((b) => b.type === "boxart" && b.side === "front") ?? arts[0];
    const back  = arts.find((b) => b.type === "boxart" && b.side === "back");

    const platformName  = g.platform ? (platformData[String(g.platform)]?.name ?? null) : null;
    const publisherName = (g.publishers ?? []).map((id) => publisherMap[String(id)]).filter(Boolean).slice(0, 2).join(", ") || null;
    const developerName = (g.developers ?? []).map((id) => developerMap[String(id)]).filter(Boolean).slice(0, 2).join(", ") || null;
    const genreNames    = (g.genres    ?? []).map((id) => genreMap[String(id)]).filter(Boolean).slice(0, 3).join(", ") || null;
    const wikiDesc      = wikiResults[i].status === "fulfilled" ? wikiResults[i].value : null;

    const meta: Record<string, unknown> = {};
    if (platformName)  meta.platform  = platformName;
    if (publisherName) meta.publisher = publisherName;
    if (developerName) meta.developer = developerName;
    if (genreNames)    meta.genre     = genreNames;
    const usk = g.rating ? esrbToUsk(g.rating) : null;
    if (usk)           meta.rating    = usk;
    // German Wikipedia preferred; English TheGamesDB overview as fallback
    meta.overview = wikiDesc ?? g.overview ?? null;
    if (!meta.overview) delete meta.overview;
    if (back && boxartBase) meta.backCover = `${boxartBase}${back.filename}`;

    return {
      title: g.game_title,
      year: g.release_date ? new Date(g.release_date).getFullYear() : null,
      description: (wikiDesc ?? g.overview) || null,
      imageUrl: front && boxartBase ? `${boxartBase}${front.filename}` : null,
      externalId: String(g.id),
      externalSource: "TheGamesDB",
      metadata: Object.keys(meta).length ? meta : null,
    };
  });
}

const TMDB_GENRES: Record<number, string> = {
  28: "Action", 12: "Abenteuer", 16: "Animation", 35: "Komödie", 80: "Krimi",
  99: "Dokumentarfilm", 18: "Drama", 10751: "Familie", 14: "Fantasy", 36: "Geschichte",
  27: "Horror", 10402: "Musik", 9648: "Mystery", 10749: "Romantik", 878: "Science Fiction",
  10770: "TV-Film", 53: "Thriller", 10752: "Kriegsfilm", 37: "Western",
};

type TmdbDetailResponse = {
  title: string;
  runtime: number | null;
  imdb_id: string | null;
  production_companies: Array<{ name: string }>;
  credits: {
    crew: Array<{ job: string; name: string }>;
    cast: Array<{ name: string }>;
  };
  release_dates: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{ certification: string; type: number }>;
    }>;
  };
};

async function fetchTmdbMovieEnrichment(
  movieId: number,
  tmdbKey: string,
  omdbKey?: string,
): Promise<Record<string, string>> {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?language=de-DE&append_to_response=credits,release_dates`,
      { headers: { Authorization: `Bearer ${tmdbKey}` }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return {};
    const d = (await res.json()) as TmdbDetailResponse;
    const result: Record<string, string> = {};

    const directors = d.credits?.crew?.filter((c) => c.job === "Director").map((c) => c.name);
    if (directors?.length) result.director = directors.join(", ");

    const cast = d.credits?.cast?.slice(0, 5).map((c) => c.name);
    if (cast?.length) result.cast = cast.join(", ");

    if (d.runtime && d.runtime > 0) result.runtime = `${d.runtime} min`;

    const deRelease = d.release_dates?.results?.find((r) => r.iso_3166_1 === "DE");
    const cert = deRelease?.release_dates?.find((r) => r.certification)?.certification;
    if (cert) result.fsk = cert;

    if (d.production_companies?.[0]?.name) result.studio = d.production_companies[0].name;

    if (omdbKey && d.imdb_id) {
      try {
        const omdb = await fetch(`https://www.omdbapi.com/?i=${d.imdb_id}&apikey=${omdbKey}`, {
          signal: AbortSignal.timeout(4000),
        });
        if (omdb.ok) {
          const od = await omdb.json();
          if (od.imdbRating && od.imdbRating !== "N/A") result.imdbRating = od.imdbRating;
        }
      } catch { /* skip OMDb on error */ }
    }

    return result;
  } catch (e) {
    console.error(`[TMDB detail] failed for movieId=${movieId}:`, e);
    return {};
  }
}

async function searchTmdb(query: string, year: string | undefined, apiKey: string, omdbKey?: string): Promise<MetadataResult[]> {
  const q = new URLSearchParams({ query, language: "de-DE" });
  if (year) q.set("year", year);
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${q}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDB ${res.status}: ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  const results: MetadataResult[] = (data.results ?? []).slice(0, 8).map((r: {
    id: number; title: string; original_title?: string; overview?: string;
    poster_path?: string | null; release_date?: string; genre_ids?: number[];
  }) => {
    const meta: Record<string, unknown> = {};
    if (r.original_title) meta.originalTitle = r.original_title;
    if (r.title && r.title !== r.original_title) meta.localizedTitle = r.title;
    if (r.genre_ids?.length) {
      const names = r.genre_ids.map((id) => TMDB_GENRES[id]).filter(Boolean);
      if (names.length) meta.genres = names.join(", ");
    }
    if (r.overview) meta.overview = r.overview;
    return {
      title: r.title,
      year: r.release_date ? parseInt(r.release_date.slice(0, 4)) : null,
      description: r.overview || null,
      imageUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      externalId: String(r.id),
      externalSource: "TMDB",
      metadata: Object.keys(meta).length ? meta : null,
    };
  });

  // Fetch full credits, runtime, FSK, studio and IMDB rating in parallel
  const enrichments = await Promise.allSettled(
    results.map((r) => fetchTmdbMovieEnrichment(parseInt(r.externalId), apiKey, omdbKey)),
  );

  return results.map((r, i) => {
    const extra = enrichments[i].status === "fulfilled" ? enrichments[i].value : {};
    if (!extra || Object.keys(extra).length === 0) return r;
    return { ...r, metadata: { ...(r.metadata ?? {}), ...extra } };
  });
}

const OL_LANG: Record<string, string> = {
  eng: "Englisch", ger: "Deutsch", deu: "Deutsch",
  fre: "Französisch", fra: "Französisch", jpn: "Japanisch",
  spa: "Spanisch", ita: "Italienisch", por: "Portugiesisch",
  nld: "Niederländisch", swe: "Schwedisch", nor: "Norwegisch",
  dan: "Dänisch", fin: "Finnisch", rus: "Russisch",
  zho: "Chinesisch", kor: "Koreanisch", ara: "Arabisch",
  pol: "Polnisch", ces: "Tschechisch", tur: "Türkisch",
};

async function fetchOpenLibraryDescription(workId: string): Promise<string | null> {
  try {
    const body = await httpsGet(`https://openlibrary.org/works/${workId}.json`, 5000);
    const data = JSON.parse(body);
    const desc = data.description;
    if (!desc) return null;
    if (typeof desc === "string") return desc;
    if (typeof desc === "object" && desc.value) return String(desc.value);
    return null;
  } catch {
    return null;
  }
}

async function searchOpenLibrary(query: string): Promise<MetadataResult[]> {
  const fields = "key,title,author_name,first_publish_year,cover_i,publisher,number_of_pages_median,isbn,subject,language";
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=${fields}`;
  const rawBody = await httpsGet(url);
  const data = JSON.parse(rawBody);

  const results: MetadataResult[] = (data.docs ?? []).slice(0, 8).map((r: {
    key: string; title: string; author_name?: string[];
    first_publish_year?: number; cover_i?: number;
    publisher?: string[]; number_of_pages_median?: number;
    isbn?: string[]; subject?: string[]; language?: string[];
  }) => {
    const meta: Record<string, unknown> = {};
    if (r.author_name?.[0]) meta.author = r.author_name.slice(0, 2).join(", ");
    if (r.publisher?.[0]) meta.publisher = r.publisher[0];
    if (r.number_of_pages_median) meta.pages = r.number_of_pages_median;
    if (r.isbn?.length) {
      const isbn13 = r.isbn.find((i) => /^97[89]\d{10}$/.test(i));
      meta.isbn = isbn13 ?? r.isbn[0];
    }
    if (r.subject?.length) meta.genre = r.subject.slice(0, 3).join(", ");
    if (r.language?.length) {
      const names = [...new Set(r.language.slice(0, 3).map((l) => OL_LANG[l] ?? l))];
      meta.language = names.slice(0, 2).join(", ");
    }
    const workId = r.key?.replace("/works/", "") ?? "";
    return {
      title: r.title,
      year: r.first_publish_year ?? null,
      description: null,
      imageUrl: r.cover_i ? `https://covers.openlibrary.org/b/id/${r.cover_i}-L.jpg` : null,
      externalId: workId,
      externalSource: "OpenLibrary",
      metadata: Object.keys(meta).length ? meta : null,
    };
  });

  // Fetch descriptions in parallel via /works/{id}.json
  const descriptions = await Promise.allSettled(
    results.map((r) => fetchOpenLibraryDescription(r.externalId)),
  );

  return results.map((r, i) => {
    const desc = descriptions[i].status === "fulfilled" ? descriptions[i].value : null;
    if (!desc) return r;
    return { ...r, metadata: { ...(r.metadata ?? {}), description: desc } };
  });
}

async function searchComicVine(query: string, apiKey: string): Promise<MetadataResult[]> {
  const q = new URLSearchParams({
    api_key: apiKey,
    format: "json",
    query,
    resources: "issue",
    field_list: "id,name,issue_number,description,image,volume,person_credits,store_date",
    limit: "8",
  });
  const data = await httpsGet(`https://comicvine.gamespot.com/api/search/?${q}`, 8000).then(JSON.parse);
  if (!data.results) return [];

  return (data.results as Array<{
    id: number;
    name: string | null;
    issue_number?: string;
    description?: string | null;
    image?: { medium_url?: string; original_url?: string };
    volume?: { name?: string; api_detail_url?: string };
    person_credits?: Array<{ name: string; role: string }>;
    store_date?: string | null;
  }>).map((r) => {
    const meta: Record<string, unknown> = {};
    if (r.volume?.name) meta.series = r.volume.name;
    if (r.issue_number) meta.issueNumber = `#${r.issue_number}`;
    const writers = (r.person_credits ?? []).filter((p) => p.role.toLowerCase().includes("writer")).map((p) => p.name);
    const artists = (r.person_credits ?? []).filter((p) => p.role.toLowerCase().includes("artist") || p.role.toLowerCase().includes("pencil")).map((p) => p.name);
    if (writers.length) meta.writer = writers.slice(0, 2).join(", ");
    if (artists.length) meta.artist = artists.slice(0, 2).join(", ");
    const year = r.store_date ? parseInt(r.store_date.slice(0, 4)) : null;

    const rawDesc = r.description ?? null;
    const cleanDesc = rawDesc ? rawDesc.replace(/<[^>]*>/g, "").slice(0, 400) : null;

    const title = r.name ?? (r.volume?.name ? `${r.volume.name} #${r.issue_number ?? "?"}` : "Unbekannt");

    return {
      title,
      year,
      description: cleanDesc,
      imageUrl: r.image?.medium_url ?? r.image?.original_url ?? null,
      externalId: String(r.id),
      externalSource: "ComicVine",
      metadata: Object.keys(meta).length ? meta : null,
    };
  });
}

async function searchGoogleBooks(query: string, apiKey: string): Promise<MetadataResult[]> {
  const q = new URLSearchParams({ q: query, key: apiKey, maxResults: "8", printType: "books" });
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${q}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GoogleBooks ${res.status}: ${body.slice(0, 120)}`);
  }
  const data = await res.json();

  return ((data.items ?? []) as Array<{
    id: string;
    volumeInfo: {
      title: string; subtitle?: string; authors?: string[]; publisher?: string;
      publishedDate?: string; description?: string;
      industryIdentifiers?: Array<{ type: string; identifier: string }>;
      pageCount?: number; categories?: string[];
      imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    };
  }>).map((item) => {
    const v = item.volumeInfo;
    const meta: Record<string, unknown> = {};
    if (v.authors?.length) meta.author = v.authors.slice(0, 2).join(", ");
    if (v.publisher) meta.publisher = v.publisher;
    if (v.pageCount) meta.pages = v.pageCount;
    const isbn13 = v.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier;
    const isbn10 = v.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier;
    if (isbn13 ?? isbn10) meta.isbn = isbn13 ?? isbn10;
    if (v.categories?.length) meta.genre = v.categories.slice(0, 3).join(", ");

    const rawThumb = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? null;
    const imageUrl = rawThumb
      ? rawThumb.replace("zoom=1", "zoom=3").replace(/^http:\/\//, "https://")
      : null;

    const title = v.subtitle ? `${v.title}: ${v.subtitle}` : v.title;
    const yearRaw = v.publishedDate ? parseInt(v.publishedDate.slice(0, 4)) : null;

    return {
      title,
      year: yearRaw && !isNaN(yearRaw) ? yearRaw : null,
      description: v.description?.slice(0, 500) ?? null,
      imageUrl,
      externalId: item.id,
      externalSource: "GoogleBooks",
      metadata: Object.keys(meta).length ? meta : null,
    };
  });
}

function mergeSources(sets: MetadataResult[][], limit = 8): MetadataResult[] {
  const seen = new Set<string>();
  const merged: MetadataResult[] = [];
  const maxLen = sets.reduce((m, s) => Math.max(m, s.length), 0);
  for (let i = 0; i < maxLen && merged.length < limit; i++) {
    for (const set of sets) {
      if (merged.length >= limit) break;
      if (i < set.length) {
        const item = set[i];
        const key = `${item.externalSource}:${item.externalId}`;
        if (!seen.has(key)) { seen.add(key); merged.push(item); }
      }
    }
  }
  return merged;
}

async function searchTmdbTv(query: string, apiKey: string, omdbKey?: string): Promise<MetadataResult[]> {
  const q = new URLSearchParams({ query, language: "de-DE" });
  const res = await fetch(`https://api.themoviedb.org/3/search/tv?${q}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`TMDB-TV ${res.status}`);
  const data = await res.json();

  const results: MetadataResult[] = (data.results ?? []).slice(0, 8).map((r: {
    id: number; name: string; original_name?: string; overview?: string;
    poster_path?: string | null; first_air_date?: string; genre_ids?: number[];
  }) => {
    const meta: Record<string, unknown> = {};
    if (r.original_name) meta.originalTitle = r.original_name;
    if (r.name && r.name !== r.original_name) meta.localizedTitle = r.name;
    if (r.genre_ids?.length) {
      const names = r.genre_ids.map((id) => TMDB_GENRES[id]).filter(Boolean);
      if (names.length) meta.genres = names.join(", ");
    }
    if (r.first_air_date) meta.firstAirDate = r.first_air_date.slice(0, 4);
    if (r.overview) meta.overview = r.overview;
    return {
      title: r.name,
      year: r.first_air_date ? parseInt(r.first_air_date.slice(0, 4)) : null,
      description: r.overview || null,
      imageUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      externalId: String(r.id),
      externalSource: "TMDB-TV",
      metadata: Object.keys(meta).length ? meta : null,
    };
  });

  // Enrich with full TV details
  const enrichments = await Promise.allSettled(
    results.map((r) => fetchTmdbTvEnrichment(parseInt(r.externalId), apiKey, omdbKey)),
  );

  return results.map((r, i) => {
    const extra = enrichments[i].status === "fulfilled" ? enrichments[i].value : {};
    if (!extra || Object.keys(extra).length === 0) return r;
    return { ...r, metadata: { ...(r.metadata ?? {}), ...extra } };
  });
}

async function fetchTmdbTvEnrichment(tvId: number, tmdbKey: string, omdbKey?: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${tvId}?language=de-DE&append_to_response=credits,content_ratings`,
      { headers: { Authorization: `Bearer ${tmdbKey}` }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return {};
    const d = await res.json();
    const result: Record<string, unknown> = {};

    const creators = (d.created_by ?? []).map((c: { name: string }) => c.name);
    if (creators.length) result.creator = creators.join(", ");

    const cast = (d.credits?.cast ?? []).slice(0, 5).map((c: { name: string }) => c.name);
    if (cast.length) result.cast = cast.join(", ");

    if (d.number_of_seasons) result.numberOfSeasons = `${d.number_of_seasons} Staffel${d.number_of_seasons !== 1 ? "n" : ""}`;
    if (d.number_of_episodes) result.numberOfEpisodes = `${d.number_of_episodes} Episoden`;

    const runtime = (d.episode_run_time ?? [])[0];
    if (runtime) result.episodeRuntime = `${runtime} min`;

    const networks = (d.networks ?? []).slice(0, 2).map((n: { name: string }) => n.name);
    if (networks.length) result.network = networks.join(", ");

    // FSK via German content rating
    const deRating = (d.content_ratings?.results ?? []).find(
      (r: { iso_3166_1: string }) => r.iso_3166_1 === "DE"
    ) as { rating?: string } | undefined;
    if (deRating?.rating) result.fsk = deRating.rating;

    // IMDB rating via OMDb
    if (omdbKey && d.external_ids?.imdb_id) {
      try {
        const omdb = await fetch(`https://www.omdbapi.com/?i=${d.external_ids.imdb_id}&apikey=${omdbKey}`, { signal: AbortSignal.timeout(3000) });
        if (omdb.ok) {
          const od = await omdb.json();
          if (od.imdbRating && od.imdbRating !== "N/A") result.imdbRating = od.imdbRating;
        }
      } catch { /* skip */ }
    }

    return result;
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title     = searchParams.get("title")?.trim() ?? "";
  const mediaType = searchParams.get("mediaType") ?? "CUSTOM";
  const year      = searchParams.get("year") ?? undefined;

  if (title.length < 3) return NextResponse.json([]);

  const settings = await prisma.appSettings.findFirst({ where: { id: "singleton" } });

  try {
    if (mediaType === "MUSIC") {
      if (!settings?.discogsApiKey) return NextResponse.json({ error: "no_key", source: "Discogs" }, { status: 503 });
      return NextResponse.json(await searchDiscogs(title, decrypt(settings.discogsApiKey)));
    }
    if (mediaType === "GAME") {
      if (!settings?.theGamesDbKey) return NextResponse.json({ error: "no_key", source: "TheGamesDB" }, { status: 503 });
      return NextResponse.json(await searchTheGamesDb(title, decrypt(settings.theGamesDbKey)));
    }
    if (mediaType === "VIDEO" || mediaType === "FILM") {
      if (!settings?.tmdbApiKey) return NextResponse.json({ error: "no_key", source: "TMDB" }, { status: 503 });
      const omdbKey = settings?.omdbApiKey ? decrypt(settings.omdbApiKey) : undefined;
      return NextResponse.json(await searchTmdb(title, year, decrypt(settings.tmdbApiKey), omdbKey));
    }
    if (mediaType === "SERIE") {
      if (!settings?.tmdbApiKey) return NextResponse.json({ error: "no_key", source: "TMDB" }, { status: 503 });
      const omdbKey = settings?.omdbApiKey ? decrypt(settings.omdbApiKey) : undefined;
      return NextResponse.json(await searchTmdbTv(title, decrypt(settings.tmdbApiKey), omdbKey));
    }
    if (mediaType === "BOOK") {
      if (settings?.googleBooksKey) {
        const [gb, ol] = await Promise.allSettled([
          searchGoogleBooks(title, decrypt(settings.googleBooksKey)),
          searchOpenLibrary(title),
        ]);
        return NextResponse.json(mergeSources([
          gb.status === "fulfilled" ? gb.value : [],
          ol.status === "fulfilled" ? ol.value : [],
        ]));
      }
      return NextResponse.json(await searchOpenLibrary(title));
    }
    if (mediaType === "COMIC") {
      if (!settings?.comicVineKey) return NextResponse.json({ error: "no_key", source: "ComicVine" }, { status: 503 });
      if (settings?.googleBooksKey) {
        const [cv, gb] = await Promise.allSettled([
          searchComicVine(title, decrypt(settings.comicVineKey)),
          searchGoogleBooks(title, decrypt(settings.googleBooksKey)),
        ]);
        return NextResponse.json(mergeSources([
          cv.status === "fulfilled" ? cv.value : [],
          gb.status === "fulfilled" ? gb.value : [],
        ]));
      }
      return NextResponse.json(await searchComicVine(title, decrypt(settings.comicVineKey)));
    }
    if (mediaType === "MANGA") {
      if (settings?.googleBooksKey) {
        const [gb, ol] = await Promise.allSettled([
          searchGoogleBooks(title, decrypt(settings.googleBooksKey)),
          searchOpenLibrary(title),
        ]);
        return NextResponse.json(mergeSources([
          gb.status === "fulfilled" ? gb.value : [],
          ol.status === "fulfilled" ? ol.value : [],
        ]));
      }
      return NextResponse.json(await searchOpenLibrary(title));
    }
  } catch (err) {
    console.error("[metadata/search] error:", err);
    return NextResponse.json({ error: "api_error", message: String(err) }, { status: 502 });
  }

  return NextResponse.json([]);
}
