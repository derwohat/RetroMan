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

  const { id: collectionId, groupId } = await params;

  const existing = await prisma.collectionTagGroup.findUnique({
    where: { collectionId_groupId: { collectionId, groupId } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Zuweisung nicht gefunden." }, { status: 404 });
  }

  const updated = await prisma.collectionTagGroup.update({
    where: { collectionId_groupId: { collectionId, groupId } },
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

  const { id: collectionId, groupId } = await params;

  await prisma.collectionTagGroup.delete({
    where: { collectionId_groupId: { collectionId, groupId } },
  });

  return NextResponse.json({ success: true });
}
