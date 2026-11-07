import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

/** Far more than any real collection list; bounds the transaction size. */
const MAX_IDS = 500;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // External input: the body is whatever the browser sent, so check its shape
  // before any of it reaches the database.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (
    !Array.isArray(ids) ||
    ids.length > MAX_IDS ||
    !ids.every((id): id is string => typeof id === "string")
  ) {
    return NextResponse.json({ error: "ids muss eine Liste von Sammlungs-IDs sein." }, { status: 400 });
  }
  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "Eine Sammlung steht doppelt in der Liste." }, { status: 400 });
  }

  try {
    // Security: collections belong to one user, so only one's own are
    // ordered. The list is taken only as a whole — one that misses a
    // collection would leave two of them on the same number, and the database
    // would then pick their order. A list from a stale tab is refused the same
    // way. (This hardening lived in the admin route until that copy was
    // removed; the old version here filtered silently instead.)
    const owned = await prisma.collection.findMany({ where: { userId }, select: { id: true } });
    const ownedIds = new Set(owned.map((c) => c.id));
    if (ids.length !== ownedIds.size || !ids.every((id) => ownedIds.has(id))) {
      return NextResponse.json(
        { error: "Die Sammlungen haben sich inzwischen geändert. Bitte die Seite neu laden." },
        { status: 409 },
      );
    }

    await prisma.$transaction(
      ids.map((id, order) => prisma.collection.update({ where: { id }, data: { order } })),
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[collections/reorder] Speichern der Reihenfolge fehlgeschlagen:", error);
    return NextResponse.json({ error: "Datenbankfehler." }, { status: 500 });
  }
}
