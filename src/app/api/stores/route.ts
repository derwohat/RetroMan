import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Returns TagValues from the "Shops" tag group for autocomplete in item forms.
export async function GET() {
  const group = await prisma.tagGroup.findFirst({ where: { name: "Shops" } });
  if (!group) return NextResponse.json([]);
  const values = await prisma.tagValue.findMany({
    where: { groupId: group.id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(values.map((v) => ({ id: v.id, name: v.value })));
}
