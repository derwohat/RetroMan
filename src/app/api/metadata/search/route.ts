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

async function searchDiscogs(query: string, apiKey: string): Promise<MetadataResult[]> {
  const q = new URLSearchParams({ q: query, type: "release", per_page: "8" });
  const res = await fetch(`https://api.discogs.com/database/search?${q}`, {
    headers: { Authorization: `Discogs token=${apiKey}`, "User-Agent": "RetroMan/1.0" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).slice(0, 8).map((r: {
    id: number; title: string; cover_image?: string; thumb?: string; year?: string;
  }) => ({
    title: r.title,
    year: r.year ? parseInt(r.year) : null,
    description: null,
    imageUrl: r.cover_image?.startsWith("http") ? r.cover_image : (r.thumb?.startsWith("http") ? r.thumb : null),
    externalId: String(r.id),
    externalSource: "Discogs",
  }));
}

async function searchTheGamesDb(query: string, apiKey: string): Promise<MetadataResult[]> {
  const params = new URLSearchParams({ apikey: apiKey, name: query, fields: "overview", include: "boxart" });
  const res = await fetch(`https://api.thegamesdb.net/v1/Games/ByGameName?${params}`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (data.code !== 200) return [];
  const games = (data.data?.games ?? []) as Array<{ id: number; game_title: string; release_date?: string; overview?: string }>;
  const boxartBase: string = data.include?.boxart?.base_url?.large ?? "";
  const boxartData: Record<string, Array<{ type: string; side?: string; filename: string }>> = data.include?.boxart?.data ?? {};
  return games.slice(0, 8).map((g) => {
    const arts = boxartData[String(g.id)] ?? [];
    const front = arts.find((b) => b.type === "boxart" && b.side === "front") ?? arts[0];
    return {
      title: g.game_title,
      year: g.release_date ? new Date(g.release_date).getFullYear() : null,
      description: g.overview || null,
      imageUrl: front && boxartBase ? `${boxartBase}${front.filename}` : null,
      externalId: String(g.id),
      externalSource: "TheGamesDB",
    };
  });
}

async function searchTmdb(query: string, year: string | undefined, apiKey: string): Promise<MetadataResult[]> {
  const q = new URLSearchParams({ query, language: "de-DE" });
  if (year) q.set("year", year);
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${q}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).slice(0, 8).map((r: {
    id: number; title: string; overview?: string; poster_path?: string | null; release_date?: string;
  }) => ({
    title: r.title,
    year: r.release_date ? parseInt(r.release_date.slice(0, 4)) : null,
    description: r.overview || null,
    imageUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
    externalId: String(r.id),
    externalSource: "TMDB",
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title     = searchParams.get("title")?.trim() ?? "";
  const mediaType = searchParams.get("mediaType") ?? "CUSTOM";
  const year      = searchParams.get("year") ?? undefined;

  if (title.length < 3) return NextResponse.json([]);

  const settings = await prisma.appSettings.findFirst({ where: { id: "singleton" } });

  try {
    if (mediaType === "MUSIC" && settings?.discogsApiKey)
      return NextResponse.json(await searchDiscogs(title, decrypt(settings.discogsApiKey)));
    if (mediaType === "GAME" && settings?.theGamesDbKey)
      return NextResponse.json(await searchTheGamesDb(title, decrypt(settings.theGamesDbKey)));
    if (mediaType === "VIDEO" && settings?.tmdbApiKey)
      return NextResponse.json(await searchTmdb(title, year, decrypt(settings.tmdbApiKey)));
  } catch {
    // API error
  }

  return NextResponse.json([]);
}
