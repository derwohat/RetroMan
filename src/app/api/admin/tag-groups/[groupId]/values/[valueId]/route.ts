import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { authBypassEnabled } from "@/lib/auth/devBypass";
import { renameOrMergeValue } from "@/lib/tags/linkedField";
import { renameAnswer } from "@/lib/tags/renameResponse";

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

type Params = { params: Promise<{ groupId: string; valueId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId, valueId } = await params;
  const { value, confirmMerge } = await req.json();
  if (!value?.trim()) return NextResponse.json({ error: "Wert erforderlich." }, { status: 400 });

  // One transaction, because the list entry and the records that carry it as
  // text have to move together. Renaming only the entry left the list saying
  // one thing and the records another, with no way back to a single value.
  // Codebook docs/data-standards.md, rules 1 and 2.
  try {
    const result = await prisma.$transaction((tx) =>
      renameOrMergeValue(tx, groupId, valueId, value.trim(), confirmMerge === true),
    );
    return renameAnswer(result);
  } catch (err) {
    // Nothing was written: the transaction rolled back, so the list entry and
    // the records are still in step. Say so instead of a bare 500.
    console.error("Umbenennen fehlgeschlagen:", err);
    return NextResponse.json(
      { error: "Umbenennen fehlgeschlagen, nichts geändert." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId, valueId } = await params;
  await prisma.tagValue.delete({ where: { id: valueId, groupId } });
  return NextResponse.json({ ok: true });
}
