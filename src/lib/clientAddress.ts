import { headers } from "next/headers";

/**
 * The address a rate limit may be keyed on.
 *
 * Security-critical: this value decides whose attempts are counted together,
 * and it comes from a header the client can write. Reading the FIRST
 * `X-Forwarded-For` entry - which all three call sites did - hands that
 * decision to the caller: a proxy that appends (nginx with
 * `$proxy_add_x_forwarded_for`, which is what Synology's reverse proxy does)
 * leaves whatever the client sent in front of the address it saw itself. Every
 * request can then claim a fresh identity and the brake never closes.
 *
 * Each proxy appends the address it received the request from, so with one
 * trusted proxy the real client sits at the END of the list, and with N of them
 * at the Nth position from the end. Counting from the end is what makes a forged
 * prefix harmless: entries the client added only make the list longer, they
 * never shift the position that is read.
 *
 * With no trusted proxy the header is not read at all. The brake then counts
 * every caller into one bucket, which is a worse brake but an honest one - an
 * invented per-caller identity is not a brake at all.
 */
const FALLBACK = "unbekannt";
const DEFAULT_HOPS = 1;

/**
 * The address-picking itself, separated from reading the request so it can be
 * checked directly. `hops` is how many proxies append to the header.
 */
export function addressFromForwardedFor(header: string | null, hops: number): string {
  if (hops <= 0 || !header) return FALLBACK;

  const entries = header
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const index = entries.length - hops;
  if (index < 0) return FALLBACK;

  return entries[index] ?? FALLBACK;
}

/** How many proxies sit in front of the app and append to the header. */
export function trustedProxyCount(): number {
  // An empty variable is not an unset one: Number("") is 0, which would
  // silently switch trust off for anyone who leaves the value blank. So the
  // blank case falls back to the default rather than to zero.
  const raw = process.env.TRUSTED_PROXY_COUNT?.trim();
  if (!raw) return DEFAULT_HOPS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_HOPS;
  return parsed;
}

export async function clientAddress(): Promise<string> {
  const header = (await headers()).get("x-forwarded-for");
  return addressFromForwardedFor(header, trustedProxyCount());
}
