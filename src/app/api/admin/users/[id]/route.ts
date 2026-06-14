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
      data: { passwordHash: await bcrypt.hash(tempPassword, 12), mustChangePassword: true },
    });
    return NextResponse.json({ tempPassword });
  }

  if (body.action === "toggle-active") {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    await prisma.user.update({
      where: { id },
      data: { deletedAt: user.deletedAt ? null : new Date() },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "change-role") {
    await prisma.user.update({ where: { id }, data: { role: body.role } });
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
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
