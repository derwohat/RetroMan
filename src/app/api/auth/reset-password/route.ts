import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { consumeResetToken } from "@/lib/passwordReset";
import { mailIsConfigured } from "@/lib/mailer";

// Codebook docs/security.md: the confirming endpoint is rate-limited too, not
// just the request — otherwise tokens can be guessed at full speed.
const CONFIRM_LIMIT = 10;
const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request): Promise<NextResponse> {
  if (!mailIsConfigured()) {
    return NextResponse.json({ error: "NotAvailable" }, { status: 404 });
  }

  const forwardedFor = (await headers()).get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(`pwreset:confirm:${ip}`, CONFIRM_LIMIT);
  if (!ok) {
    return NextResponse.json({ error: "RateLimited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "PasswordTooShort" }, { status: 400 });
  }

  // One answer for unknown, already used and expired alike — the caller
  // cannot tell them apart, and does not need to.
  const userId = await consumeResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "InvalidToken" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
      // Ends every session opened before this moment: the jwt callback
      // compares this stamp against the one inside each token. Without it the
      // reset would leave an attacker's existing session running.
      passwordChangedAt: new Date(),
    },
  });

  return NextResponse.json({ done: true });
}
