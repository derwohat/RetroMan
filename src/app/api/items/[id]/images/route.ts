import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  const item = await prisma.item.findFirst({
    where: { id, userId },
    include: { images: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const maxOrder = item.images.reduce((max, img) => Math.max(max, img.order), 0);

  const image = await prisma.itemImage.create({
    data: { itemId: id, url, order: maxOrder + 1, isPrimary: false },
  });

  return NextResponse.json(image, { status: 201 });
}
