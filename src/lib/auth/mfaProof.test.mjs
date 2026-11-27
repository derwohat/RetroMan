// Run with: node --test src/lib/auth/mfaProof.test.mjs
// Node strips the types of the .ts import itself, so no build step is needed.
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.NEXTAUTH_SECRET = "test-secret-for-the-mfa-proof";
delete process.env.AUTH_SECRET;

const { issueMfaProof, verifyMfaProof } = await import("./mfaProof.ts");

test("a proof verifies for the user and session it was issued for", () => {
  const proof = issueMfaProof("user-1", "session-a");
  assert.equal(verifyMfaProof(proof, "user-1", "session-a"), true);
});

test("a proof is worthless in another session or for another user", () => {
  const proof = issueMfaProof("user-1", "session-a");
  assert.equal(verifyMfaProof(proof, "user-1", "session-b"), false);
  assert.equal(verifyMfaProof(proof, "user-2", "session-a"), false);
});

test("what the browser used to send is not a proof", () => {
  for (const forged of [true, false, 1, null, undefined, {}, [], "", "true", "0".repeat(64), "zz".repeat(32)]) {
    assert.equal(verifyMfaProof(forged, "user-1", "session-a"), false, String(forged));
  }
});

test("a proof with trailing junk or the wrong length is refused", () => {
  const proof = issueMfaProof("user-1", "session-a");
  assert.equal(verifyMfaProof(`${proof}zzzz`, "user-1", "session-a"), false);
  assert.equal(verifyMfaProof(proof.slice(0, -2), "user-1", "session-a"), false);
});

test("a missing session id never verifies", () => {
  const proof = issueMfaProof("user-1", "");
  assert.equal(verifyMfaProof(proof, "user-1", ""), false);
});

test("a proof made with another secret is refused", () => {
  const proof = issueMfaProof("user-1", "session-a");
  process.env.NEXTAUTH_SECRET = "a-different-secret";
  assert.equal(verifyMfaProof(proof, "user-1", "session-a"), false);
  process.env.NEXTAUTH_SECRET = "test-secret-for-the-mfa-proof";
});

test("signing without any secret fails loudly instead of signing with nothing", () => {
  const saved = process.env.NEXTAUTH_SECRET;
  delete process.env.NEXTAUTH_SECRET;
  assert.throws(() => issueMfaProof("user-1", "session-a"), /NEXTAUTH_SECRET/);
  process.env.NEXTAUTH_SECRET = saved;
});
