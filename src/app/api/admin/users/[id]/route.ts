import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { randomBytes } from "crypto";
import { authBypassEnabled } from "@/lib/auth/devBypass";
import { actingUserId, guardRoleOrStatusChange } from "@/lib/auth/adminGuards";

function genPassword() {
  return randomBytes(8).toString("base64url").slice(0, 12);
}

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();

  if (body.action === "reset-password") {
    const tempPassword = genPassword();
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true },
    });
    return NextResponse.json({ tempPassword });
  }

  if (body.action === "toggle-active") {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    const nextActive = user.deletedAt !== null;
    const refused = await guardRoleOrStatusChange(id, { nextActive });
    if (refused) return NextResponse.json({ error: refused.error }, { status: refused.status });
    await prisma.user.update({
      where: { id },
      data: { deletedAt: nextActive ? null : new Date() },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "change-role") {
    // The role arrived unchecked and was written straight through — an
    // administrator could demote themselves or the last admin with one call,
    // and then nobody could put it back. Same allow-list reasoning as for the
    // linked field: a value that becomes authority must be validated.
    if (body.role !== "USER" && body.role !== "ADMIN") {
      return NextResponse.json({ error: "Unbekannte Rolle." }, { status: 400 });
    }
    const refused = await guardRoleOrStatusChange(id, { nextRole: body.role });
    if (refused) return NextResponse.json({ error: refused.error }, { status: refused.status });
    await prisma.user.update({ where: { id }, data: { role: body.role } });
    return NextResponse.json({ success: true });
  }

  // Codebook docs/user-management.md, point 2: an administrator can lift an
  // account lockout early instead of waiting out the backoff window.
  if (body.action === "unlock") {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { lockedUntil: true, failedLoginAttempts: true },
    });
    if (!user) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    await prisma.user.update({
      where: { id },
      data: { lockedUntil: null, failedLoginAttempts: 0 },
    });
    console.info(`[admin] Sperre aufgehoben für Konto ${id}`);
    return NextResponse.json({ success: true });
  }

  // Point 3: end every session of an account without changing anything else.
  // RetroMan carries JWT sessions, so there is no session table to clear —
  // the jwt callback compares passwordChangedAt against the stamp in the
  // token on every request, so moving that value forward drops all of them
  // at once.
  if (body.action === "revoke-sessions") {
    const actorId = await actingUserId();
    if (actorId && actorId === id) {
      return NextResponse.json(
        { error: "Für das eigene Konto gibt es „Abmelden“." },
        { status: 409 },
      );
    }
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    await prisma.user.update({ where: { id }, data: { passwordChangedAt: new Date() } });
    console.info(`[admin] Alle Sitzungen beendet für Konto ${id}`);
    return NextResponse.json({ success: true });
  }

  if (body.action === "disable-mfa") {
    await prisma.user.update({ where: { id }, data: { mfaEnabled: false, mfaSecret: null } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { id } = await params;
  // Deleting is the hardest form of "no longer active", so it goes through
  // the same two guards: never your own account, and never the last active
  // administrator.
  const refused = await guardRoleOrStatusChange(id, { removing: true });
  if (refused) return NextResponse.json({ error: refused.error }, { status: refused.status });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
