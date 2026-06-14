import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

function genPassword() {
  return randomBytes(8).toString("base64url").slice(0, 12);
}

async function checkAdmin(): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== "production") return null;
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
      id: true, name: true, email: true, role: true,
      mustChangePassword: true, mfaEnabled: true,
      deletedAt: true, createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { name, email, role } = await req.json();
  if (!name || !email) {
    return NextResponse.json({ error: "Name und E-Mail erforderlich." }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "E-Mail bereits vergeben." }, { status: 409 });
  }

  const tempPassword = genPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      name, email, passwordHash,
      role: role === "ADMIN" ? "ADMIN" : "USER",
      mustChangePassword: true,
    },
    select: {
      id: true, name: true, email: true, role: true,
      mustChangePassword: true, createdAt: true,
    },
  });

  return NextResponse.json({ user, tempPassword }, { status: 201 });
}
