import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { authBypassEnabled } from "@/lib/auth/devBypass";

function genPassword() {
  return randomBytes(8).toString("base64url").slice(0, 12);
}

async function checkAdmin(): Promise<NextResponse | null> {
  if (authBypassEnabled()) return null;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await checkAdmin();
  if (denied) return denied;

  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, name: true, email: true, role: true,
      mustChangePassword: true, mfaEnabled: true,
      deletedAt: true, createdAt: true, lastLoginAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { username, name, email, role } = await req.json();
  if (!username || !name || !email) {
    return NextResponse.json({ error: "Benutzername, Name und E-Mail erforderlich." }, { status: 400 });
  }
  const normalizedUsername = String(username).trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,32}$/.test(normalizedUsername)) {
    return NextResponse.json({
      error: "Benutzername muss 3-32 Zeichen lang sein und darf nur Kleinbuchstaben, Ziffern, '_', '.' und '-' enthalten.",
    }, { status: 400 });
  }

  const existingUsername = await prisma.user.findFirst({ where: { username: normalizedUsername } });
  if (existingUsername) {
    return NextResponse.json({ error: "Benutzername bereits vergeben." }, { status: 409 });
  }
  const existingEmail = await prisma.user.findFirst({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "E-Mail bereits vergeben." }, { status: 409 });
  }

  const tempPassword = genPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      username: normalizedUsername, name, email, passwordHash,
      role: role === "ADMIN" ? "ADMIN" : "USER",
      mustChangePassword: true,
    },
    select: {
      id: true, username: true, name: true, email: true, role: true,
      mustChangePassword: true, createdAt: true,
    },
  });

  return NextResponse.json({ user, tempPassword }, { status: 201 });
}
