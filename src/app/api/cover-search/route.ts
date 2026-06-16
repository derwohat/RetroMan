import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto/encryption";

export type CoverResult = {
  url: string;
  label: string;
  source: string;
};

async function searchDiscogsCover(query: string, apiKey: string): Promise<CoverResult[]> {
  const q = new URLSearchParams({ q: query, type: "release", per_page: "12" });
  const res = await fetch(`https://api.discogs.com/database/search?${q}`, {
    headers: { Authorization: `Discogs token=${apiKey}`, "User-Agent": "RetroMan/1.0" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? [])
    .filter((r: { cover_image?: string }) => r.cover_image?.startsWith("http"))
    .slice(0, 10)
    .map((r: { title: string; cover_image: string; year?: string }) => ({
      url: r.cover_image,
      label: [r.title, r.year].filter(Boolean).join(" — "),
      source: "Discogs",
    }));
}

async function searchTheGamesDbCover(query: string, apiKey: string): Promise<CoverResult[]> {
  const params = new URLSearchParams({ apikey: apiKey, name: query, include: "boxart" });
  const res = await fetch(`https://api.thegamesdb.net/v1/Games/ByGameName?${params}`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (data.code !== 200) return [];
  const games = (data.data?.games ?? []) as Array<{ id: number; game_title: string; release_date?: string }>;
  const boxartBase: string = data.include?.boxart?.base_url?.large ?? "";
  const boxartData: Record<string, Array<{ type: string; side?: string; filename: string }>> = data.include?.boxart?.data ?? {};
  const results: CoverResult[] = [];
  for (const g of games.slice(0, 10)) {
    const arts = boxartData[String(g.id)] ?? [];
    const front = arts.find((b) => b.type === "boxart" && b.side === "front") ?? arts[0];
    if (front && boxartBase) {
      results.push({
        url: `${boxartBase}${front.filename}`,
        label: [g.game_title, g.release_date ? new Date(g.release_date).getFullYear() : null].filter(Boolean).join(" — "),
        source: "TheGamesDB",
      });
    }
  }
  return results;
}

async function searchTmdbCover(query: string, year: string | undefined, apiKey: string): Promise<CoverResult[]> {
  const q = new URLSearchParams({ query, language: "de-DE" });
  if (year) q.set("year", year);
  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${q}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? [])
    .filter((r: { poster_path?: string }) => r.poster_path)
    .slice(0, 10)
    .map((r: { poster_path: string; title: string; release_date?: string }) => ({
      url: `https://image.tmdb.org/t/p/w500${r.poster_path}`,
      label: [r.title, r.release_date?.slice(0, 4)].filter(Boolean).join(" — "),
      source: "TMDB",
    }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title     = searchParams.get("title")?.trim() ?? "";
  const year      = searchParams.get("year") ?? undefined;
  const mediaType = searchParams.get("mediaType") ?? "CUSTOM";

  if (!title) return NextResponse.json([]);

  const settings = await prisma.appSettings.findFirst({ where: { id: "singleton" } });

  try {
    if (mediaType === "MUSIC" && settings?.discogsApiKey)
      return NextResponse.json(await searchDiscogsCover(title, decrypt(settings.discogsApiKey)));
    if (mediaType === "GAME" && settings?.theGamesDbKey)
      return NextResponse.json(await searchTheGamesDbCover(title, decrypt(settings.theGamesDbKey)));
    if (mediaType === "VIDEO" && settings?.tmdbApiKey)
      return NextResponse.json(await searchTmdbCover(title, year, decrypt(settings.tmdbApiKey)));
  } catch {
    // API error
  }

  return NextResponse.json([]);
}
