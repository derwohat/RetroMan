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

type Params = { params: Promise<{ groupId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId } = await params;
  const { value } = await req.json();
  if (!value?.trim()) return NextResponse.json({ error: "Wert erforderlich." }, { status: 400 });
  const count = await prisma.tagValue.count({ where: { groupId } });
  const tagValue = await prisma.tagValue.create({
    data: { groupId, value: value.trim(), order: count },
  });
  return NextResponse.json(tagValue, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId } = await params;
  const { order } = await req.json() as { order: string[] };
  await Promise.all(
    order.map((id, idx) =>
      prisma.tagValue.update({ where: { id, groupId }, data: { order: idx } })
    )
  );
  return NextResponse.json({ ok: true });
}
