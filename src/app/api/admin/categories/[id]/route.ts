import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

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
  const { fields: _fields, ...data } = body;
  const category = await prisma.category.update({ where: { id }, data });
  return NextResponse.json(category);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { id } = await params;
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
