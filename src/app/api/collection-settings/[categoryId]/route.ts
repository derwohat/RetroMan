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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categoryId } = await params;

  const settings = await prisma.collectionViewSettings.findFirst({
    where: { userId, categoryId },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    viewType:    settings?.viewType    ?? "SHELF",
    visibleTags: settings?.visibleTags ?? [],
    sortBy:      settings?.sortBy      ?? "title",
    sortOrder:   settings?.sortOrder   ?? "ASC",
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categoryId } = await params;
  const body = await req.json();
  const { viewType, visibleTags, sortBy, sortOrder } = body;

  const settings = await prisma.collectionViewSettings.upsert({
    where: { userId_categoryId_viewType: { userId, categoryId, viewType } },
    create: { userId, categoryId, viewType, visibleTags, sortBy, sortOrder },
    update: { visibleTags, sortBy, sortOrder },
  });

  return NextResponse.json(settings);
}
