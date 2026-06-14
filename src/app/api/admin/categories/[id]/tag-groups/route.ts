import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

async function checkAdmin(): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== "production") return null;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { id: categoryId } = await params;
  const { groupId } = await req.json();

  if (!groupId) {
    return NextResponse.json({ error: "groupId erforderlich." }, { status: 400 });
  }

  const assignment = await prisma.categoryTagGroup.create({
    data: { categoryId, groupId, showInView: false },
    include: { group: true },
  });

  return NextResponse.json(assignment, { status: 201 });
}
