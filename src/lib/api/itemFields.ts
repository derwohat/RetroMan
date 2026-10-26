/**
 * Validation and coercion for the writable fields of an item.
 *
 * Both routes used to spread the request body straight into Prisma. That had
 * two consequences, one visible and one not:
 *
 *  - A date arrives from the form as `"2026-10-19"`, and Prisma wants a full
 *    ISO-8601 DateTime. Every attempt to save a purchase date answered 500
 *    with "Datenbankfehler beim Erstellen des Eintrags" — which is why not one
 *    of the existing entries carries one.
 *  - The spread sat *after* `userId` in the create call, so a body carrying
 *    its own `userId` overrode the session's and filed the entry under someone
 *    else's account.
 *
 * Everything the client may write is listed here, with the type it has to
 * become. Anything else is dropped rather than forwarded.
 */

const CONDITIONS = ["MINT", "VERY_GOOD", "GOOD", "USED", "POOR"] as const;
const ITEM_STATUSES = ["OPENED", "SEALED", "GRADED"] as const;
const COLLECTION_STATUSES = ["OWNED", "WISHLIST"] as const;

/** Upper bounds that keep a pasted novel out of a one-line column. */
const MAX_SHORT_TEXT = 500;
const MAX_LONG_TEXT = 20_000;
const MAX_QUANTITY = 10_000;
const MIN_YEAR = 1000;
const MAX_YEAR = 2999;

export type ItemFieldsResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; field: string; message: string };

function fail(field: string, message: string): ItemFieldsResult {
  return { ok: false, field, message };
}

/**
 * Accepts both what the form sends (`2026-10-19`) and a full timestamp.
 * Built in UTC on purpose: a local-midnight Date shifts the stored day
 * backwards for every positive offset, so a purchase on the 19th would come
 * back as the 18th for anyone east of Greenwich.
 */
function toDate(value: unknown): Date | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    // Date.UTC rolls 2026-02-31 over into March rather than refusing it.
    if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return undefined;
    return date;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toInt(value: unknown): number | null | undefined {
  if (value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return undefined;
  return n;
}

function toDecimal(value: unknown): number | null | undefined {
  if (value === null || value === "") return null;
  // A comma is what a German keyboard produces; the browser normalises it for
  // a number input, but the API is also reachable without one.
  const raw = typeof value === "string" ? value.replace(",", ".") : value;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function toText(value: unknown, max: number): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > max) return undefined;
  return trimmed;
}

/**
 * @param input the raw request body, minus the keys the route handles itself
 *   (`collectionId`, `title`, `imageUrl`, `tags`)
 */
export function parseItemFields(input: Record<string, unknown>): ItemFieldsResult {
  const data: Record<string, unknown> = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key);

  if (has("year")) {
    const year = toInt(input.year);
    if (year === undefined) return fail("year", "Das Jahr muss eine ganze Zahl sein.");
    if (year !== null && (year < MIN_YEAR || year > MAX_YEAR)) {
      return fail("year", `Das Jahr muss zwischen ${MIN_YEAR} und ${MAX_YEAR} liegen.`);
    }
    data.year = year;
  }

  if (has("purchaseDate")) {
    const date = toDate(input.purchaseDate);
    if (date === undefined) return fail("purchaseDate", "Das Kaufdatum ist kein gültiges Datum.");
    data.purchaseDate = date;
  }

  if (has("purchasePrice")) {
    const price = toDecimal(input.purchasePrice);
    if (price === undefined) return fail("purchasePrice", "Der Kaufpreis ist keine Zahl.");
    if (price !== null && price < 0) return fail("purchasePrice", "Der Kaufpreis darf nicht negativ sein.");
    data.purchasePrice = price;
  }

  if (has("quantity")) {
    const quantity = toInt(input.quantity);
    if (quantity === undefined) return fail("quantity", "Die Anzahl muss eine ganze Zahl sein.");
    if (quantity !== null && (quantity < 1 || quantity > MAX_QUANTITY)) {
      return fail("quantity", `Die Anzahl muss zwischen 1 und ${MAX_QUANTITY} liegen.`);
    }
    if (quantity !== null) data.quantity = quantity;
  }

  if (has("rating")) {
    const rating = toInt(input.rating);
    if (rating === undefined) return fail("rating", "Die Bewertung muss eine ganze Zahl sein.");
    if (rating !== null && (rating < 1 || rating > 5)) {
      return fail("rating", "Die Bewertung muss zwischen 1 und 5 liegen.");
    }
    data.rating = rating;
  }

  for (const [key, max] of [
    ["store", MAX_SHORT_TEXT],
    ["location", MAX_SHORT_TEXT],
    ["barcode", MAX_SHORT_TEXT],
    ["videoFormat", MAX_SHORT_TEXT],
    ["externalId", MAX_SHORT_TEXT],
    ["externalSource", MAX_SHORT_TEXT],
    ["description", MAX_LONG_TEXT],
    ["notes", MAX_LONG_TEXT],
  ] as const) {
    if (!has(key)) continue;
    const text = toText(input[key], max);
    if (text === undefined) return fail(key, `Der Wert für „${key}" ist zu lang oder kein Text.`);
    data[key] = text;
  }

  if (has("condition")) {
    const value = input.condition;
    if (value === null || value === "") data.condition = null;
    else if (typeof value === "string" && (CONDITIONS as readonly string[]).includes(value)) {
      data.condition = value;
    } else return fail("condition", "Unbekannter Zustand.");
  }

  if (has("itemStatus")) {
    const value = input.itemStatus;
    if (value === null || value === "") data.itemStatus = null;
    else if (typeof value === "string" && (ITEM_STATUSES as readonly string[]).includes(value)) {
      data.itemStatus = value;
    } else return fail("itemStatus", "Unbekannter Status.");
  }

  if (has("collectionStatus")) {
    const value = input.collectionStatus;
    if (typeof value === "string" && (COLLECTION_STATUSES as readonly string[]).includes(value)) {
      data.collectionStatus = value;
    } else return fail("collectionStatus", "Unbekannter Sammlungsstatus.");
  }

  if (has("isFavorite")) {
    if (typeof input.isFavorite !== "boolean") return fail("isFavorite", "Favorit muss ja oder nein sein.");
    data.isFavorite = input.isFavorite;
  }

  // Metadata comes from the external sources and is stored as it arrived; it
  // is never interpreted, only handed back to the client.
  if (has("metadata")) {
    const value = input.metadata;
    data.metadata = value === null || value === "" ? null : value;
  }

  return { ok: true, data };
}
