import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const body = await req.json();
  // The forced first-change page posts `password`, the profile form posts
  // `newPassword`. Both are accepted so neither caller silently breaks.
  const newPassword: unknown = body.newPassword ?? body.password;
  const currentPassword: unknown = body.currentPassword;

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "PasswordTooShort" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, mustChangePassword: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A voluntary change must prove knowledge of the current password —
  // otherwise anyone reaching an unlocked device can lock the owner out. The
  // forced first change is exempt: that user just signed in with the very
  // password being replaced.
  if (!user.mustChangePassword) {
    if (typeof currentPassword !== "string" || !(await verifyPassword(user.passwordHash, currentPassword))) {
      return NextResponse.json({ error: "CurrentPasswordWrong" }, { status: 400 });
    }
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      // Ends every session for this account, including this one. Changing a
      // password is worth nothing if whoever knew the old one keeps their
      // open session; the caller signs in again with the new password.
      passwordChangedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, signOutRequired: true });
}
