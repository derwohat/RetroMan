import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const groups = await prisma.tagGroup.findMany({
    where: {
      OR: [
        { isSystem: true },
        { userId },
      ],
    },
    orderBy: { order: "asc" },
    include: {
      values: {
        where: q ? { value: { contains: q, mode: "insensitive" } } : {},
        orderBy: { order: "asc" },
      },
    },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });

  // Soft unique check: no duplicate name per user
  const existing = await prisma.tagGroup.findFirst({
    where: { userId, name: { equals: name.trim(), mode: "insensitive" } },
  });
  if (existing) return NextResponse.json({ error: "Eine Tag-Gruppe mit diesem Namen existiert bereits." }, { status: 409 });

  const count = await prisma.tagGroup.count({ where: { userId } });
  const group = await prisma.tagGroup.create({
    data: { name: name.trim(), userId, order: count, ...(color ? { color } : {}) },
    include: { values: true },
  });
  return NextResponse.json(group, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { order } = await req.json() as { order: string[] };

  const systemGroups = await prisma.tagGroup.findMany({ where: { isSystem: true }, select: { id: true } });
  const systemIds = new Set(systemGroups.map((g) => g.id));

  let userIdx = 1;
  await Promise.all(
    order.map((id) => {
      if (systemIds.has(id)) return prisma.tagGroup.update({ where: { id }, data: { order: 0 } });
      return prisma.tagGroup.update({ where: { id, userId }, data: { order: userIdx++ } });
    })
  );
  return NextResponse.json({ ok: true });
}
