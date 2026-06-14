import { NextRequest, NextResponse } from "next/server";
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

// Returns all tag groups with their values (for use in item forms).
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const groups = await prisma.tagGroup.findMany({
    orderBy: { order: "asc" },
    include: {
      values: {
        where: q ? { value: { contains: q, mode: "insensitive" } } : {},
        orderBy: { order: "asc" },
      },
    },
  });
  return NextResponse.json(groups);
}
