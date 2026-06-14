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
  { params }: { params: Promise<{ id: string; fieldId: string }> },
) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { fieldId } = await params;
  const body = await req.json();
  const field = await prisma.categoryField.update({ where: { id: fieldId }, data: body });
  return NextResponse.json(field);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> },
) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { fieldId } = await params;
  await prisma.categoryField.delete({ where: { id: fieldId } });
  return NextResponse.json({ success: true });
}
