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

export async function GET() {
  const denied = await checkAdmin();
  if (denied) return denied;
  const groups = await prisma.tagGroup.findMany({
    orderBy: { order: "asc" },
    include: { values: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
  const count = await prisma.tagGroup.count();
  const group = await prisma.tagGroup.create({
    data: { name: name.trim(), order: count },
    include: { values: true },
  });
  return NextResponse.json(group, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { order } = await req.json() as { order: string[] };
  await Promise.all(
    order.map((id, idx) => prisma.tagGroup.update({ where: { id }, data: { order: idx } }))
  );
  return NextResponse.json({ ok: true });
}
