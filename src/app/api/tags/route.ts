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
      // Shared groups (no owner: system ones and those an admin created
      // under Einstellungen → Tags) plus one's own. Matching isSystem alone
      // left admin-created groups invisible to everyone.
      OR: [
        { userId: null },
        { userId },
      ],
    },
    // createdAt as a second key: with equal "order" the database is free to
    // return either sequence, and it may differ between two requests — the
    // list then appears to shuffle on its own.
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      values: {
        where: q ? { value: { contains: q, mode: "insensitive" } } : {},
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
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

  const { order } = await req.json() as { order: unknown };
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "order muss eine Liste sein." }, { status: 400 });
  }

  // Profil → Meine Tags orders one's own groups only. This used to set the
  // shared system groups to 0 as well — a write to everyone's data from
  // anyone's profile — and a foreign id made the update throw.
  let userIdx = 1;
  await prisma.$transaction(
    order
      .filter((id): id is string => typeof id === "string")
      .map((id) => prisma.tagGroup.updateMany({ where: { id, userId }, data: { order: userIdx++ } })),
  );
  return NextResponse.json({ ok: true });
}
