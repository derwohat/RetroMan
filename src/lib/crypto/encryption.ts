import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY env var missing");
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY must be 64 hex chars");
  return buf;
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), encrypted.toString("hex"), tag.toString("hex")].join(":");
}

/**
 * Decrypt without throwing. A failure here means one thing in practice: the
 * ENCRYPTION_KEY no longer matches the data it was written with. Left to
 * throw, it surfaces as a 500 in whatever route happened to call it, and the
 * user is told their code was wrong. Callers turn the null into a message
 * that names the real cause.
 */
export function tryDecrypt(encryptedText: string): string | null {
  try {
    return decrypt(encryptedText);
  } catch (err) {
    console.error(
      "[crypto] decrypt failed — ENCRYPTION_KEY does not match the stored data:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export function decrypt(encryptedText: string): string {
  const key = getKey();
  const [ivHex, encHex, tagHex] = encryptedText.split(":");
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
