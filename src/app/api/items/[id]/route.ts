import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

async function getUserId(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    const user = await prisma.user.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return user?.id ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const item = await prisma.item.findFirst({
      where: { id, userId },
      include: {
        images: { orderBy: { order: "asc" } },
        tags: { include: { tagValue: true, tagGroup: true } },
        category: {
          include: {
            fields: { orderBy: { order: "asc" } },
            tagGroups: { select: { groupId: true, showInView: true } },
          },
        },
        customFields: { include: { field: true } },
      },
    });

    if (!item) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Datenbankfehler." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { imageUrl, tags, customFields: customFieldsInput, categoryId: _catId, userId: _uid, ...rest } = body;

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) data[k] = v === "" ? null : v;
  }

  // tags as array of { tagValueId, groupId }
  let tagsUpdate = {};
  if (Array.isArray(tags)) {
    const tagLinks: Array<{ tagValueId: string; groupId: string }> = tags;
    tagsUpdate = {
      tags: {
        deleteMany: {},
        ...(tagLinks.length > 0
          ? { create: tagLinks.map(({ tagValueId, groupId }) => ({ tagValueId, groupId })) }
          : {}),
      },
    };
  }

  const item = await prisma.item.update({
    where: { id, userId },
    data: {
      ...data,
      ...tagsUpdate,
      ...(imageUrl !== undefined
        ? {
            images: {
              deleteMany: {},
              ...(imageUrl ? { create: [{ url: imageUrl, order: 0, isPrimary: true }] } : {}),
            },
          }
        : {}),
    },
    include: { images: true, tags: { include: { tagValue: true, tagGroup: true } } },
  });

  if (Array.isArray(customFieldsInput)) {
    for (const cf of customFieldsInput as Array<{ fieldId: string; value: string | null }>) {
      if (!cf.fieldId) continue;
      if (cf.value === null || cf.value === "") {
        await prisma.itemCustomField.deleteMany({ where: { itemId: id, fieldId: cf.fieldId } });
      } else {
        await prisma.itemCustomField.upsert({
          where: { itemId_fieldId: { itemId: id, fieldId: cf.fieldId } },
          create: { itemId: id, fieldId: cf.fieldId, value: cf.value },
          update: { value: cf.value },
        });
      }
    }
  }

  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.item.delete({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
