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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { id: categoryId, groupId } = await params;

  const existing = await prisma.categoryTagGroup.findUnique({
    where: { categoryId_groupId: { categoryId, groupId } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Zuweisung nicht gefunden." }, { status: 404 });
  }

  const updated = await prisma.categoryTagGroup.update({
    where: { categoryId_groupId: { categoryId, groupId } },
    data: { showInView: !existing.showInView },
    include: { group: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { id: categoryId, groupId } = await params;

  await prisma.categoryTagGroup.delete({
    where: { categoryId_groupId: { categoryId, groupId } },
  });

  return NextResponse.json({ success: true });
}
