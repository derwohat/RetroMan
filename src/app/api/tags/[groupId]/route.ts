import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ groupId: string }> };

async function verifyOwner(groupId: string, userId: string): Promise<boolean> {
  const group = await prisma.tagGroup.findUnique({ where: { id: groupId }, select: { userId: true, isSystem: true } });
  if (!group || group.isSystem) return false;
  return group.userId === userId;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  if (!(await verifyOwner(groupId, userId))) {
    return NextResponse.json({ error: "Nicht gefunden oder keine Berechtigung." }, { status: 404 });
  }

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });

  const group = await prisma.tagGroup.update({
    where: { id: groupId },
    data: { name: name.trim() },
    include: { values: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(group);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  if (!(await verifyOwner(groupId, userId))) {
    return NextResponse.json({ error: "Nicht gefunden oder keine Berechtigung." }, { status: 404 });
  }

  const body = await req.json();
  if (!body.color && body.linkedField === undefined)
    return NextResponse.json({ error: "Kein Feld zum Aktualisieren." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.color) data.color = body.color;
  if (body.linkedField !== undefined) data.linkedField = body.linkedField || null;

  const group = await prisma.tagGroup.update({ where: { id: groupId }, data });
  return NextResponse.json(group);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  if (!(await verifyOwner(groupId, userId))) {
    return NextResponse.json({ error: "Nicht gefunden oder keine Berechtigung." }, { status: 404 });
  }

  await prisma.tagGroup.delete({ where: { id: groupId } });
  return NextResponse.json({ ok: true });
}
