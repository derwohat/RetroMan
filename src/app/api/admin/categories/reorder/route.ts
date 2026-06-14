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

export async function POST(req: NextRequest) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { ids } = await req.json() as { ids: string[] };
  await Promise.all(
    ids.map((id, index) => prisma.category.update({ where: { id }, data: { order: index } })),
  );
  return NextResponse.json({ success: true });
}
