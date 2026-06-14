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

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json([]);

  const items = await prisma.item.findMany({
    where: {
      userId,
      title: { contains: q, mode: "insensitive" },
    },
    include: {
      category: { select: { id: true, name: true, icon: true } },
      images:  { orderBy: { order: "asc" } },
      tags:    { include: { tagValue: true, tagGroup: true } },
      customFields: { include: { field: true } },
    },
    orderBy: { title: "asc" },
    take: 100,
  });

  const results = items.map((item) => ({
    ...item,
    categoryId:   item.category.id,
    categoryName: item.category.name,
    categoryIcon: item.category.icon ?? "box",
  }));

  return NextResponse.json(results);
}
