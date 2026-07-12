import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ groupId: string }> };

async function verifyOwner(groupId: string, userId: string): Promise<boolean> {
  const group = await prisma.tagGroup.findUnique({ where: { id: groupId }, select: { userId: true, isSystem: true } });
  return !!(group && !group.isSystem && group.userId === userId);
}

export async function POST(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  if (!(await verifyOwner(groupId, userId))) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const { value } = await req.json();
  if (!value?.trim()) return NextResponse.json({ error: "Wert erforderlich." }, { status: 400 });

  const count = await prisma.tagValue.count({ where: { groupId } });
  const tagValue = await prisma.tagValue.create({
    data: { groupId, value: value.trim(), order: count },
  });
  return NextResponse.json(tagValue, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  if (!(await verifyOwner(groupId, userId))) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const { order } = await req.json() as { order: string[] };
  await Promise.all(
    order.map((id, idx) =>
      prisma.tagValue.update({ where: { id, groupId }, data: { order: idx } })
    )
  );
  return NextResponse.json({ ok: true });
}
