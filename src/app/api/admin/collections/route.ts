import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const collections = await prisma.collection.findMany({
      where: { userId },
      include: {
        fields: { orderBy: { order: "asc" } },
        tagGroups: { include: { group: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { items: true } },
      },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(collections);
  } catch {
    return NextResponse.json({ error: "Datenbankfehler." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, icon, mediaType, customMediaTypeLabel } = await req.json();
  if (!name?.trim() || !mediaType) {
    return NextResponse.json({ error: "Name und Medientyp erforderlich." }, { status: 400 });
  }

  try {
    const agg = await prisma.collection.aggregate({ where: { userId }, _max: { order: true } });
    const nextOrder = (agg._max.order ?? -1) + 1;
    const collection = await prisma.collection.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { name: name.trim(), icon: icon || null, mediaType: mediaType as any, customMediaTypeLabel: customMediaTypeLabel || null, order: nextOrder, userId },
      include: {
        fields: { orderBy: { order: "asc" } },
        tagGroups: { include: { group: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { items: true } },
      },
    });
    return NextResponse.json(collection, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/admin/collections]", msg);
    return NextResponse.json({ error: "Fehler beim Erstellen der Sammlung." }, { status: 500 });
  }
}
