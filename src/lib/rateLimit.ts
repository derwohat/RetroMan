type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

const WINDOW_MS  = 15 * 60 * 1000; // 15 minutes
const MAX_HITS   = 10;              // max attempts per window

export function rateLimit(key: string): { ok: boolean; retryAfterSecs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSecs: 0 };
  }

  entry.count += 1;
  if (entry.count > MAX_HITS) {
    return { ok: false, retryAfterSecs: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { ok: true, retryAfterSecs: 0 };
}
