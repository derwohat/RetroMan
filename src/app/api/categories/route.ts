import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        fields: { orderBy: { order: "asc" } },
        tagGroups: {
          select: {
            groupId: true,
            showInView: true,
            group: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
