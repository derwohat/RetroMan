import argon2 from "argon2";
import bcrypt from "bcryptjs";

/**
 * Argon2id is the suite-wide password hash (Codebook docs/security.md).
 *
 * Existing bcrypt hashes stay valid instead of forcing a mass reset: they are
 * recognised by their prefix, verified with bcrypt, and silently upgraded on
 * the next successful sign-in ("lazy rehash"). bcryptjs therefore remains a
 * dependency purely for reading old hashes — nothing writes them any more.
 */

function isBcryptHash(hash: string): boolean {
  return hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
}

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    if (isBcryptHash(hash)) return await bcrypt.compare(plain, hash);
    return await argon2.verify(hash, plain);
  } catch {
    // A malformed or truncated hash must read as "wrong password", never as
    // an unhandled error that could leak which accounts have broken records.
    return false;
  }
}

/** True while the stored hash is still the old format and should be upgraded. */
export function needsRehash(hash: string): boolean {
  return isBcryptHash(hash);
}
