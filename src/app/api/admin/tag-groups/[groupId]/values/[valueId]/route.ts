import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { authBypassEnabled } from "@/lib/auth/devBypass";
import { renameLinkedItemField } from "@/lib/tags/linkedField";

async function checkAdmin(): Promise<NextResponse | null> {
  if (authBypassEnabled()) return null;
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Signed in but not permitted is 403, never 401 — a 401 reads as an
  // expired session and sends the browser to the sign-in page.
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

/** Thrown inside the transaction so the rollback happens before the answer. */
class NotFoundError extends Error {}
type Params = { params: Promise<{ groupId: string; valueId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId, valueId } = await params;
  const { value } = await req.json();
  if (!value?.trim()) return NextResponse.json({ error: "Wert erforderlich." }, { status: 400 });
  const neu = value.trim();

  // One transaction, because the list entry and the records that carry it as
  // text have to move together. Renaming only the entry left the list saying
  // one thing and the records another, with no way back to a single value.
  try {
    const { updated, mitgeschrieben } = await prisma.$transaction(async (tx) => {
      const vorher = await tx.tagValue.findUnique({
        where: { id: valueId, groupId },
        select: { value: true },
      });
      if (!vorher) throw new NotFoundError();
      const updated = await tx.tagValue.update({
        where: { id: valueId, groupId },
        data: { value: neu },
      });
      const mitgeschrieben = await renameLinkedItemField(tx, groupId, vorher.value, neu);
      return { updated, mitgeschrieben };
    });
    return NextResponse.json({ ...updated, updatedItems: mitgeschrieben });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    }
    // Nothing was written: the transaction rolled back, so the list entry and
    // the records are still in step. Say so instead of a bare 500.
    console.error("Umbenennen fehlgeschlagen:", err);
    return NextResponse.json({ error: "Umbenennen fehlgeschlagen, nichts geändert." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId, valueId } = await params;
  await prisma.tagValue.delete({ where: { id: valueId, groupId } });
  return NextResponse.json({ ok: true });
}
