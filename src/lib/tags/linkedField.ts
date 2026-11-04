import type { Prisma } from "@/generated/prisma/client";

/**
 * Item columns a tag group may be linked to.
 *
 * Security-critical: `TagGroup.linkedField` is plain text that arrives from the
 * API, and it is used below as a column name. Without this list an arbitrary
 * string would reach the query builder. The list is also what the two routes
 * that accept `linkedField` validate against, so an unknown column is refused
 * on the way in rather than stored and tripped over later.
 *
 * Only the two groups the seed creates are linked today ("Shops" to store,
 * "Lagerort" to location). Adding a column here is deliberate work: it must be
 * a plain text column on Item, or the rename below writes nonsense into it.
 */
export const LINKABLE_ITEM_FIELDS = ["store", "location"] as const;
export type LinkableItemField = (typeof LINKABLE_ITEM_FIELDS)[number];

export function isLinkableItemField(value: unknown): value is LinkableItemField {
  return typeof value === "string" && (LINKABLE_ITEM_FIELDS as readonly string[]).includes(value);
}

/**
 * Carries a renamed list value into the records that hold it as text.
 *
 * Where a tag value is attached as a relation this happens by itself. A linked
 * group is the other case: the value also sits as text in a column on Item, and
 * renaming only the list entry left the two disagreeing - the list said "Dell",
 * the records still said "DELL", and the view showed both at once. There was no
 * way back to a single value.
 *
 * Scope follows ownership: a group of one user touches only that user's records,
 * a shared group (the seeded system groups, which carry no owner) touches every
 * record holding that text. A shared list that renames for one person only
 * would leave exactly the split this is meant to close.
 */
export async function renameLinkedItemField(
  tx: Prisma.TransactionClient,
  groupId: string,
  oldValue: string,
  newValue: string,
): Promise<number> {
  if (oldValue === newValue) return 0;

  const group = await tx.tagGroup.findUnique({
    where: { id: groupId },
    select: { linkedField: true, userId: true },
  });
  if (!group?.linkedField || !isLinkableItemField(group.linkedField)) return 0;

  const field: LinkableItemField = group.linkedField;
  const { count } = await tx.item.updateMany({
    where: {
      [field]: oldValue,
      ...(group.userId ? { userId: group.userId } : {}),
    },
    data: { [field]: newValue },
  });
  return count;
}
