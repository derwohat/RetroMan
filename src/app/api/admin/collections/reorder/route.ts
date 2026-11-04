import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { authBypassEnabled } from "@/lib/auth/devBypass";

/** Far more than any real collection list; bounds the transaction size. */
const MAX_IDS = 500;

async function checkAdmin(): Promise<NextResponse | null> {
  if (authBypassEnabled()) return null;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Signed in but not permitted is 403, never 401 — a 401 reads as an
  // expired session and sends the browser to the sign-in page.
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await checkAdmin();
  if (denied) return denied;
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
    // Security: collections belong to one user. This route used to write the
    // order onto any id it was sent, another user's collection included.
    // It also takes the list only as a whole — one that misses a collection
    // would leave two of them on the same number, and the database would then
    // pick their order. A list from a stale tab is refused the same way.
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
