import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ groupId: string; valueId: string }> };

async function verifyOwner(groupId: string, userId: string): Promise<boolean> {
  const group = await prisma.tagGroup.findUnique({ where: { id: groupId }, select: { userId: true, isSystem: true } });
  return !!(group && !group.isSystem && group.userId === userId);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, valueId } = await params;
  if (!(await verifyOwner(groupId, userId))) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const { value } = await req.json();
  if (!value?.trim()) return NextResponse.json({ error: "Wert erforderlich." }, { status: 400 });

  const updated = await prisma.tagValue.update({
    where: { id: valueId, groupId },
    data: { value: value.trim() },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, valueId } = await params;
  if (!(await verifyOwner(groupId, userId))) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  await prisma.tagValue.delete({ where: { id: valueId, groupId } });
  return NextResponse.json({ ok: true });
}
