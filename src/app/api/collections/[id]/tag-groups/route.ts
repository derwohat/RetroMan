import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: collectionId } = await params;

  const collection = await prisma.collection.findUnique({ where: { id: collectionId }, select: { userId: true } });
  if (!collection || collection.userId !== userId) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const { groupId } = await req.json();
  if (!groupId) return NextResponse.json({ error: "groupId erforderlich." }, { status: 400 });

  const assignment = await prisma.collectionTagGroup.create({
    data: { collectionId, groupId, showInView: false },
    include: { group: true },
  });
  return NextResponse.json(assignment, { status: 201 });
}
