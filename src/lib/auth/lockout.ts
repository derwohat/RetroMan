// Account lockout rules (Codebook docs/security.md): failed attempts count per
// account and the lock doubles with every further block. Password failures and
// authenticator-code failures feed the same counter, so one budget covers both
// and neither can be used to wear the other down.
export const LOCK_THRESHOLD = 5;
export const BASE_LOCK_MS = 15 * 60_000;
export const MAX_LOCK_MS = 24 * 60 * 60_000;

/** Doubles per further block, capped, so repeat offenders wait progressively longer. */
export function lockDurationMs(failedAttempts: number): number {
  const blocks = Math.floor(failedAttempts / LOCK_THRESHOLD) - 1;
  return Math.min(BASE_LOCK_MS * 2 ** Math.max(0, blocks), MAX_LOCK_MS);
}

/** The lock a failure with this new total earns, or null while still under the threshold. */
export function lockAfterFailure(failedAttempts: number, nowMs: number): Date | null {
  return failedAttempts >= LOCK_THRESHOLD ? new Date(nowMs + lockDurationMs(failedAttempts)) : null;
}

// --- The authenticator-code step -------------------------------------------
//
// SECURITY: a six-digit code has a million values and the check accepts a
// window of them, so without a limit it can be guessed. Every place that takes
// a code goes through checkCodeAttempt, which owns three rules:
//   1. A locked account is not asked at all. Whether a guess would have been
//      right must not leak while the lock holds.
//   2. A wrong code counts on the account, not on the address, and earns the
//      same escalating lock as a wrong password.
//   3. Attempts for one account run one after the other. Check-then-write
//      would otherwise let a burst of parallel requests all read "not locked"
//      before the first failure was recorded.

export interface AttemptState {
  failedAttempts: number;
  lockedUntil: Date | null;
}

export interface AttemptStore {
  load(userId: string): Promise<AttemptState | null>;
  save(userId: string, state: AttemptState): Promise<void>;
}

export type CodeOutcome =
  | { status: "valid" }
  /** retryAfterSecs is above 0 when this very failure started a lock. */
  | { status: "invalid"; retryAfterSecs: number }
  | { status: "locked"; retryAfterSecs: number };

// Held on globalThis, not in a module constant: the production build bundles a
// module once per layer, and a separate map per copy would not serialize
// across the routes that all take a code (see the boot stamp in config.ts).
const CHAIN_KEY = "__retromanCodeAttemptChains";

function chains(): Map<string, Promise<unknown>> {
  const shared = globalThis as typeof globalThis & { [CHAIN_KEY]?: Map<string, Promise<unknown>> };
  shared[CHAIN_KEY] ??= new Map();
  return shared[CHAIN_KEY];
}

/** Runs `task` after every earlier task for the same key has settled. */
async function serialized<T>(key: string, task: () => Promise<T>): Promise<T> {
  const map = chains();
  const previous = map.get(key) ?? Promise.resolve();
  // A failed earlier task must not stop the ones queued behind it.
  const run = previous.catch(() => undefined).then(task);
  const tail = run.catch(() => undefined);
  map.set(key, tail);
  try {
    return await run;
  } finally {
    // Drop the entry once nothing newer queued behind it, so the map does not
    // grow with every account that ever signed in.
    if (map.get(key) === tail) map.delete(key);
  }
}

function secondsUntil(date: Date, nowMs: number): number {
  return Math.max(1, Math.ceil((date.getTime() - nowMs) / 1000));
}

export async function checkCodeAttempt(
  userId: string,
  store: AttemptStore,
  isValid: () => boolean,
  now: () => number = Date.now,
): Promise<CodeOutcome> {
  return serialized(userId, async () => {
    const state = await store.load(userId);
    // The account vanished between the route's own lookup and here. Nothing to
    // count against, and the answer must not be "valid".
    if (!state) return { status: "invalid", retryAfterSecs: 0 };

    const startedAt = now();
    if (state.lockedUntil && state.lockedUntil.getTime() > startedAt) {
      return { status: "locked", retryAfterSecs: secondsUntil(state.lockedUntil, startedAt) };
    }

    if (isValid()) {
      // Only write when there is something to clear, so a normal sign-in costs
      // no extra query.
      if (state.failedAttempts > 0 || state.lockedUntil) {
        await store.save(userId, { failedAttempts: 0, lockedUntil: null });
      }
      return { status: "valid" };
    }

    const failedAttempts = state.failedAttempts + 1;
    const lockedUntil = lockAfterFailure(failedAttempts, startedAt);
    await store.save(userId, { failedAttempts, lockedUntil });
    return { status: "invalid", retryAfterSecs: lockedUntil ? secondsUntil(lockedUntil, startedAt) : 0 };
  });
}
