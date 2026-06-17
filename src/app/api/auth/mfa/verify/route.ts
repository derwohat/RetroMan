import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto/encryption";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { authenticator } = require("otplib") as { authenticator: { verify(opts: { token: string; secret: string }): boolean } };

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

  const secret = decrypt(user.mfaSecret);
  const isValid = authenticator.verify({ token, secret });

  if (!isValid) return NextResponse.json({ error: "Ungültiger Code. Bitte erneut versuchen." }, { status: 400 });

  return NextResponse.json({ success: true });
}
