import { NextResponse } from "next/server";
import { verifySync } from "otplib";
import { prisma } from "@/lib/db/prisma";
import { checkCodeAttempt, type AttemptStore, type CodeOutcome } from "@/lib/auth/lockout";

// Seconds either side of now that still count, as the three routes used before.
const CODE_EPOCH_TOLERANCE = 30;
const CODE_FORMAT = /^\d{6}$/;
const SECONDS_PER_MINUTE = 60;

const prismaStore: AttemptStore = {
  async load(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });
    return user ? { failedAttempts: user.failedLoginAttempts, lockedUntil: user.lockedUntil } : null;
  },
  async save(userId, state) {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: state.failedAttempts, lockedUntil: state.lockedUntil },
    });
  },
};

/**
 * Checks an authenticator code for an account under the lockout rules. `token`
 * comes straight from the request body, so it is not trusted to be a string
 * at all; anything that is not six digits is simply a wrong code, and counts
 * like one.
 */
export function checkTotp(userId: string, token: unknown, secret: string): Promise<CodeOutcome> {
  const isValid = (): boolean =>
    typeof token === "string" &&
    CODE_FORMAT.test(token) &&
    verifySync({ token, secret, epochTolerance: CODE_EPOCH_TOLERANCE }).valid;
  return checkCodeAttempt(userId, prismaStore, isValid);
}

/**
 * The reply for a code that did not pass, or null when it did. A lock — one
 * that was already in force or one this very failure started — answers 429
 * with the wait; a plain wrong code answers 400 with the route's own wording.
 */
export function codeRejection(outcome: CodeOutcome, invalidMessage: string): NextResponse | null {
  if (outcome.status === "valid") return null;
  if (outcome.retryAfterSecs > 0) return lockedResponse(outcome.retryAfterSecs);
  return NextResponse.json({ error: invalidMessage }, { status: 400 });
}

function lockedResponse(retryAfterSecs: number): NextResponse {
  const minutes = Math.max(1, Math.ceil(retryAfterSecs / SECONDS_PER_MINUTE));
  return NextResponse.json(
    {
      error: `Zu viele falsche Codes. Das Konto ist vorübergehend gesperrt — bitte in ${minutes} ${
        minutes === 1 ? "Minute" : "Minuten"
      } erneut versuchen.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSecs) } },
  );
}
