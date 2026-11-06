import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { refuseUnlessShared } from "@/lib/tags/sharedGroup";
import { isLinkableItemField } from "@/lib/tags/linkedField";
import { authBypassEnabled } from "@/lib/auth/devBypass";

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

type Params = { params: Promise<{ groupId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId } = await params;
  const notShared = await refuseUnlessShared(groupId);
  if (notShared) return notShared;
  const existing = await prisma.tagGroup.findUnique({ where: { id: groupId } });
  if (existing?.isSystem) return NextResponse.json({ error: "System-Gruppen können nicht umbenannt werden." }, { status: 403 });
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
  const group = await prisma.tagGroup.update({
    where: { id: groupId },
    data: { name: name.trim() },
    include: { values: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(group);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId } = await params;
  const notShared = await refuseUnlessShared(groupId);
  if (notShared) return notShared;
  const body = await req.json();
  if (!body.color && body.linkedField === undefined)
    return NextResponse.json({ error: "Kein Feld zum Aktualisieren." }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (body.color) data.color = body.color;
  if (body.linkedField !== undefined) {
    // Checked here, not only where it is read: the value becomes a column
    // name when a list value is renamed, so an unknown one is refused on the
    // way in instead of being stored and tripped over later.
    if (body.linkedField && !isLinkableItemField(body.linkedField)) {
      return NextResponse.json({ error: "Unbekanntes verknüpftes Feld." }, { status: 400 });
    }
    data.linkedField = body.linkedField || null;
  }
  const group = await prisma.tagGroup.update({ where: { id: groupId }, data });
  return NextResponse.json(group);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId } = await params;
  const notShared = await refuseUnlessShared(groupId);
  if (notShared) return notShared;
  const existing = await prisma.tagGroup.findUnique({ where: { id: groupId } });
  if (existing?.isSystem) return NextResponse.json({ error: "System-Gruppen können nicht gelöscht werden." }, { status: 403 });
  await prisma.tagGroup.delete({ where: { id: groupId } });
  return NextResponse.json({ ok: true });
}
