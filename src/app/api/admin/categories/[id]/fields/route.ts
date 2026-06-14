import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { Prisma, FieldType } from "@/generated/prisma/client";

async function checkAdmin(): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== "production") return null;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

const ALLOWED_FIELD_TYPES = ["TEXT", "TEXTAREA", "NUMBER", "DATE", "SELECT", "BOOLEAN"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { id: categoryId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }

  const { name, fieldKey, fieldType, options, required } = body as Record<string, unknown>;

  if (!name || typeof name !== "string" || name.trim().length === 0)
    return NextResponse.json({ error: "Feldname erforderlich." }, { status: 400 });
  if (!fieldKey || typeof fieldKey !== "string" || !/^[a-z][a-z0-9_]{0,49}$/.test(fieldKey))
    return NextResponse.json({ error: "Feld-Key: nur Kleinbuchstaben, Ziffern und _ erlaubt (max. 50 Zeichen)." }, { status: 400 });
  if (!fieldType || !ALLOWED_FIELD_TYPES.includes(fieldType as string))
    return NextResponse.json({ error: "Ungültiger Feldtyp." }, { status: 400 });

  // Verify category exists
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category)
    return NextResponse.json({ error: "Kategorie nicht gefunden." }, { status: 404 });

  try {
    const count = await prisma.categoryField.count({ where: { categoryId } });
    const field = await prisma.categoryField.create({
      data: {
        categoryId,
        name: name.trim(),
        fieldKey: (fieldKey as string).trim().toLowerCase(),
        fieldType: fieldType as FieldType,
        options: Array.isArray(options)
          ? (options as string[]).map((o) => String(o).trim()).filter(Boolean)
          : [],
        required: required === true,
        order: count,
      },
    });
    return NextResponse.json(field, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: `Feld-Key „${fieldKey}" existiert bereits in dieser Kategorie.` }, { status: 409 });
    }
    console.error("[fields/POST]", e);
    return NextResponse.json({ error: "Datenbankfehler beim Erstellen des Feldes." }, { status: 500 });
  }
}
