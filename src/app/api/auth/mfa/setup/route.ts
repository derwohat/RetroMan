import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { encrypt, tryDecrypt } from "@/lib/crypto/encryption";
import { authBypassEnabled } from "@/lib/auth/devBypass";
import { checkTotp, codeRejection } from "@/lib/auth/totpCheck";

async function getUserId(): Promise<string | null> {
  if (authBypassEnabled()) {
    const user = await prisma.user.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
    return user?.id ?? null;
  }
  const session = await auth();
  // SECURITY: /api/auth is a public path in the proxy, so nothing in front of
  // this route stops a session that has only passed the password. Such a
  // session has no business changing the second factor.
  if (session?.user?.mfaPending) return null;
  return session?.user?.id ?? null;
}

// GET — generate new TOTP secret + QR code (not yet saved)
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, mfaEnabled: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Writing a fresh secret below replaces the one the user's authenticator
  // already holds, and it happens before anything is verified. For an account
  // that has MFA on, that is a lockout: the old codes stop working, the new
  // ones were never scanned, and the next sign-in has no way through.
  if (user.mfaEnabled) {
    return NextResponse.json(
      { error: "Die Zwei-Faktor-Anmeldung ist bereits aktiv. Schalte sie erst aus, bevor du sie neu einrichtest." },
      { status: 409 },
    );
  }

  const secret = generateSecret();
  const otpauth = generateURI({ issuer: "RetroMan", label: user.email, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  await prisma.user.update({ where: { id: userId }, data: { mfaSecret: encrypt(secret) } });

  return NextResponse.json({ qrDataUrl, secret });
}

// POST — verify TOTP token and enable MFA
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json() as { token?: string };
  if (!token) return NextResponse.json({ error: "Token erforderlich." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mfaSecret: true } });
  if (!user?.mfaSecret) return NextResponse.json({ error: "Kein Secret vorhanden. Bitte Setup neu starten." }, { status: 400 });

  const secret = tryDecrypt(user.mfaSecret);
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "Das hinterlegte Geheimnis lässt sich nicht entschlüsseln. Der ENCRYPTION_KEY passt nicht zu den gespeicherten Daten — ein Administrator muss die Zwei-Faktor-Anmeldung für dieses Konto zurücksetzen.",
      },
      { status: 500 },
    );
  }

  // SECURITY: for an account that already has a second factor this checks the
  // real secret, so it is a code oracle like the others — same counter and lock.
  const rejection = codeRejection(
    await checkTotp(userId, token, secret),
    "Ungültiger Code. Bitte erneut versuchen.",
  );
  if (rejection) return rejection;

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
  return NextResponse.json({ success: true });
}
