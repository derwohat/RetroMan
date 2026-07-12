import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string; groupId: string }> };

async function verifyOwner(collectionId: string, userId: string): Promise<boolean> {
  const col = await prisma.collection.findUnique({ where: { id: collectionId }, select: { userId: true } });
  return col?.userId === userId;
}

export async function PATCH(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: collectionId, groupId } = await params;
  if (!(await verifyOwner(collectionId, userId))) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const existing = await prisma.collectionTagGroup.findUnique({
    where: { collectionId_groupId: { collectionId, groupId } },
  });
  if (!existing) return NextResponse.json({ error: "Zuweisung nicht gefunden." }, { status: 404 });

  const updated = await prisma.collectionTagGroup.update({
    where: { collectionId_groupId: { collectionId, groupId } },
    data: { showInView: !existing.showInView },
    include: { group: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: collectionId, groupId } = await params;
  if (!(await verifyOwner(collectionId, userId))) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  await prisma.collectionTagGroup.delete({
    where: { collectionId_groupId: { collectionId, groupId } },
  });
  return NextResponse.json({ success: true });
}
