import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

async function checkAdmin(): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== "production") return null;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { name, categoryId } = await req.json();

  try {
    const data: Record<string, unknown> = {};
    if (name?.trim()) data.name = name.trim();
    if (categoryId) data.categoryId = categoryId;

    const collection = await prisma.collection.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, icon: true, mediaType: true } },
        _count: { select: { items: true } },
      },
    });
    return NextResponse.json(collection);
  } catch {
    return NextResponse.json({ error: "Fehler beim Aktualisieren." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { id } = await params;
  try {
    await prisma.collection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Fehler beim Löschen." }, { status: 500 });
  }
}
