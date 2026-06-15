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

export async function GET() {
  const denied = await checkAdmin();
  if (denied) return denied;

  try {
    const collections = await prisma.collection.findMany({
      include: {
        category: { select: { id: true, name: true, icon: true, mediaType: true } },
        _count: { select: { items: true } },
      },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(collections);
  } catch {
    return NextResponse.json({ error: "Datenbankfehler." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { name, categoryId } = await req.json();
  if (!name?.trim() || !categoryId) {
    return NextResponse.json({ error: "Name und Kategorie erforderlich." }, { status: 400 });
  }

  try {
    const count = await prisma.collection.count();
    const collection = await prisma.collection.create({
      data: { name: name.trim(), categoryId, order: count },
      include: {
        category: { select: { id: true, name: true, icon: true, mediaType: true } },
        _count: { select: { items: true } },
      },
    });
    return NextResponse.json(collection, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/admin/collections]", msg);
    return NextResponse.json({ error: "Fehler beim Erstellen der Sammlung." }, { status: 500 });
  }
}
