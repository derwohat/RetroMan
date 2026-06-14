import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

async function checkAdmin(): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== "production") return null;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

type Params = { params: Promise<{ groupId: string; valueId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId, valueId } = await params;
  const { value } = await req.json();
  if (!value?.trim()) return NextResponse.json({ error: "Wert erforderlich." }, { status: 400 });
  const updated = await prisma.tagValue.update({
    where: { id: valueId, groupId },
    data: { value: value.trim() },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId, valueId } = await params;
  await prisma.tagValue.delete({ where: { id: valueId, groupId } });
  return NextResponse.json({ ok: true });
}
