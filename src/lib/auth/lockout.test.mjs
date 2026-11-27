// Run with: node --test src/lib/auth/lockout.test.mjs
// Node strips the types of the .ts import itself, so no build step is needed.
import assert from "node:assert/strict";
import { test } from "node:test";

const { LOCK_THRESHOLD, BASE_LOCK_MS, MAX_LOCK_MS, lockDurationMs, lockAfterFailure, checkCodeAttempt } =
  await import("./lockout.ts");

const MINUTE = 60_000;

/** A store with a database-like delay, so an unserialized check would interleave. */
function memoryStore(initial = { failedAttempts: 0, lockedUntil: null }, delayMs = 2) {
  const rows = new Map([["u1", { ...initial }]]);
  const wait = () => new Promise((resolve) => setTimeout(resolve, delayMs));
  return {
    rows,
    async load(id) {
      await wait();
      const row = rows.get(id);
      return row ? { ...row } : null;
    },
    async save(id, state) {
      await wait();
      rows.set(id, { ...state });
    },
  };
}

function counting(result) {
  const counter = { calls: 0 };
  counter.isValid = () => {
    counter.calls += 1;
    return result;
  };
  return counter;
}

test("the lock doubles per block and stops at the cap", () => {
  assert.equal(lockDurationMs(LOCK_THRESHOLD), BASE_LOCK_MS);
  assert.equal(lockDurationMs(LOCK_THRESHOLD * 2), BASE_LOCK_MS * 2);
  assert.equal(lockDurationMs(LOCK_THRESHOLD * 3), BASE_LOCK_MS * 4);
  assert.equal(lockDurationMs(10_000), MAX_LOCK_MS);
});

test("no lock below the threshold, a lock from the threshold on", () => {
  assert.equal(lockAfterFailure(LOCK_THRESHOLD - 1, 0), null);
  assert.equal(lockAfterFailure(LOCK_THRESHOLD, 0)?.getTime(), BASE_LOCK_MS);
});

test("wrong codes count up and the fifth one locks the account", async () => {
  const store = memoryStore();
  const wrong = counting(false);
  for (let i = 1; i < LOCK_THRESHOLD; i += 1) {
    const outcome = await checkCodeAttempt("u1", store, wrong.isValid);
    assert.deepEqual(outcome, { status: "invalid", retryAfterSecs: 0 });
  }
  const fifth = await checkCodeAttempt("u1", store, wrong.isValid);
  assert.equal(fifth.status, "invalid");
  assert.equal(fifth.retryAfterSecs, (15 * MINUTE) / 1000);
  assert.equal(store.rows.get("u1").failedAttempts, LOCK_THRESHOLD);
});

test("a locked account is not asked, so a right code does not get through either", async () => {
  const store = memoryStore({ failedAttempts: LOCK_THRESHOLD, lockedUntil: new Date(Date.now() + 5 * MINUTE) });
  const right = counting(true);
  const outcome = await checkCodeAttempt("u1", store, right.isValid);
  assert.equal(outcome.status, "locked");
  assert.ok(outcome.retryAfterSecs > 0 && outcome.retryAfterSecs <= 300);
  assert.equal(right.calls, 0, "the code was evaluated while locked");
  assert.equal(store.rows.get("u1").failedAttempts, LOCK_THRESHOLD, "a refused attempt must not count");
});

test("once the lock has run out the account is asked again, and one more miss locks it longer", async () => {
  const store = memoryStore({ failedAttempts: LOCK_THRESHOLD, lockedUntil: new Date(Date.now() - 1000) });
  const wrong = counting(false);
  const outcome = await checkCodeAttempt("u1", store, wrong.isValid);
  assert.equal(wrong.calls, 1);
  assert.equal(outcome.status, "invalid");
  assert.ok(outcome.retryAfterSecs > 0, "a failure at or above the threshold locks again");
});

test("a right code clears the counter and the lock", async () => {
  const store = memoryStore({ failedAttempts: 3, lockedUntil: null });
  const outcome = await checkCodeAttempt("u1", store, counting(true).isValid);
  assert.deepEqual(outcome, { status: "valid" });
  assert.deepEqual(store.rows.get("u1"), { failedAttempts: 0, lockedUntil: null });
});

test("a clean account is not written to on a right code", async () => {
  const store = memoryStore();
  let saves = 0;
  const original = store.save.bind(store);
  store.save = async (...args) => {
    saves += 1;
    return original(...args);
  };
  await checkCodeAttempt("u1", store, counting(true).isValid);
  assert.equal(saves, 0);
});

test("fifty parallel wrong guesses get exactly five evaluations, not fifty", async () => {
  const store = memoryStore();
  const wrong = counting(false);
  const outcomes = await Promise.all(
    Array.from({ length: 50 }, () => checkCodeAttempt("u1", store, wrong.isValid)),
  );
  assert.equal(wrong.calls, LOCK_THRESHOLD, `evaluated ${wrong.calls} times`);
  assert.equal(outcomes.filter((o) => o.status === "locked").length, 50 - LOCK_THRESHOLD);
  assert.equal(store.rows.get("u1").failedAttempts, LOCK_THRESHOLD);
});

test("different accounts do not hold each other up or share a counter", async () => {
  const store = memoryStore();
  store.rows.set("u2", { failedAttempts: 0, lockedUntil: null });
  const wrong = counting(false);
  await Promise.all(Array.from({ length: LOCK_THRESHOLD }, () => checkCodeAttempt("u1", store, wrong.isValid)));
  const other = await checkCodeAttempt("u2", store, counting(true).isValid);
  assert.deepEqual(other, { status: "valid" });
});

test("a storage failure rejects that attempt but does not jam the queue behind it", async () => {
  const store = memoryStore();
  let failNext = true;
  const original = store.load.bind(store);
  store.load = async (id) => {
    if (failNext) {
      failNext = false;
      throw new Error("database down");
    }
    return original(id);
  };
  const first = checkCodeAttempt("u1", store, counting(true).isValid);
  const second = checkCodeAttempt("u1", store, counting(true).isValid);
  await assert.rejects(first, /database down/);
  assert.deepEqual(await second, { status: "valid" });
});

test("an account that no longer exists is never valid", async () => {
  const store = memoryStore();
  const right = counting(true);
  const outcome = await checkCodeAttempt("gone", store, right.isValid);
  assert.deepEqual(outcome, { status: "invalid", retryAfterSecs: 0 });
  assert.equal(right.calls, 0);
});

test("the per-account queue is emptied when nothing is waiting", async () => {
  const store = memoryStore();
  await checkCodeAttempt("u1", store, counting(true).isValid);
  const map = globalThis.__retromanCodeAttemptChains;
  assert.equal(map.size, 0);
});
