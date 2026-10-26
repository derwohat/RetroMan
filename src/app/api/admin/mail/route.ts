import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { authBypassEnabled } from "@/lib/auth/devBypass";
import { mailState } from "@/lib/mailer";

const HISTORY_LIMIT = 20;

async function requireAdmin(): Promise<NextResponse | null> {
  if (authBypassEnabled()) return null;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Signed in but not permitted is 403, never 401 — a 401 reads as an
  // expired session and sends the browser to the sign-in page.
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * The state the application sends with, plus the recent attempts. Admin-only:
 * the history holds recipient addresses, and the error text can name internal
 * hosts.
 */
export async function GET(): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied) return denied;

  const attempts = await prisma.mailAttempt.findMany({
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: {
      id: true,
      createdAt: true,
      recipient: true,
      trigger: true,
      status: true,
      error: true,
    },
  });

  return NextResponse.json({ state: mailState(), attempts });
}
