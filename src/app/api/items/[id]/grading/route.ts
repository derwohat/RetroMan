import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
async function getUserId(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    const user = await prisma.user.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
    return user?.id ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.item.findFirst({ where: { id, userId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { service, score, gradedAt } = body as { service?: string; score?: string; gradedAt?: string | null };

  if (!service || !score) {
    return NextResponse.json({ error: "Service und Score sind erforderlich." }, { status: 400 });
  }

  const grading = await prisma.gradingInfo.upsert({
    where: { itemId: id },
    create: {
      itemId: id,
      service,
      score,
      gradedAt: gradedAt ? new Date(gradedAt) : null,
    },
    update: {
      service,
      score,
      gradedAt: gradedAt ? new Date(gradedAt) : null,
    },
  });

  return NextResponse.json(grading);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.item.findFirst({ where: { id, userId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.gradingInfo.deleteMany({ where: { itemId: id } });
  return NextResponse.json({ success: true });
}
