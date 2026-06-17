import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

async function getUserId(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    const user = await prisma.user.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
    return user?.id ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.item.findMany({
    where: { userId },
    select: {
      id: true,
      condition: true,
      isFavorite: true,
      collectionStatus: true,
      purchasePrice: true,
      year: true,
      createdAt: true,
      collectionId: true,
      collection: { select: { id: true, name: true, icon: true } },
    },
  });

  // Items per collection
  const byCollection: Record<string, { name: string; icon: string | null; count: number; value: number }> = {};
  for (const item of items) {
    const id = item.collectionId;
    if (!byCollection[id]) {
      byCollection[id] = { name: item.collection.name, icon: item.collection.icon, count: 0, value: 0 };
    }
    byCollection[id].count++;
    if (item.purchasePrice) byCollection[id].value += Number(item.purchasePrice);
  }

  // Items per condition
  const byCondition: Record<string, number> = {};
  for (const item of items) {
    const c = item.condition ?? "UNKNOWN";
    byCondition[c] = (byCondition[c] ?? 0) + 1;
  }

  // Items per year (exclude nulls)
  const byYear: Record<number, number> = {};
  for (const item of items) {
    if (item.year) byYear[item.year] = (byYear[item.year] ?? 0) + 1;
  }

  // Items added per month (last 12 months)
  const byMonth: Record<string, number> = {};
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  for (const item of items) {
    if (new Date(item.createdAt) >= cutoff) {
      const key = item.createdAt.toISOString().slice(0, 7); // YYYY-MM
      byMonth[key] = (byMonth[key] ?? 0) + 1;
    }
  }

  const totalValue = items.reduce((s, i) => s + (i.purchasePrice ? Number(i.purchasePrice) : 0), 0);
  const favorites = items.filter((i) => i.isFavorite).length;
  const wishlist = items.filter((i) => i.collectionStatus === "WISHLIST").length;

  return NextResponse.json({
    total: items.length,
    totalValue,
    favorites,
    wishlist,
    byCollection: Object.values(byCollection).sort((a, b) => b.count - a.count),
    byCondition,
    byYear: Object.entries(byYear)
      .map(([year, count]) => ({ year: Number(year), count }))
      .sort((a, b) => a.year - b.year),
    byMonth: Object.entries(byMonth)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  });
}
