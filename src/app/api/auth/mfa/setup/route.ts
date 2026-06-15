import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { authenticator } = require("otplib") as { authenticator: { generateSecret(): string; keyuri(user: string, service: string, secret: string): string; verify(opts: { token: string; secret: string }): boolean } };
import QRCode from "qrcode";
import { encrypt, decrypt } from "@/lib/crypto/encryption";

async function getUserId(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    const user = await prisma.user.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
    return user?.id ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

// GET — generate new TOTP secret + QR code (not yet saved)
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, mfaEnabled: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, "RetroMan", secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  // Store pending secret temporarily (not yet verified)
  await prisma.user.update({ where: { id: userId }, data: { mfaSecret: encrypt(secret) } });

  return NextResponse.json({ qrDataUrl, secret });
}

// POST — verify TOTP token and enable MFA
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Token erforderlich." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mfaSecret: true } });
  if (!user?.mfaSecret) return NextResponse.json({ error: "Kein Secret vorhanden. Bitte Setup neu starten." }, { status: 400 });

  const secret = decrypt(user.mfaSecret);
  const isValid = authenticator.verify({ token, secret });

  if (!isValid) return NextResponse.json({ error: "Ungültiger Code. Bitte erneut versuchen." }, { status: 400 });

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
  return NextResponse.json({ success: true });
}
