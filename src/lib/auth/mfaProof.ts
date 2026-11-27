import { createHmac, timingSafeEqual } from "node:crypto";

// SECURITY: the proof that a TOTP code was checked on the server.
//
// A session is a JWT the browser can ask to update. Whatever the browser sends
// in that update must never decide on its own that the second factor is done —
// before this existed the client simply sent `mfaPending: false`, so the
// password alone was enough. The only thing that may lift the pending state is
// a value only the server can produce, and the server produces it exactly once:
// after /api/auth/mfa/verify has checked a valid code.
//
// The proof is an HMAC over the user and the session id, keyed from the
// server secret. It cannot be forged without the secret, and it is useless in
// any other session, because the session id is part of what it signs.

const PROOF_CONTEXT = "retroman:mfa-proof:v1";

function proofKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET env var missing — cannot sign the MFA proof");
  }
  return Buffer.from(secret, "utf8");
}

function sign(userId: string, sessionId: string): Buffer {
  // The fields are joined with a separator that cannot occur in an id, so
  // ("ab", "c") and ("a", "bc") never sign to the same value.
  return createHmac("sha256", proofKey())
    .update(`${PROOF_CONTEXT}\n${userId}\n${sessionId}`)
    .digest();
}

/** Issue the proof for one session. Call only after a TOTP code was verified. */
export function issueMfaProof(userId: string, sessionId: string): string {
  return sign(userId, sessionId).toString("hex");
}

/** True only for a proof this server issued for exactly this user and session. */
export function verifyMfaProof(proof: unknown, userId: string, sessionId: string): boolean {
  if (typeof proof !== "string" || userId === "" || sessionId === "") return false;
  const expected = sign(userId, sessionId);
  // Length is checked on the text as well: Buffer.from(…, "hex") silently stops
  // at the first non-hex character, so trailing junk would otherwise decode to
  // the right bytes. A wrong length must not reach timingSafeEqual either,
  // which throws on unequal lengths.
  if (proof.length !== expected.length * 2) return false;
  const given = Buffer.from(proof, "hex");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}
