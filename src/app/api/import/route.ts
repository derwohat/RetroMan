import { NextRequest, NextResponse } from "next/server";
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

type ImportItem = {
  title: string;
  collection?: string;
  year?: number | null;
  condition?: string | null;
  itemStatus?: string | null;
  collectionStatus?: string;
  isFavorite?: boolean;
  rating?: number | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  store?: string | null;
  location?: string | null;
  quantity?: number;
  barcode?: string | null;
  description?: string | null;
  notes?: string | null;
  images?: Array<{ url?: string | null; isPrimary?: boolean }>;
};

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { items?: ImportItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Keine Items im Import gefunden." }, { status: 400 });
  }

  if (body.items.length > 5000) {
    return NextResponse.json({ error: "Maximal 5000 Items pro Import." }, { status: 400 });
  }

  // Load all collections for this user's collections (use first collection as fallback)
  const collections = await prisma.collection.findMany({ orderBy: { order: "asc" } });
  if (collections.length === 0) {
    return NextResponse.json({ error: "Keine Sammlung vorhanden. Bitte zuerst eine Sammlung anlegen." }, { status: 400 });
  }

  const collectionByName = new Map(collections.map((c) => [c.name.toLowerCase(), c.id]));
  const defaultCollectionId = collections[0].id;

  const VALID_CONDITIONS = new Set(["MINT", "VERY_GOOD", "GOOD", "USED", "POOR"]);
  const VALID_STATUSES = new Set(["OPENED", "SEALED", "GRADED"]);

  let created = 0;
  let skipped = 0;

  for (const raw of body.items) {
    if (!raw.title?.trim()) { skipped++; continue; }

    const collectionId = raw.collection
      ? (collectionByName.get(raw.collection.toLowerCase()) ?? defaultCollectionId)
      : defaultCollectionId;

    try {
      await prisma.item.create({
        data: {
          userId,
          collectionId,
          title: raw.title.trim(),
          year: raw.year ?? null,
          condition: (raw.condition && VALID_CONDITIONS.has(raw.condition)) ? raw.condition as never : null,
          itemStatus: (raw.itemStatus && VALID_STATUSES.has(raw.itemStatus)) ? raw.itemStatus as never : null,
          collectionStatus: raw.collectionStatus === "WISHLIST" ? "WISHLIST" : "OWNED",
          isFavorite: raw.isFavorite ?? false,
          rating: raw.rating ?? null,
          purchasePrice: raw.purchasePrice ?? null,
          purchaseDate: raw.purchaseDate ? new Date(raw.purchaseDate) : null,
          store: raw.store ?? null,
          location: raw.location ?? null,
          quantity: raw.quantity ?? 1,
          barcode: raw.barcode ?? null,
          description: raw.description ?? null,
          notes: raw.notes ?? null,
          images: raw.images?.length
            ? {
                create: raw.images
                  .filter((img) => img.url)
                  .slice(0, 10)
                  .map((img, i) => ({ url: img.url!, order: i, isPrimary: img.isPrimary ?? i === 0 })),
              }
            : undefined,
        },
      });
      created++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ created, skipped });
}
