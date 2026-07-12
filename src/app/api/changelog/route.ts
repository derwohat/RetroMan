import { NextResponse } from "next/server";
import { getUserId } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { CHANGELOG, CURRENT_VERSION } from "@/data/changelog";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { lastSeenChangelog: true } });
  const lastSeenVersion = user?.lastSeenChangelog ?? null;
  const seen = lastSeenVersion === CURRENT_VERSION;

  return NextResponse.json({ entries: CHANGELOG, currentVersion: CURRENT_VERSION, seen, lastSeenVersion });
}
