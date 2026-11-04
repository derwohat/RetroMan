import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

// Man-Suite Codebook docs/security.md, "Passwort-vergessen-Flow, dreistufig",
// Baustein 1: the token is stored hashed, expires after an hour, and works
// exactly once.
const TOKEN_TTL_MS = 60 * 60_000;
const TOKEN_BYTES = 32;

/**
 * An invitation is the same token with a longer life — Codebook
 * docs/user-management.md, point 4: the invited person sets their own password
 * on first visit, and the admin never sees one. Seven days, because an
 * invitation often waits for someone's next working day; a reset link is
 * answered within the hour or not at all.
 */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60_000;

// SHA-256 rather than bcrypt: this is 256 bits of CSPRNG output, not a
// human-chosen secret, so there is nothing to brute-force and no reason to pay
// a KDF's cost on every request. Hashing at all is what matters — a leaked
// database must not hand out working reset links.
function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Issues a fresh token and invalidates every other outstanding one for this
 * user — otherwise an older link, possibly already in the wrong hands, keeps
 * working alongside the new one.
 */
export async function createResetToken(
  userId: string,
  ttlMs: number = TOKEN_TTL_MS,
): Promise<string> {
  const raw = randomBytes(TOKEN_BYTES).toString("base64url");

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    }),
  ]);

  return raw;
}

/**
 * Validates and burns a token in one step. Returns the user it belonged to, or
 * null for anything not currently redeemable — unknown, already used, expired.
 * The caller cannot tell those apart, and does not need to.
 */
export async function consumeResetToken(raw: string): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });
  if (!record || record.usedAt || record.expiresAt <= new Date()) return null;

  // Conditional update rather than a plain one: two requests carrying the same
  // token would both pass the check above, and only one may win.
  const burned = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (burned.count === 0) return null;

  return record.userId;
}
