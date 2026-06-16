import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

async function getUserId(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    const user = await prisma.user.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return user?.id ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const collectionId = searchParams.get("collectionId");
  const search = searchParams.get("search") ?? "";
  const condition = searchParams.get("condition");
  const collectionStatus = searchParams.get("collectionStatus");
  const isFavorite = searchParams.get("isFavorite");
  const sortBy = searchParams.get("sortBy") ?? "title";
  const sortOrder = (searchParams.get("sortOrder") ?? "asc") as "asc" | "desc";

  const allowedSorts = ["title", "year", "createdAt", "purchasePrice", "condition"];
  const safeSort = allowedSorts.includes(sortBy) ? sortBy : "title";

  const items = await prisma.item.findMany({
    where: {
      userId,
      ...(collectionId ? { collectionId } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(condition ? { condition: condition as any } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(collectionStatus ? { collectionStatus: collectionStatus as any } : {}),
      ...(isFavorite === "true" ? { isFavorite: true } : {}),
    },
    include: {
      images: { orderBy: { order: "asc" } },
      tags: { include: { tagValue: true, tagGroup: true } },
      customFields: { include: { field: true } },
      collection: { select: { id: true, name: true, category: { select: { id: true, icon: true, mediaType: true } } } },
    },
    orderBy: { [safeSort]: sortOrder },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // tags as array of { tagValueId, groupId }
  const { collectionId, title, imageUrl, tags, ...rest } = body;

  if (!collectionId || !title?.trim()) {
    return NextResponse.json({ error: "Sammlung und Titel erforderlich." }, { status: 400 });
  }

  const itemData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== null && v !== undefined && v !== "") itemData[k] = v;
  }

  const tagLinks: Array<{ tagValueId: string; groupId: string }> = Array.isArray(tags) ? tags : [];

  try {
    const item = await prisma.item.create({
      data: {
        userId,
        collectionId,
        title: title.trim(),
        ...itemData,
        ...(imageUrl ? { images: { create: [{ url: imageUrl, order: 0, isPrimary: true }] } } : {}),
        ...(tagLinks.length > 0
          ? { tags: { create: tagLinks.map(({ tagValueId, groupId }) => ({ tagValueId, groupId })) } }
          : {}),
      },
      include: { images: true, tags: { include: { tagValue: true, tagGroup: true } } },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("[POST /api/items]", err);
    return NextResponse.json({ error: "Datenbankfehler beim Erstellen des Eintrags." }, { status: 500 });
  }
}
