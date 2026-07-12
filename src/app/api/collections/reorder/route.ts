import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json() as { ids: string[] };
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: "ids muss ein Array sein." }, { status: 400 });
  }

  // Only reorder collections owned by this user
  const owned = await prisma.collection.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((c) => c.id));

  await prisma.$transaction(
    ids
      .filter((id) => ownedIds.has(id))
      .map((id, order) => prisma.collection.update({ where: { id }, data: { order } }))
  );

  return NextResponse.json({ success: true });
}
