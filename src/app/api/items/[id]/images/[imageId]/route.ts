import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? "/app/uploads"
    : join(process.cwd(), "public", "uploads");

async function deleteUploadFile(url: string) {
  if (!url.startsWith("/api/uploads/") && !url.startsWith("/uploads/")) return;
  const filename = url.split("/").pop();
  if (!filename || filename.includes("..")) return;
  const filePath = join(UPLOAD_DIR, filename);
  if (existsSync(filePath)) await unlink(filePath).catch(() => {});
}

async function getUserId(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    const user = await prisma.user.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return user?.id ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, imageId } = await params;

  const image = await prisma.itemImage.findFirst({
    where: { id: imageId, item: { id, userId } },
  });
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteUploadFile(image.url ?? image.filePath ?? "");
  await prisma.itemImage.delete({ where: { id: imageId } });

  return NextResponse.json({ success: true });
}
