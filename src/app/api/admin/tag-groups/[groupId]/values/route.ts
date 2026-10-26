import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { authBypassEnabled } from "@/lib/auth/devBypass";

async function checkAdmin(): Promise<NextResponse | null> {
  if (authBypassEnabled()) return null;
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Signed in but not permitted is 403, never 401 — a 401 reads as an
  // expired session and sends the browser to the sign-in page.
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

type Params = { params: Promise<{ groupId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId } = await params;
  const { value } = await req.json();
  if (!value?.trim()) return NextResponse.json({ error: "Wert erforderlich." }, { status: 400 });
  const count = await prisma.tagValue.count({ where: { groupId } });
  const tagValue = await prisma.tagValue.create({
    data: { groupId, value: value.trim(), order: count },
  });
  return NextResponse.json(tagValue, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { groupId } = await params;
  const { order } = await req.json() as { order: string[] };
  await Promise.all(
    order.map((id, idx) =>
      prisma.tagValue.update({ where: { id, groupId }, data: { order: idx } })
    )
  );
  return NextResponse.json({ ok: true });
}
