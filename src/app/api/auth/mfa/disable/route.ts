import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { tryDecrypt } from "@/lib/crypto/encryption";
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

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json() as { token?: string };
  if (!token) return NextResponse.json({ error: "Token erforderlich." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mfaSecret: true, mfaEnabled: true } });
  if (!user?.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json({ error: "MFA ist nicht aktiv." }, { status: 400 });
  }

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

  // SECURITY: this takes a code as well, so it is a second place to guess one.
  // Same account counter and lock as the sign-in step.
  const rejection = codeRejection(await checkTotp(userId, token, secret), "Ungültiger Code.");
  if (rejection) return rejection;

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null } });
  return NextResponse.json({ success: true });
}
