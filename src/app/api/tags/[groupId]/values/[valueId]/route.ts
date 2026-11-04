import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { renameOrMergeValue } from "@/lib/tags/linkedField";
import { renameAnswer } from "@/lib/tags/renameResponse";

type Params = { params: Promise<{ groupId: string; valueId: string }> };

async function verifyOwner(groupId: string, userId: string): Promise<boolean> {
  const group = await prisma.tagGroup.findUnique({
    where: { id: groupId },
    select: { userId: true, isSystem: true },
  });
  return !!(group && !group.isSystem && group.userId === userId);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, valueId } = await params;
  if (!(await verifyOwner(groupId, userId))) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const { value, confirmMerge } = await req.json();
  if (!value?.trim()) return NextResponse.json({ error: "Wert erforderlich." }, { status: 400 });

  // Same two rules as the admin route, through the same function — a second
  // copy is how one of the two ends up without the merge.
  try {
    const result = await prisma.$transaction((tx) =>
      renameOrMergeValue(tx, groupId, valueId, value.trim(), confirmMerge === true),
    );
    return renameAnswer(result);
  } catch (err) {
    console.error("Umbenennen fehlgeschlagen:", err);
    return NextResponse.json(
      { error: "Umbenennen fehlgeschlagen, nichts geändert." },
      { status: 500 },
    );
  }
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
