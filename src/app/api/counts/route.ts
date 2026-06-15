import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

async function getUserId(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    const user = await prisma.user.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
    return user?.id ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [favorites, wishlist] = await Promise.all([
    prisma.item.count({ where: { userId, isFavorite: true } }),
    prisma.item.count({ where: { userId, collectionStatus: "WISHLIST" } }),
  ]);

  return NextResponse.json({ favorites, wishlist });
}
