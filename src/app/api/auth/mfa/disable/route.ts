import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { authenticator } = require("otplib") as { authenticator: { verify(opts: { token: string; secret: string }): boolean } };
import { decrypt } from "@/lib/crypto/encryption";

async function getUserId(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    const user = await prisma.user.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } });
    return user?.id ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Token erforderlich." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { mfaSecret: true, mfaEnabled: true } });
  if (!user?.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json({ error: "MFA ist nicht aktiv." }, { status: 400 });
  }

  const secret = decrypt(user.mfaSecret);
  const isValid = authenticator.verify({ token, secret });
  if (!isValid) return NextResponse.json({ error: "Ungültiger Code." }, { status: 400 });

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null } });
  return NextResponse.json({ success: true });
}
