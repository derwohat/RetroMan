import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { authBypassEnabled } from "@/lib/auth/devBypass";
import { rateLimit } from "@/lib/rateLimit";
import { isProbeService, probeService } from "@/lib/metadata/probe";

/**
 * Tests one stored API key against its service and gives back what the
 * service said — Codebook docs/product-standards.md, "Anleitungen zu
 * Fremddiensten": instructions alone do not prove that a key works.
 *
 * Limited like the test mail, and for the same two reasons: setting a key up
 * means trying a few times in a row, which this covers, while a button that
 * fires an outbound request on every click is otherwise a way to make the
 * server hammer somebody else's API — and several of these count every call
 * against a quota that is the administrator's own.
 */
const PROBE_LIMIT = 10;
const PROBE_WINDOW_MS = 60_000;

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!authBypassEnabled()) {
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Signed in but not permitted is 403, never 401 — a 401 reads as an
    // expired session and sends the browser to the sign-in page.
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const adminId = session?.user?.id ?? "bypass";
  const limit = rateLimit(`settings:probe:${adminId}`, PROBE_LIMIT, PROBE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "RateLimited", retryAfterSecs: limit.retryAfterSecs },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSecs) } },
    );
  }

  const body = await request.json().catch(() => null);
  const service = body?.service;
  // The service name decides which outbound request is built, so it runs
  // against the fixed list rather than being trusted — same reasoning as the
  // linked-field allow-list.
  if (!isProbeService(service)) {
    return NextResponse.json({ error: "UnknownService" }, { status: 400 });
  }

  // The admin asked for this, so the service's wording goes back as it came.
  // There is nothing to leak: the key never travels, only the answer about it.
  return NextResponse.json(await probeService(service));
}
