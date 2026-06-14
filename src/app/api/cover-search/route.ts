import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto/encryption";

export type CoverResult = {
  url: string;
  label: string;
  source: string;
};

// ── Free APIs ─────────────────────────────────────────────────────────────────

async function searchOpenLibrary(title: string, year?: string): Promise<CoverResult[]> {
  const q = new URLSearchParams({ title, fields: "cover_i,title,author_name", limit: "10" });
  if (year) q.set("publish_year", year);
  const res = await fetch(`https://openlibrary.org/search.json?${q}`, {
    headers: { "User-Agent": "RetroMan/1.0" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const results: CoverResult[] = [];
  for (const doc of data.docs ?? []) {
    if (doc.cover_i) {
      results.push({
        url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
        label: [doc.title, doc.author_name?.[0]].filter(Boolean).join(" — "),
        source: "OpenLibrary",
      });
    }
    if (results.length >= 8) break;
  }
  return results;
}

async function searchMusicBrainz(title: string): Promise<CoverResult[]> {
  const q = encodeURIComponent(`release:"${title}"`);
  const res = await fetch(
    `https://musicbrainz.org/ws/2/release/?query=${q}&fmt=json&limit=12`,
    {
      headers: { "User-Agent": "RetroMan/1.0 (denniskampf@itraco.de)" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) return [];
  const data = await res.json();
  const results: CoverResult[] = [];
  for (const release of data.releases ?? []) {
    try {
      const caRes = await fetch(
        `https://coverartarchive.org/release/${release.id}/front`,
        {
          headers: { "User-Agent": "RetroMan/1.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4000),
        },
      );
      if (caRes.ok) {
        results.push({
          url: caRes.url,
          label: [release.title, release["artist-credit"]?.[0]?.name, release.date?.slice(0, 4)]
            .filter(Boolean).join(" — "),
          source: "MusicBrainz",
        });
      }
    } catch { /* no cover */ }
    if (results.length >= 8) break;
  }
  return results;
}

// ── Key-based APIs ────────────────────────────────────────────────────────────

async function searchTmdb(title: string, year: string | undefined, apiKey: string): Promise<CoverResult[]> {
  const q = new URLSearchParams({ query: title, language: "de-DE" });
  if (year) q.set("year", year);
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${q}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? [])
    .filter((r: { poster_path?: string }) => r.poster_path)
    .slice(0, 8)
    .map((r: { poster_path: string; title: string; release_date?: string }) => ({
      url: `https://image.tmdb.org/t/p/w500${r.poster_path}`,
      label: [r.title, r.release_date?.slice(0, 4)].filter(Boolean).join(" — "),
      source: "TMDB",
    }));
}

async function searchIgdb(title: string, clientId: string, accessToken: string): Promise<CoverResult[]> {
  const searchRes = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/plain",
    },
    body: `search "${title}"; fields name,cover.image_id; limit 8;`,
    signal: AbortSignal.timeout(6000),
  });
  if (!searchRes.ok) return [];
  const games = await searchRes.json();
  return games
    .filter((g: { cover?: { image_id?: string } }) => g.cover?.image_id)
    .map((g: { name: string; cover: { image_id: string } }) => ({
      url: `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`,
      label: g.name,
      source: "IGDB",
    }));
}

async function getIgdbToken(clientId: string, secret: string): Promise<string | null> {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${secret}&grant_type=client_credentials`,
    { method: "POST", signal: AbortSignal.timeout(5000) },
  );
  if (!res.ok) return null;
  return (await res.json()).access_token ?? null;
}

async function searchGoogle(title: string, year: string | undefined, mediaType: string, apiKey: string, cx: string): Promise<CoverResult[]> {
  const suffix = mediaType === "GAME" ? "game cover box art"
    : mediaType === "MUSIC"   ? "album cover"
    : mediaType === "VIDEO"   ? "movie cover poster"
    : mediaType === "BOOK"    ? "book cover"
    : "cover";
  const q = [title, year, suffix].filter(Boolean).join(" ");
  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q,
    searchType: "image",
    num: "10",
    imgSize: "large",
  });
  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []).map((item: { link: string; title: string; displayLink: string }) => ({
    url: item.link,
    label: item.title,
    source: "Google",
  }));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title     = searchParams.get("title")?.trim() ?? "";
  const year      = searchParams.get("year") ?? undefined;
  const mediaType = searchParams.get("mediaType") ?? "CUSTOM";

  if (!title) return NextResponse.json([]);

  const settings = await prisma.appSettings.findFirst({ where: { id: "singleton" } });

  let results: CoverResult[] = [];

  try {
    // 1. Media-type-specific free APIs
    if (mediaType === "BOOK") {
      results = await searchOpenLibrary(title, year);
    } else if (mediaType === "MUSIC") {
      results = await searchMusicBrainz(title);
    }

    // 2. Media-type-specific paid APIs (if keys configured)
    if (results.length === 0 && mediaType === "VIDEO" && settings?.tmdbApiKey) {
      results = await searchTmdb(title, year, decrypt(settings.tmdbApiKey));
    }
    if (results.length === 0 && mediaType === "GAME" && settings?.igdbClientId && settings?.igdbSecret) {
      const token = await getIgdbToken(decrypt(settings.igdbClientId), decrypt(settings.igdbSecret));
      if (token) results = await searchIgdb(title, decrypt(settings.igdbClientId), token);
    }

    // 3. Universal Google fallback (all media types, if key configured)
    if (results.length === 0 && settings?.googleSearchKey && settings?.googleSearchCx) {
      results = await searchGoogle(
        title, year, mediaType,
        decrypt(settings.googleSearchKey),
        decrypt(settings.googleSearchCx),
      );
    }
  } catch {
    // network errors — return what we have
  }

  return NextResponse.json(results);
}
