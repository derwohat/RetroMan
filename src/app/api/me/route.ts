import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

async function getUser() {
  if (process.env.NODE_ENV !== "production") {
    return prisma.user.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, preferredLanguage: true },
    });
  }
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, preferredLanguage: true },
  });
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, preferredLanguage } = body as { name?: string; preferredLanguage?: string };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(preferredLanguage ? { preferredLanguage } : {}),
    },
    select: { id: true, name: true, email: true, role: true, preferredLanguage: true },
  });

  return NextResponse.json(updated);
}
