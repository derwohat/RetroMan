import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto/encryption";

export type MetadataResult = {
  title: string;
  year: number | null;
  description: string | null;
  imageUrl: string | null;
  externalId: string;
  externalSource: string;
};

async function getIgdbToken(clientId: string, secret: string): Promise<string | null> {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${secret}&grant_type=client_credentials`,
    { method: "POST", signal: AbortSignal.timeout(5000) },
  );
  if (!res.ok) return null;
  return (await res.json()).access_token ?? null;
}

async function searchTmdb(title: string, year: string | undefined, apiKey: string): Promise<MetadataResult[]> {
  const q = new URLSearchParams({ query: title, language: "de-DE" });
  if (year) q.set("year", year);
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${q}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).slice(0, 8).map((r: {
    id: number; title: string; overview?: string;
    poster_path?: string | null; release_date?: string;
  }) => ({
    title: r.title,
    year: r.release_date ? parseInt(r.release_date.slice(0, 4)) : null,
    description: r.overview || null,
    imageUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
    externalId: String(r.id),
    externalSource: "tmdb",
  }));
}

async function searchIgdb(title: string, clientId: string, token: string): Promise<MetadataResult[]> {
  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: `search "${title}"; fields name,summary,cover.image_id,first_release_date; limit 8;`,
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const games = await res.json();
  return games.map((g: {
    id: number; name: string; summary?: string;
    cover?: { image_id?: string }; first_release_date?: number;
  }) => ({
    title: g.name,
    year: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
    description: g.summary || null,
    imageUrl: g.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
      : null,
    externalId: String(g.id),
    externalSource: "igdb",
  }));
}

async function searchDiscogs(title: string, apiKey: string): Promise<MetadataResult[]> {
  const q = new URLSearchParams({ q: title, type: "release" });
  const res = await fetch(`https://api.discogs.com/database/search?${q}`, {
    headers: {
      Authorization: `Discogs token=${apiKey}`,
      "User-Agent": "RetroMan/1.0",
    },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).slice(0, 8).map((r: {
    id: number; title: string; thumb?: string; year?: string;
  }) => ({
    title: r.title,
    year: r.year ? parseInt(r.year) : null,
    description: null,
    imageUrl: r.thumb || null,
    externalId: String(r.id),
    externalSource: "discogs",
  }));
}

async function searchMusicBrainz(title: string): Promise<MetadataResult[]> {
  const q = encodeURIComponent(`release:"${title}"`);
  const res = await fetch(
    `https://musicbrainz.org/ws/2/release/?query=${q}&fmt=json&limit=8`,
    {
      headers: { "User-Agent": "RetroMan/1.0 (denniskampf@itraco.de)" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.releases ?? []).map((r: {
    id: string; title: string; date?: string;
    "artist-credit"?: Array<{ name?: string }>;
    disambiguation?: string;
  }) => ({
    title: [r.title, r["artist-credit"]?.[0]?.name].filter(Boolean).join(" — "),
    year: r.date ? parseInt(r.date.slice(0, 4)) : null,
    description: r.disambiguation || null,
    imageUrl: null,
    externalId: r.id,
    externalSource: "musicbrainz",
  }));
}

async function searchOpenLibrary(title: string, year: string | undefined): Promise<MetadataResult[]> {
  const q = new URLSearchParams({
    title,
    fields: "key,title,author_name,first_publish_year,cover_i",
    limit: "8",
  });
  if (year) q.set("publish_year", year);
  const res = await fetch(`https://openlibrary.org/search.json?${q}`, {
    headers: { "User-Agent": "RetroMan/1.0" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.docs ?? []).slice(0, 8).map((d: {
    key: string; title: string; author_name?: string[];
    first_publish_year?: number; cover_i?: number;
  }) => ({
    title: [d.title, d.author_name?.[0]].filter(Boolean).join(" — "),
    year: d.first_publish_year ?? null,
    description: null,
    imageUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    externalId: d.key,
    externalSource: "openlibrary",
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title     = searchParams.get("title")?.trim() ?? "";
  const mediaType = searchParams.get("mediaType") ?? "CUSTOM";
  const year      = searchParams.get("year") ?? undefined;

  if (!title) return NextResponse.json([]);

  const settings = await prisma.appSettings.findFirst({ where: { id: "singleton" } });

  let results: MetadataResult[] = [];

  try {
    if (mediaType === "VIDEO") {
      if (settings?.tmdbApiKey) {
        results = await searchTmdb(title, year, decrypt(settings.tmdbApiKey));
      }
    } else if (mediaType === "GAME") {
      if (settings?.igdbClientId && settings?.igdbSecret) {
        const token = await getIgdbToken(
          decrypt(settings.igdbClientId),
          decrypt(settings.igdbSecret),
        );
        if (token) results = await searchIgdb(title, decrypt(settings.igdbClientId), token);
      }
    } else if (mediaType === "MUSIC") {
      if (settings?.discogsApiKey) {
        results = await searchDiscogs(title, decrypt(settings.discogsApiKey));
      }
      if (results.length === 0) {
        results = await searchMusicBrainz(title);
      }
    } else if (mediaType === "BOOK") {
      results = await searchOpenLibrary(title, year);
    }
  } catch {
    // network error — return empty
  }

  return NextResponse.json(results);
}
