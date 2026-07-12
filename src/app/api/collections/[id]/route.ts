import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

async function verifyOwner(id: string, userId: string): Promise<boolean> {
  const col = await prisma.collection.findUnique({ where: { id }, select: { userId: true } });
  return col?.userId === userId;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await verifyOwner(id, userId))) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const { name, icon, mediaType, gradingEnabled, customMediaTypeLabel } = await req.json();
  const data: Record<string, unknown> = {};
  if (name?.trim()) data.name = name.trim();
  if (icon !== undefined) data.icon = icon;
  if (mediaType) data.mediaType = mediaType;
  if (gradingEnabled !== undefined) data.gradingEnabled = gradingEnabled;
  if (customMediaTypeLabel !== undefined) data.customMediaTypeLabel = customMediaTypeLabel;

  try {
    const collection = await prisma.collection.update({
      where: { id },
      data,
      include: {
        fields: { orderBy: { order: "asc" } },
        tagGroups: { include: { group: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { items: true } },
      },
    });
    return NextResponse.json(collection);
  } catch {
    return NextResponse.json({ error: "Fehler beim Aktualisieren." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await verifyOwner(id, userId))) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  try {
    await prisma.collection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Fehler beim Löschen." }, { status: 500 });
  }
}
