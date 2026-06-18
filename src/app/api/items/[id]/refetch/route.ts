import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto/encryption";
import https from "node:https";

async function getUserId(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    const user = await prisma.user.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
    return user?.id ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

function httpsGet(url: string, timeoutMs = 10000): Promise<string> {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "GET",
      family: 4,
      headers: { "User-Agent": "RetroMan/1.0", "Accept": "application/json", "Accept-Encoding": "identity", "Connection": "close" },
    }, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      res.on("end", () => resolve(body));
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error("Timeout")); });
    req.on("error", reject);
    req.end();
  });
}

const TMDB_GENRES: Record<number, string> = {
  28: "Action", 12: "Abenteuer", 16: "Animation", 35: "Komödie", 80: "Krimi",
  99: "Dokumentarfilm", 18: "Drama", 10751: "Familie", 14: "Fantasy", 36: "Geschichte",
  27: "Horror", 10402: "Musik", 9648: "Mystery", 10749: "Romantik", 878: "Science Fiction",
  10770: "TV-Film", 53: "Thriller", 10752: "Kriegsfilm", 37: "Western",
};

async function refetchTmdb(id: string, apiKey: string, omdbKey?: string): Promise<{ metadata: Record<string, unknown>; imageUrl: string | null }> {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?language=de-DE&append_to_response=credits,release_dates`,
    { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const d = await res.json();

  const meta: Record<string, unknown> = {};
  if (d.original_title) meta.originalTitle = d.original_title;
  if (d.title && d.title !== d.original_title) meta.localizedTitle = d.title;
  if (d.genres?.length) meta.genres = d.genres.map((g: { name: string }) => g.name).join(", ");
  if (d.overview) meta.overview = d.overview;

  const directors = d.credits?.crew?.filter((c: { job: string }) => c.job === "Director").map((c: { name: string }) => c.name);
  if (directors?.length) meta.director = directors.join(", ");
  const cast = d.credits?.cast?.slice(0, 5).map((c: { name: string }) => c.name);
  if (cast?.length) meta.cast = cast.join(", ");
  if (d.runtime) meta.runtime = `${d.runtime} min`;
  const deRelease = d.release_dates?.results?.find((r: { iso_3166_1: string }) => r.iso_3166_1 === "DE");
  const cert = deRelease?.release_dates?.find((r: { certification: string }) => r.certification)?.certification;
  if (cert) meta.fsk = cert;
  if (d.production_companies?.[0]?.name) meta.studio = d.production_companies[0].name;

  if (omdbKey && d.imdb_id) {
    try {
      const omdb = await fetch(`https://www.omdbapi.com/?i=${d.imdb_id}&apikey=${omdbKey}`, { signal: AbortSignal.timeout(4000) });
      if (omdb.ok) { const od = await omdb.json(); if (od.imdbRating && od.imdbRating !== "N/A") meta.imdbRating = od.imdbRating; }
    } catch { /* skip */ }
  }

  return { metadata: meta, imageUrl: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null };
}

async function refetchTmdbTv(id: string, apiKey: string, omdbKey?: string): Promise<{ metadata: Record<string, unknown>; imageUrl: string | null }> {
  const res = await fetch(
    `https://api.themoviedb.org/3/tv/${id}?language=de-DE&append_to_response=credits,content_ratings,external_ids`,
    { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`TMDB-TV ${res.status}`);
  const d = await res.json();

  const meta: Record<string, unknown> = {};
  if (d.original_name) meta.originalTitle = d.original_name;
  if (d.name && d.name !== d.original_name) meta.localizedTitle = d.name;
  if (d.genres?.length) meta.genres = d.genres.map((g: { name: string }) => g.name).join(", ");
  if (d.overview) meta.overview = d.overview;
  const creators = (d.created_by ?? []).map((c: { name: string }) => c.name);
  if (creators.length) meta.creator = creators.join(", ");
  const cast = d.credits?.cast?.slice(0, 5).map((c: { name: string }) => c.name);
  if (cast?.length) meta.cast = cast.join(", ");
  if (d.number_of_seasons) meta.numberOfSeasons = `${d.number_of_seasons} Staffel${d.number_of_seasons !== 1 ? "n" : ""}`;
  if (d.number_of_episodes) meta.numberOfEpisodes = `${d.number_of_episodes} Episoden`;
  const runtime = (d.episode_run_time ?? [])[0];
  if (runtime) meta.episodeRuntime = `${runtime} min`;
  const networks = (d.networks ?? []).slice(0, 2).map((n: { name: string }) => n.name);
  if (networks.length) meta.network = networks.join(", ");
  const deRating = (d.content_ratings?.results ?? []).find((r: { iso_3166_1: string }) => r.iso_3166_1 === "DE") as { rating?: string } | undefined;
  if (deRating?.rating) meta.fsk = deRating.rating;
  if (omdbKey && d.external_ids?.imdb_id) {
    try {
      const omdb = await fetch(`https://www.omdbapi.com/?i=${d.external_ids.imdb_id}&apikey=${omdbKey}`, { signal: AbortSignal.timeout(3000) });
      if (omdb.ok) { const od = await omdb.json(); if (od.imdbRating && od.imdbRating !== "N/A") meta.imdbRating = od.imdbRating; }
    } catch { /* skip */ }
  }

  return { metadata: meta, imageUrl: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null };
}

async function refetchDiscogs(id: string, apiKey: string): Promise<{ metadata: Record<string, unknown>; imageUrl: string | null }> {
  const data = await httpsGet(`https://api.discogs.com/releases/${id}`, 8000).then(JSON.parse);
  const meta: Record<string, unknown> = {};
  const artist = data.artists?.[0]?.name;
  if (artist) meta.artist = artist;
  meta.releaseTitle = data.title;
  if (data.labels?.[0]?.name) meta.label = data.labels[0].name;
  const formats = (data.formats ?? []).flatMap((f: { name: string; descriptions?: string[] }) => [f.name, ...(f.descriptions ?? [])]).filter((f: string) => !["Album","Single","EP","Compilation"].includes(f));
  if (formats.length) meta.format = formats.slice(0, 3).join(", ");
  if (data.genres?.[0]) meta.genre = data.genres[0];
  if (data.identifiers) {
    const barcode = data.identifiers.find((i: { type: string; value: string }) => i.type === "Barcode");
    if (barcode) meta.barcode = barcode.value;
  }
  const tracks = (data.tracklist ?? []).filter((t: { type_?: string; title?: string }) => t.type_ !== "heading" && t.title?.trim()).map((t: { position: string; title: string; duration: string }) => ({ pos: t.position ?? "", title: t.title, dur: t.duration ?? "" }));
  if (tracks.length) meta.tracklist = tracks;

  const imageUrl = data.images?.[0]?.uri ?? null;
  return { metadata: meta, imageUrl };
}

async function refetchTheGamesDb(id: string, apiKey: string): Promise<{ metadata: Record<string, unknown>; imageUrl: string | null }> {
  const params = new URLSearchParams({ apikey: apiKey, id, fields: "overview,platform,players,rating,publishers,genres,developers", include: "boxart,platform,publishers,genres,developers" });
  const data = await httpsGet(`https://api.thegamesdb.net/v1/Games/ByGameID?${params}`, 10000).then(JSON.parse);
  if (data.code !== 200) throw new Error(`TheGamesDB code ${data.code}`);
  const game = (data.data?.games ?? [])[0];
  if (!game) throw new Error("Game not found");

  const meta: Record<string, unknown> = {};
  const platformData: Record<string, { name: string }> = data.include?.platform?.data ?? data.include?.platform ?? {};
  const publisherMap: Record<string, string> = {};
  const developerMap: Record<string, string> = {};
  const genreMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(data.include?.Publishers?.data ?? {})) publisherMap[k] = (v as { name: string }).name;
  for (const [k, v] of Object.entries(data.include?.Developers?.data ?? {})) developerMap[k] = (v as { name: string }).name;
  for (const [k, v] of Object.entries(data.include?.Genres?.data ?? {})) genreMap[k] = (v as { name: string }).name;

  const platformName = game.platform ? (platformData[String(game.platform)]?.name ?? null) : null;
  if (platformName) meta.platform = platformName;
  const publisherName = (game.publishers ?? []).map((id: number) => publisherMap[String(id)]).filter(Boolean).slice(0, 2).join(", ") || null;
  if (publisherName) meta.publisher = publisherName;
  const developerName = (game.developers ?? []).map((id: number) => developerMap[String(id)]).filter(Boolean).slice(0, 2).join(", ") || null;
  if (developerName) meta.developer = developerName;
  const genreNames = (game.genres ?? []).map((id: number) => genreMap[String(id)]).filter(Boolean).slice(0, 3).join(", ") || null;
  if (genreNames) meta.genre = genreNames;
  if (game.overview) meta.overview = game.overview;

  const boxartBase: string = data.include?.boxart?.base_url?.large ?? "";
  const boxartData: Record<string, Array<{ type: string; side?: string; filename: string }>> = data.include?.boxart?.data ?? {};
  const arts = boxartData[String(game.id)] ?? [];
  const front = arts.find((b) => b.type === "boxart" && b.side === "front") ?? arts[0];
  const back = arts.find((b) => b.type === "boxart" && b.side === "back");
  if (back && boxartBase) meta.backCover = `${boxartBase}${back.filename}`;

  return { metadata: meta, imageUrl: front && boxartBase ? `${boxartBase}${front.filename}` : null };
}

async function refetchOpenLibrary(id: string): Promise<{ metadata: Record<string, unknown>; imageUrl: string | null }> {
  const data = await httpsGet(`https://openlibrary.org/works/${id}.json`, 8000).then(JSON.parse);
  const meta: Record<string, unknown> = {};
  const desc = data.description;
  if (typeof desc === "string") meta.description = desc;
  else if (desc?.value) meta.description = String(desc.value);

  // Also fetch edition info for author, publisher, isbn
  try {
    const editions = await httpsGet(`https://openlibrary.org/works/${id}/editions.json?limit=1`, 5000).then(JSON.parse);
    const ed = editions.entries?.[0];
    if (ed) {
      if (ed.publishers?.[0]) meta.publisher = ed.publishers[0];
      if (ed.isbn_13?.[0]) meta.isbn = ed.isbn_13[0];
      else if (ed.isbn_10?.[0]) meta.isbn = ed.isbn_10[0];
      if (ed.number_of_pages) meta.pages = ed.number_of_pages;
    }
  } catch { /* skip */ }

  const coverId = data.covers?.[0];
  return { metadata: meta, imageUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null };
}

async function refetchMangaDex(id: string): Promise<{ metadata: Record<string, unknown>; imageUrl: string | null }> {
  const url = `https://api.mangadex.org/manga/${id}?includes[]=author&includes[]=artist&includes[]=cover_art`;
  const data = await httpsGet(url, 8000).then(JSON.parse);
  const attr = data.data?.attributes;
  if (!attr) throw new Error("MangaDex: no data");

  const meta: Record<string, unknown> = {};
  const jaTitle = (attr.altTitles ?? []).find((t: Record<string, string>) => t["ja"] || t["ja-ro"]);
  if (jaTitle) meta.originalTitle = jaTitle["ja"] ?? jaTitle["ja-ro"];
  const author = data.data?.relationships?.find((r: { type: string; attributes?: { name?: string } }) => r.type === "author")?.attributes?.name;
  const artist = data.data?.relationships?.find((r: { type: string; attributes?: { name?: string } }) => r.type === "artist")?.attributes?.name;
  if (author) meta.author = author;
  if (artist && artist !== author) meta.artist = artist;
  if (attr.publicationDemographic) { const demMap: Record<string, string> = { shonen: "Shōnen", shojo: "Shōjo", seinen: "Seinen", josei: "Josei" }; meta.demographic = demMap[attr.publicationDemographic] ?? attr.publicationDemographic; }
  const genres = (attr.tags ?? []).filter((t: { attributes: { group: string; name: Record<string, string> } }) => t.attributes.group === "genre").map((t: { attributes: { name: Record<string, string> } }) => t.attributes.name["de"] ?? t.attributes.name["en"]).filter(Boolean).slice(0, 4);
  if (genres.length) meta.genres = genres.join(", ");
  const statusMap: Record<string, string> = { ongoing: "Laufend", completed: "Abgeschlossen", hiatus: "Pause", cancelled: "Abgebrochen" };
  if (attr.status) meta.status = statusMap[attr.status] ?? attr.status;
  if (attr.description?.["de"]) meta.overview = attr.description["de"].slice(0, 500);
  else if (attr.description?.["en"]) meta.overview = attr.description["en"].slice(0, 500);

  const coverRel = data.data?.relationships?.find((r: { type: string; attributes?: { fileName?: string } }) => r.type === "cover_art");
  const coverFile = coverRel?.attributes?.fileName;
  return { metadata: meta, imageUrl: coverFile ? `https://uploads.mangadex.org/covers/${id}/${coverFile}.512.jpg` : null };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const item = await prisma.item.findFirst({
    where: { id, userId },
    include: {
      images: { orderBy: { order: "asc" } },
      collection: { select: { mediaType: true } },
    },
  });
  if (!item) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  if (!item.externalId || !item.externalSource) {
    return NextResponse.json({ error: "Keine API-Quelle vorhanden." }, { status: 400 });
  }

  const settings = await prisma.appSettings.findFirst({ where: { id: "singleton" } });

  try {
    let metadata: Record<string, unknown> = {};
    let imageUrl: string | null = null;

    const src = item.externalSource;

    if (src === "TMDB" || src === "TMDB-TV") {
      if (!settings?.tmdbApiKey) return NextResponse.json({ error: "Kein TMDB-Key hinterlegt." }, { status: 503 });
      const key = decrypt(settings.tmdbApiKey);
      const omdbKey = settings.omdbApiKey ? decrypt(settings.omdbApiKey) : undefined;
      const result = src === "TMDB"
        ? await refetchTmdb(item.externalId, key, omdbKey)
        : await refetchTmdbTv(item.externalId, key, omdbKey);
      metadata = result.metadata;
      imageUrl = result.imageUrl;
    } else if (src === "Discogs") {
      if (!settings?.discogsApiKey) return NextResponse.json({ error: "Kein Discogs-Key hinterlegt." }, { status: 503 });
      const result = await refetchDiscogs(item.externalId, decrypt(settings.discogsApiKey));
      metadata = result.metadata;
      imageUrl = result.imageUrl;
    } else if (src === "TheGamesDB") {
      if (!settings?.theGamesDbKey) return NextResponse.json({ error: "Kein TheGamesDB-Key hinterlegt." }, { status: 503 });
      const result = await refetchTheGamesDb(item.externalId, decrypt(settings.theGamesDbKey));
      metadata = result.metadata;
      imageUrl = result.imageUrl;
    } else if (src === "OpenLibrary") {
      const result = await refetchOpenLibrary(item.externalId);
      metadata = result.metadata;
      imageUrl = result.imageUrl;
    } else if (src === "MangaDex") {
      const result = await refetchMangaDex(item.externalId);
      metadata = result.metadata;
      imageUrl = result.imageUrl;
    } else if (src === "ComicVine") {
      if (!settings?.comicVineKey) return NextResponse.json({ error: "Kein ComicVine-Key hinterlegt." }, { status: 503 });
      // ComicVine direct fetch by issue ID
      const key = decrypt(settings.comicVineKey);
      const data = await httpsGet(`https://comicvine.gamespot.com/api/issue/4000-${item.externalId}/?api_key=${key}&format=json&field_list=id,name,issue_number,description,image,volume,person_credits,store_date`, 8000).then(JSON.parse);
      const r = data.results;
      if (r) {
        if (r.volume?.name) metadata.series = r.volume.name;
        if (r.issue_number) metadata.issueNumber = `#${r.issue_number}`;
        const writers = (r.person_credits ?? []).filter((p: { role: string }) => p.role.toLowerCase().includes("writer")).map((p: { name: string }) => p.name);
        const artists = (r.person_credits ?? []).filter((p: { role: string }) => p.role.toLowerCase().includes("artist") || p.role.toLowerCase().includes("pencil")).map((p: { name: string }) => p.name);
        if (writers.length) metadata.writer = writers.slice(0, 2).join(", ");
        if (artists.length) metadata.artist = artists.slice(0, 2).join(", ");
        if (r.description) metadata.overview = r.description.replace(/<[^>]*>/g, "").slice(0, 400);
        imageUrl = r.image?.medium_url ?? r.image?.original_url ?? null;
      }
    } else {
      return NextResponse.json({ error: `Unbekannte Quelle: ${src}` }, { status: 400 });
    }

    // Only update cover if not a local upload
    const primaryImage = item.images.find((img) => img.isPrimary) ?? item.images[0];
    const isLocalUpload = primaryImage?.filePath != null || (primaryImage?.url ?? "").startsWith("/api/uploads/");
    const shouldUpdateImage = imageUrl && !isLocalUpload;

    // Build update data
    const updateData: Record<string, unknown> = { metadata };
    if (shouldUpdateImage && imageUrl) {
      updateData.images = {
        deleteMany: { isPrimary: true },
        create: [{ url: imageUrl, order: 0, isPrimary: true }],
      };
    }

    const updated = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        images: { orderBy: { order: "asc" } },
        tags: { include: { tagValue: true, tagGroup: true } },
        collection: { include: { fields: { orderBy: { order: "asc" } }, tagGroups: { select: { groupId: true, showInView: true } } } },
        customFields: { include: { field: true } },
        grading: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[refetch] error:", err);
    return NextResponse.json({ error: "Fehler beim Abrufen der API-Daten." }, { status: 502 });
  }
}
