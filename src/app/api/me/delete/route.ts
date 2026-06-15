import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { password } = await req.json();
  if (!password) return NextResponse.json({ error: "Passwort erforderlich." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });

  const valid = await bcrypt.compare(password as string, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Falsches Passwort." }, { status: 400 });

  // Soft delete
  await prisma.user.update({
    where: { id: session.user.id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
