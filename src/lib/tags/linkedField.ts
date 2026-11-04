import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

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

/**
 * How many records carry a list value — Codebook docs/data-standards.md,
 * "Dazu gehört eine Spalte „Verwendet"". Without it nobody can tell which
 * value is safe to delete, and it is also what makes the number in the merge
 * question believable.
 *
 * Counted on both sides, because RetroMan has both: the relation through
 * ItemTag, and the text column of a linked group. An item can appear in both
 * (the seeded groups work exactly that way), so the two sets are counted as
 * one set of item ids rather than added up — adding them reported twice the
 * truth for every seeded value.
 */
export async function countValueUsage(
  tx: Prisma.TransactionClient,
  groupId: string,
  value: string,
  valueId: string,
): Promise<number> {
  const group = await tx.tagGroup.findUnique({
    where: { id: groupId },
    select: { linkedField: true, userId: true },
  });
  if (!group) return 0;

  const ids = new Set<string>();
  const relations = await tx.itemTag.findMany({
    where: { tagValueId: valueId },
    select: { itemId: true },
  });
  for (const r of relations) ids.add(r.itemId);

  if (group.linkedField && isLinkableItemField(group.linkedField)) {
    const field: LinkableItemField = group.linkedField;
    const rows = await tx.item.findMany({
      where: { [field]: value, ...(group.userId ? { userId: group.userId } : {}) },
      select: { id: true },
    });
    for (const r of rows) ids.add(r.id);
  }
  return ids.size;
}

/**
 * Renaming onto a value that already exists MERGES the two instead of failing
 * — Codebook docs/data-standards.md, rule 2. Until now the unique index on
 * (groupId, value) turned this into an opaque 500, which is worse than the
 * "409 gibt es schon" the standard warns about: merging is the only way back
 * from duplicates that have already been created.
 *
 * Both carriers move:
 *  - the relations through ItemTag, where an item that already carries the
 *    target keeps one row rather than colliding with the composite key,
 *  - the text column of a linked group.
 *
 * The caller runs this inside a transaction and asks the user first; the
 * number in that question comes from countValueUsage above.
 *
 * @returns how many items were touched, and the id that survives
 */
export async function mergeTagValues(
  tx: Prisma.TransactionClient,
  groupId: string,
  fromValueId: string,
  intoValueId: string,
): Promise<{ movedItems: number; survivingId: string }> {
  const from = await tx.tagValue.findUnique({
    where: { id: fromValueId, groupId },
    select: { value: true },
  });
  const into = await tx.tagValue.findUnique({
    where: { id: intoValueId, groupId },
    select: { value: true },
  });
  if (!from || !into) throw new Error("Zusammenführen: ein Listenwert fehlt.");

  const quelle = await tx.itemTag.findMany({
    where: { tagValueId: fromValueId },
    select: { itemId: true },
  });
  const ziel = await tx.itemTag.findMany({
    where: { tagValueId: intoValueId },
    select: { itemId: true },
  });
  const hatZiel = new Set(ziel.map((r) => r.itemId));
  const betroffen = new Set(quelle.map((r) => r.itemId));

  // An item that already carries the target would collide with the composite
  // key (itemId, tagValueId), so its old row is dropped rather than moved.
  const doppelt = quelle.filter((r) => hatZiel.has(r.itemId)).map((r) => r.itemId);
  if (doppelt.length) {
    await tx.itemTag.deleteMany({
      where: { tagValueId: fromValueId, itemId: { in: doppelt } },
    });
  }
  await tx.itemTag.updateMany({
    where: { tagValueId: fromValueId },
    data: { tagValueId: intoValueId },
  });

  // The text column, if the group has one. Collected BEFORE the rewrite —
  // afterwards the old value is gone and the rows can no longer be found by
  // it, which would have left the count short by exactly those records.
  const group = await tx.tagGroup.findUnique({
    where: { id: groupId },
    select: { linkedField: true, userId: true },
  });
  if (group?.linkedField && isLinkableItemField(group.linkedField)) {
    const field: LinkableItemField = group.linkedField;
    const rows = await tx.item.findMany({
      where: { [field]: from.value, ...(group.userId ? { userId: group.userId } : {}) },
      select: { id: true },
    });
    for (const r of rows) betroffen.add(r.id);
  }
  await renameLinkedItemField(tx, groupId, from.value, into.value);

  await tx.tagValue.delete({ where: { id: fromValueId, groupId } });
  return { movedItems: betroffen.size, survivingId: intoValueId };
}

/**
 * Rule 3 — Codebook docs/data-standards.md: where the list is the source and
 * not merely a suggestion, the API checks it, not only the form. A select box
 * in the browser is a convenience, not an assurance; it is exactly through
 * that gap that three spellings of the same word arrived in IPMan.
 *
 * Applies to a field only while a group is actually linked to it and visible
 * to this user: a shared group (the seeded ones, which carry no owner) or the
 * user's own. No linked group means the column is free text, and nothing is
 * refused.
 *
 * An empty value always passes — "no shop" is a legitimate answer, and making
 * it unsayable would be a different bug.
 *
 * The bulk import is NOT run through this, deliberately. It brings in someone
 * else's stock, and failing a whole row over one unknown word makes it
 * useless; it files unknown values in the list instead, where they are
 * visible and can be tidied.
 */
export async function checkLinkedFieldValues(
  data: Record<string, unknown>,
  userId: string,
): Promise<{ ok: true } | { ok: false; field: LinkableItemField; message: string }> {
  for (const field of LINKABLE_ITEM_FIELDS) {
    const wert = data[field];
    if (typeof wert !== "string" || wert.trim() === "") continue;

    const group = await prisma.tagGroup.findFirst({
      where: { linkedField: field, OR: [{ userId: null }, { userId }] },
      select: { id: true, name: true },
    });
    if (!group) continue; // free text, no list behind it

    const treffer = await prisma.tagValue.findFirst({
      where: { groupId: group.id, value: wert.trim() },
      select: { id: true },
    });
    if (!treffer) {
      return {
        ok: false,
        field,
        message:
          `„${wert.trim()}“ steht nicht in der Liste „${group.name}“. ` +
          `Bitte einen vorhandenen Wert wählen oder ihn zuerst in der Liste anlegen.`,
      };
    }
  }
  return { ok: true };
}

/**
 * The other half of the import exemption — Codebook docs/data-standards.md,
 * rule 3: the bulk import does not refuse an unknown value, it FILES it in the
 * list, "wo sie sichtbar und aufräumbar sind". Without this the exemption
 * would just be a hole: the import would keep writing values that the list
 * never learns about, which is the state rule 3 exists to end.
 *
 * Idempotent, so a second import of the same stock adds nothing. Returns how
 * many values were newly filed, for the import's report.
 */
export async function fileUnknownLinkedValues(
  values: Array<Partial<Record<LinkableItemField, string | null>>>,
  userId: string,
): Promise<number> {
  let angelegt = 0;
  for (const field of LINKABLE_ITEM_FIELDS) {
    const gesehen = new Set(
      values
        .map((v) => v[field])
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .map((v) => v.trim()),
    );
    if (gesehen.size === 0) continue;

    const group = await prisma.tagGroup.findFirst({
      where: { linkedField: field, OR: [{ userId: null }, { userId }] },
      select: { id: true },
    });
    if (!group) continue;

    const vorhanden = new Set(
      (
        await prisma.tagValue.findMany({
          where: { groupId: group.id, value: { in: [...gesehen] } },
          select: { value: true },
        })
      ).map((v) => v.value),
    );
    const neu = [...gesehen].filter((v) => !vorhanden.has(v));
    if (neu.length === 0) continue;

    const letzte = await prisma.tagValue.findFirst({
      where: { groupId: group.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    let order = (letzte?.order ?? -1) + 1;
    await prisma.tagValue.createMany({
      data: neu.map((value) => ({ groupId: group.id, value, order: order++ })),
      skipDuplicates: true,
    });
    angelegt += neu.length;
  }
  return angelegt;
}

/**
 * The "Verwendet" count for every value of every group, in a fixed number of
 * queries rather than one per value — Codebook docs/data-standards.md asks for
 * the column and warns that it must not be in every request that fills a
 * select box, which is why the route asks for it explicitly.
 *
 * Two queries plus one per linked group. A linked group counts both carriers
 * as one set of item ids, for the reason countValueUsage gives: a seeded value
 * sits in both and would otherwise be reported twice.
 */
export async function usageByValueId(
  tx: Prisma.TransactionClient,
): Promise<Record<string, number>> {
  const relations = await tx.itemTag.findMany({ select: { tagValueId: true, itemId: true } });
  const perValue = new Map<string, Set<string>>();
  for (const r of relations) {
    const set = perValue.get(r.tagValueId) ?? new Set<string>();
    set.add(r.itemId);
    perValue.set(r.tagValueId, set);
  }

  const linked = await tx.tagGroup.findMany({
    where: { NOT: { linkedField: null } },
    select: { id: true, linkedField: true, userId: true, values: { select: { id: true, value: true } } },
  });
  for (const group of linked) {
    if (!group.linkedField || !isLinkableItemField(group.linkedField)) continue;
    const field: LinkableItemField = group.linkedField;
    // Both linkable columns are selected by name rather than through the
    // variable: a computed key makes Prisma's result type the union of every
    // field on Item, and the allow-list has exactly two entries anyway.
    const rows = await tx.item.findMany({
      where: {
        [field]: { in: group.values.map((v) => v.value) },
        ...(group.userId ? { userId: group.userId } : {}),
      },
      select: { id: true, store: true, location: true },
    });
    const nachWert = new Map<string, string[]>();
    for (const row of rows) {
      const text = field === "store" ? row.store : row.location;
      if (typeof text !== "string") continue;
      nachWert.set(text, [...(nachWert.get(text) ?? []), row.id]);
    }
    for (const v of group.values) {
      const set = perValue.get(v.id) ?? new Set<string>();
      for (const id of nachWert.get(v.value) ?? []) set.add(id);
      perValue.set(v.id, set);
    }
  }

  const out: Record<string, number> = {};
  for (const [id, set] of perValue) out[id] = set.size;
  return out;
}

/**
 * Rename a list value, or merge it into an existing one — rules 1 and 2 in one
 * place, because both the admin route and the user's own route need exactly
 * this and a second copy is how one of them ends up without rule 2.
 *
 * "needs-confirm" is returned BEFORE anything is written, so the caller can
 * ask the question without a rollback being involved.
 */
export type RenameValueResult =
  | { kind: "renamed" | "merged"; id: string; value: string; updatedItems: number }
  | { kind: "needs-confirm"; affectedItems: number; from: string; into: string }
  | { kind: "not-found" };

export async function renameOrMergeValue(
  tx: Prisma.TransactionClient,
  groupId: string,
  valueId: string,
  newValue: string,
  confirmMerge: boolean,
): Promise<RenameValueResult> {
  const vorher = await tx.tagValue.findUnique({
    where: { id: valueId, groupId },
    select: { value: true },
  });
  if (!vorher) return { kind: "not-found" };

  const ziel = await tx.tagValue.findFirst({
    where: { groupId, value: newValue, NOT: { id: valueId } },
    select: { id: true },
  });

  if (ziel) {
    if (!confirmMerge) {
      return {
        kind: "needs-confirm",
        affectedItems: await countValueUsage(tx, groupId, vorher.value, valueId),
        from: vorher.value,
        into: newValue,
      };
    }
    const { movedItems, survivingId } = await mergeTagValues(tx, groupId, valueId, ziel.id);
    return { kind: "merged", id: survivingId, value: newValue, updatedItems: movedItems };
  }

  const updated = await tx.tagValue.update({
    where: { id: valueId, groupId },
    data: { value: newValue },
  });
  const mitgeschrieben = await renameLinkedItemField(tx, groupId, vorher.value, newValue);
  return { kind: "renamed", id: updated.id, value: updated.value, updatedItems: mitgeschrieben };
}
