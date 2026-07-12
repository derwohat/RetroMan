import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string; fieldId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: collectionId, fieldId } = await params;

  const collection = await prisma.collection.findUnique({ where: { id: collectionId }, select: { userId: true } });
  if (!collection || collection.userId !== userId) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  await prisma.collectionField.delete({ where: { id: fieldId } });
  return NextResponse.json({ success: true });
}
