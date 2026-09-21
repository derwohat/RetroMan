import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { password } = await req.json();

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Passwort zu kurz." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

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
