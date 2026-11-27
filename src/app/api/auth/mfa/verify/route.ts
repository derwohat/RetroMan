import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { tryDecrypt } from "@/lib/crypto/encryption";
import { checkTotp, codeRejection } from "@/lib/auth/totpCheck";
import { issueMfaProof } from "@/lib/auth/mfaProof";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json() as { token?: string };
  if (!token) return NextResponse.json({ error: "Token erforderlich." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!user?.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json({ error: "MFA nicht aktiv." }, { status: 400 });
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

  // SECURITY: counted on the account and locked after repeated misses, so the
  // code cannot be guessed. The same check guards disable and setup.
  const rejection = codeRejection(
    await checkTotp(session.user.id, token, secret),
    "Ungültiger Code. Bitte erneut versuchen.",
  );
  if (rejection) return rejection;

  // The proof is the only thing that lets the session leave the pending state;
  // the browser hands it back through the session update, where the jwt
  // callback checks it. A session without an id predates this and must sign in
  // again rather than be waved through.
  if (!session.user.sid) {
    return NextResponse.json(
      { error: "Die Sitzung ist veraltet. Bitte melden Sie sich erneut an." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    success: true,
    proof: issueMfaProof(session.user.id, session.user.sid),
  });
}
