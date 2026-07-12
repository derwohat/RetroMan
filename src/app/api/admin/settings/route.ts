import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/crypto/encryption";

const ENCRYPTED_FIELDS = [
  "tmdbApiKey", "igdbClientId", "igdbSecret",
  "discogsApiKey", "pricechartingKey", "theGamesDbKey", "mobyGamesKey",
  "googleSearchKey", "googleSearchCx", "omdbApiKey", "comicVineKey", "googleBooksKey",
];

async function checkAdmin(): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== "production") return null;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
