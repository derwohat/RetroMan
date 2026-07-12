import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { Prisma, FieldType } from "@/generated/prisma/client";

const ALLOWED_FIELD_TYPES = ["TEXT", "TEXTAREA", "NUMBER", "DATE", "SELECT", "BOOLEAN"];

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: collectionId } = await params;

  const collection = await prisma.collection.findUnique({ where: { id: collectionId }, select: { userId: true } });
  if (!collection || collection.userId !== userId) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Ungültiges JSON." }, { status: 400 });
  }

  const { name, fieldKey, fieldType, options, required } = body as Record<string, unknown>;

  if (!name || typeof name !== "string" || name.trim().length === 0)
    return NextResponse.json({ error: "Feldname erforderlich." }, { status: 400 });
  if (!fieldKey || typeof fieldKey !== "string" || !/^[a-z][a-z0-9_]{0,49}$/.test(fieldKey))
    return NextResponse.json({ error: "Feld-Key: nur Kleinbuchstaben, Ziffern und _ erlaubt (max. 50 Zeichen)." }, { status: 400 });
  if (!fieldType || !ALLOWED_FIELD_TYPES.includes(fieldType as string))
    return NextResponse.json({ error: "Ungültiger Feldtyp." }, { status: 400 });

  try {
    const count = await prisma.collectionField.count({ where: { collectionId } });
    const field = await prisma.collectionField.create({
      data: {
        collectionId,
        name: name.trim(),
        fieldKey: (fieldKey as string).trim().toLowerCase(),
        fieldType: fieldType as FieldType,
        options: Array.isArray(options) ? (options as string[]).map((o) => String(o).trim()).filter(Boolean) : [],
        required: required === true,
        order: count,
      },
    });
    return NextResponse.json(field, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: `Feld-Key „${fieldKey}" existiert bereits.` }, { status: 409 });
    }
    return NextResponse.json({ error: "Datenbankfehler." }, { status: 500 });
  }
}
