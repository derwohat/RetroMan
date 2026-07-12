import { NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { CURRENT_VERSION } from "@/data/changelog";

export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: userId },
    data: { lastSeenChangelog: CURRENT_VERSION },
  });

  return NextResponse.json({ ok: true });
}
