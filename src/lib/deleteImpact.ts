import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { authBypassEnabled } from "@/lib/auth/devBypass";
import { getUserId } from "@/lib/api/auth";

/**
 * Codebook docs/product-standards.md: a confirmation that cannot name the
 * consequences asks for consent to something invisible. The counting happens
 * here, on the server, rather than being added up in the browser from several
 * lists — and counting is what shows whether the dependants are handled at
 * all. In RetroMan they were not: `Item -> Collection` and
 * `Collection -> User` are RESTRICT in the database, so both deletions failed
 * with a 500 while the dialog promised the dependants would go with it.
 */

/** A counted consequence. The label is built in the UI, which has the plurals. */
export interface ImpactCount {
  key: string;
  count: number;
}

export type ImpactResult =
  | { ok: true; counts: ImpactCount[] }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Every type must bring its own check, and it must be the same right the
 * deletion itself demands. Keeping them in one table rather than one route
 * file each is what makes a missing check visible: a type without an
 * `authorize` does not compile.
 */
interface ImpactType {
  authorize: (id: string, subId: string | null) => Promise<ImpactResult | null>;
  count: (id: string, subId: string | null) => Promise<ImpactCount[]>;
}

async function requireAdmin(): Promise<ImpactResult | null> {
  if (authBypassEnabled()) return null;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return null;
}

async function requireOwnCollection(collectionId: string): Promise<ImpactResult | null> {
  const userId = await getUserId();
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { userId: true },
  });
  // Same answer as the delete route: not yours is indistinguishable from
  // not there, so the endpoint cannot be used to probe for ids.
  if (collection?.userId !== userId) return { ok: false, status: 404, error: "NotFound" };
  return null;
}

async function requireOwnItem(itemId: string): Promise<ImpactResult | null> {
  const userId = await getUserId();
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };
  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { userId: true } });
  if (item?.userId !== userId) return { ok: false, status: 404, error: "NotFound" };
  return null;
}

async function requireOwnTagGroup(groupId: string): Promise<ImpactResult | null> {
  const userId = await getUserId();
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };
  const group = await prisma.tagGroup.findUnique({
    where: { id: groupId },
    select: { userId: true, isSystem: true },
  });
  if (!group) return { ok: false, status: 404, error: "NotFound" };
  // System groups belong to everyone and to no one; only an admin may touch
  // them, and that path goes through the admin type below.
  if (group.isSystem || group.userId !== userId) {
    return { ok: false, status: 404, error: "NotFound" };
  }
  return null;
}

async function countCollection(collectionId: string): Promise<ImpactCount[]> {
  const [items, fields, tagGroups, images, customValues] = await Promise.all([
    prisma.item.count({ where: { collectionId } }),
    prisma.collectionField.count({ where: { collectionId } }),
    prisma.collectionTagGroup.count({ where: { collectionId } }),
    prisma.itemImage.count({ where: { item: { collectionId } } }),
    prisma.itemCustomField.count({ where: { item: { collectionId } } }),
  ]);
  return [
    { key: "items", count: items },
    { key: "images", count: images },
    { key: "fields", count: fields },
    { key: "fieldValues", count: customValues },
    { key: "tagGroupLinks", count: tagGroups },
  ];
}

async function countItem(itemId: string): Promise<ImpactCount[]> {
  const [images, tags, customValues, grading] = await Promise.all([
    prisma.itemImage.count({ where: { itemId } }),
    prisma.itemTag.count({ where: { itemId } }),
    prisma.itemCustomField.count({ where: { itemId } }),
    prisma.gradingInfo.count({ where: { itemId } }),
  ]);
  return [
    { key: "images", count: images },
    { key: "tagAssignments", count: tags },
    { key: "fieldValues", count: customValues },
    { key: "grading", count: grading },
  ];
}

async function countTagGroup(groupId: string): Promise<ImpactCount[]> {
  const [values, assignments, collections] = await Promise.all([
    prisma.tagValue.count({ where: { groupId } }),
    prisma.itemTag.count({ where: { groupId } }),
    prisma.collectionTagGroup.count({ where: { groupId } }),
  ]);
  return [
    { key: "tagValues", count: values },
    { key: "tagAssignments", count: assignments },
    { key: "collectionLinks", count: collections },
  ];
}

async function countTagValue(valueId: string): Promise<ImpactCount[]> {
  const assignments = await prisma.itemTag.count({ where: { tagValueId: valueId } });
  return [{ key: "tagAssignments", count: assignments }];
}

async function countCollectionField(fieldId: string): Promise<ImpactCount[]> {
  const values = await prisma.itemCustomField.count({ where: { fieldId } });
  return [{ key: "fieldValues", count: values }];
}

async function countUser(userId: string): Promise<ImpactCount[]> {
  const [collections, items, images, tagGroups] = await Promise.all([
    prisma.collection.count({ where: { userId } }),
    prisma.item.count({ where: { userId } }),
    prisma.itemImage.count({ where: { item: { userId } } }),
    prisma.tagGroup.count({ where: { userId } }),
  ]);
  return [
    { key: "collections", count: collections },
    { key: "items", count: items },
    { key: "images", count: images },
    { key: "tagGroups", count: tagGroups },
  ];
}

const TYPES: Record<string, ImpactType> = {
  collection: {
    authorize: (id) => requireOwnCollection(id),
    count: (id) => countCollection(id),
  },
  "admin:collection": {
    authorize: () => requireAdmin(),
    count: (id) => countCollection(id),
  },
  item: {
    authorize: (id) => requireOwnItem(id),
    count: (id) => countItem(id),
  },
  field: {
    // The field hangs off a collection, so the right is the collection's.
    authorize: (id) => requireOwnCollection(id),
    count: (_id, subId) => countCollectionField(subId ?? ""),
  },
  "admin:field": {
    authorize: () => requireAdmin(),
    count: (_id, subId) => countCollectionField(subId ?? ""),
  },
  tagGroup: {
    authorize: (id) => requireOwnTagGroup(id),
    count: (id) => countTagGroup(id),
  },
  "admin:tagGroup": {
    authorize: () => requireAdmin(),
    count: (id) => countTagGroup(id),
  },
  tagValue: {
    authorize: (id) => requireOwnTagGroup(id),
    count: (_id, subId) => countTagValue(subId ?? ""),
  },
  "admin:tagValue": {
    authorize: () => requireAdmin(),
    count: (_id, subId) => countTagValue(subId ?? ""),
  },
  "admin:user": {
    authorize: () => requireAdmin(),
    count: (id) => countUser(id),
  },
};

export async function deleteImpact(
  type: string,
  id: string,
  subId: string | null,
): Promise<ImpactResult> {
  const handler = TYPES[type];
  if (!handler) return { ok: false, status: 404, error: "UnknownType" };

  const denied = await handler.authorize(id, subId);
  if (denied) return denied;

  const counts = await handler.count(id, subId);
  // Zero counts are dropped here rather than in the browser: a list of
  // "0 images, 0 tags" buries the number that matters.
  return { ok: true, counts: counts.filter((entry) => entry.count > 0) };
}
