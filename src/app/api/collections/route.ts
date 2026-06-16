import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            mediaType: true,
            fields: { orderBy: { order: "asc" } },
            tagGroups: {
              select: { groupId: true, showInView: true, group: { select: { id: true, name: true, color: true, linkedField: true } } },
            },
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(collections);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
