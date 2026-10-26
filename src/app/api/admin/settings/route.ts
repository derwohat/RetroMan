import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/crypto/encryption";
import { authBypassEnabled } from "@/lib/auth/devBypass";
import { validateSessionLimits } from "@/lib/auth/sessionLimits";

const ENCRYPTED_FIELDS = [
  "tmdbApiKey", "igdbClientId", "igdbSecret",
  "discogsApiKey", "pricechartingKey", "theGamesDbKey", "mobyGamesKey",
  "googleSearchKey", "googleSearchCx", "omdbApiKey", "comicVineKey", "googleBooksKey",
];

async function checkAdmin(): Promise<NextResponse | null> {
  if (authBypassEnabled()) return null;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Signed in but not permitted is 403, never 401 — a 401 reads as an
  // expired session and sends the browser to the sign-in page.
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await checkAdmin();
  if (denied) return denied;

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });

  // Return boolean (is set / not set) for encrypted fields — never send keys to client
  const result: Record<string, unknown> = { ...settings };
  for (const field of ENCRYPTED_FIELDS) {
    result[field] = !!(settings[field as keyof typeof settings]);
  }

  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const body = await req.json();
  const data: Record<string, unknown> = {};

  // Session deadlines are rejected here rather than clamped — the form must
  // say no to a bad value. Reading them back clamps instead, so a wrong row
  // can never lock everyone out of the sign-in path.
  if (body.sessionIdleMinutes !== undefined || body.sessionAbsoluteHours !== undefined) {
    const current = await prisma.appSettings.findUnique({
      where: { id: "singleton" },
      select: { sessionIdleMinutes: true, sessionAbsoluteHours: true },
    });
    const check = validateSessionLimits(
      body.sessionIdleMinutes ?? current?.sessionIdleMinutes ?? 60,
      body.sessionAbsoluteHours ?? current?.sessionAbsoluteHours ?? 12,
    );
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 422 });
    }
  }

  for (const [key, value] of Object.entries(body)) {
    if (key === "id" || key === "updatedAt") continue;
    if (ENCRYPTED_FIELDS.includes(key)) {
      if (typeof value === "string" && value.length > 0) {
        data[key] = encrypt(value);
      } else if (value === null) {
        data[key] = null;
      }
    } else {
      data[key] = value;
    }
  }

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  return NextResponse.json({ success: true });
}
