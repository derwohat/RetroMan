import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Shared tag groups have no owner: the system groups and every group an
 * administrator creates under Einstellungen → Tags. A group with an owner is
 * that person's private list, kept under Profil → Meine Tags.
 *
 * Security: the admin area used to list and change every group, other
 * people's private ones included. It now sees and touches shared groups only.
 */
export const SHARED_GROUP_WHERE = { userId: null } as const;

/**
 * Null when the group is shared; otherwise the answer that refuses it.
 * 404 rather than 403: whether someone's private group exists is none of the
 * admin area's business either.
 */
export async function refuseUnlessShared(groupId: string): Promise<NextResponse | null> {
  const group = await prisma.tagGroup.findUnique({
    where: { id: groupId },
    select: { userId: true },
  });
  if (!group || group.userId !== null) {
    return NextResponse.json({ error: "Tag-Gruppe nicht gefunden." }, { status: 404 });
  }
  return null;
}
