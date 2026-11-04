import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { authBypassEnabled } from "@/lib/auth/devBypass";
import { usageByValueId } from "@/lib/tags/linkedField";

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

export async function GET(req: NextRequest) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const groups = await prisma.tagGroup.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { values: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
  });

  // Codebook docs/data-standards.md: the "Verwendet" column is delivered only
  // when it is asked for, never in the requests that merely fill a select box
  // in the app — it walks every item.
  if (req.nextUrl.searchParams.get("with_usage") === "true") {
    const usage = await usageByValueId(prisma);
    return NextResponse.json(
      groups.map((g) => ({
        ...g,
        values: g.values.map((v) => ({ ...v, usage: usage[v.id] ?? 0 })),
      })),
    );
  }

  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { name, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
  // max + 1, not count(): with count() a group created after another was
  // deleted gets an order that is already taken, and two groups with the same
  // order come back in whatever sequence the database feels like — the list
  // then appears to shuffle on its own. Same approach the collections take.
  const agg = await prisma.tagGroup.aggregate({ _max: { order: true } });
  const group = await prisma.tagGroup.create({
    data: { name: name.trim(), order: (agg._max.order ?? -1) + 1, ...(color ? { color } : {}) },
    include: { values: true },
  });
  return NextResponse.json(group, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const denied = await checkAdmin();
  if (denied) return denied;
  const { order } = await req.json() as { order: string[] };
  // System groups keep order 0; user groups start from 1
  const systemGroups = await prisma.tagGroup.findMany({ where: { isSystem: true }, select: { id: true } });
  const systemIds = new Set(systemGroups.map((g) => g.id));
  let userIdx = 1;
  await Promise.all(
    order.map((id) => {
      if (systemIds.has(id)) return prisma.tagGroup.update({ where: { id }, data: { order: 0 } });
      return prisma.tagGroup.update({ where: { id }, data: { order: userIdx++ } });
    })
  );
  return NextResponse.json({ ok: true });
}
