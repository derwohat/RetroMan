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
    const categories = await prisma.category.findMany({
      include: {
        fields: { orderBy: { order: "asc" } },
        tagGroups: { include: { group: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "Datenbankfehler." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { name, icon, mediaType, customMediaTypeLabel } = await req.json();
  if (!name || !mediaType) {
    return NextResponse.json({ error: "Name und Medientyp erforderlich." }, { status: 400 });
  }

  try {
    const count = await prisma.category.count();
    const category = await prisma.category.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { name, icon: icon || null, mediaType: mediaType as any, order: count, customMediaTypeLabel: customMediaTypeLabel || null },
      include: {
        fields: { orderBy: { order: "asc" } },
        tagGroups: { include: { group: true }, orderBy: { createdAt: "asc" } },
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "Eine Kategorie mit diesem Namen existiert bereits." }, { status: 409 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/admin/categories]", msg);
    const body = process.env.NODE_ENV !== "production"
      ? { error: msg }
      : { error: "Fehler beim Erstellen der Kategorie." };
    return NextResponse.json(body, { status: 500 });
  }
}
