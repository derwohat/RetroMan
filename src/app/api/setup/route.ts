import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ needsSetup: count === 0 });
}

export async function POST(req: Request) {
  const count = await prisma.user.count();
  if (count > 0) {
    return NextResponse.json({ error: "Setup already completed." }, { status: 403 });
  }

  const body = await req.json();
  const { username, email, name, password } = body as {
    username?: string; email?: string; name?: string; password?: string;
  };

  if (!username?.trim() || !email?.trim() || !name?.trim() || !password) {
    return NextResponse.json({ error: "Benutzername, E-Mail, Name und Passwort sind erforderlich." }, { status: 400 });
  }
  const normalizedUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,32}$/.test(normalizedUsername)) {
    return NextResponse.json({
      error: "Benutzername muss 3-32 Zeichen lang sein und darf nur Kleinbuchstaben, Ziffern, '_', '.' und '-' enthalten.",
    }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Das Passwort muss mindestens 8 Zeichen haben." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      username: normalizedUsername,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      passwordHash,
      role: "ADMIN",
      mustChangePassword: false,
    },
    select: { id: true, username: true, email: true, name: true, role: true },
  });

  return NextResponse.json(user, { status: 201 });
}
