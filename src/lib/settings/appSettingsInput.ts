/**
 * What PUT /api/admin/settings may write into the settings row, and in which
 * shape.
 *
 * Security: this is the allow-list for that row. Up to 1.10.1 every key of the
 * request body went straight into `prisma.appSettings.upsert`, so an unknown
 * field or a wrong type surfaced as a database error (HTTP 500) and the link
 * fields took any string. Only admins reach the endpoint, but its input is
 * validated all the same: a field is accepted only if it is listed here, with
 * the type it is listed with.
 *
 * Kept free of database and framework imports so it can be checked on its own.
 * Range checks that need shared limits (session deadlines) stay with the
 * caller; this module only answers "is this a field, and is it the right kind
 * of value".
 */

/** API keys and secrets; stored encrypted and never sent back to the client. */
export const ENCRYPTED_FIELDS = [
  "tmdbApiKey", "igdbClientId", "igdbSecret",
  "discogsApiKey", "pricechartingKey", "theGamesDbKey", "mobyGamesKey",
  "googleSearchKey", "googleSearchCx", "omdbApiKey", "comicVineKey", "googleBooksKey",
] as const;

export const FONT_SIZES = ["small", "medium", "large"] as const;
export const INTERFACE_LANGUAGES = ["de", "en", "fr"] as const;

const URL_FIELDS = ["donationUrl", "githubUrl"] as const;
const BOOLEAN_FIELDS = ["requireMfa"] as const;
const INTEGER_FIELDS = ["sessionIdleMinutes", "sessionAbsoluteHours"] as const;
// A Map, not an object literal: a lookup by a client-chosen name such as
// "__proto__" must find nothing, not Object.prototype.
const CHOICE_FIELDS: ReadonlyMap<string, readonly string[]> = new Map<string, readonly string[]>([
  ["fontSize", FONT_SIZES],
  ["interfaceLanguage", INTERFACE_LANGUAGES],
]);

/** The real keys are well under 100 characters; anything near this is not a key. */
const MAX_SECRET_LENGTH = 512;
/** Longest link accepted for the donation and GitHub URL. */
const MAX_URL_LENGTH = 2048;
/** A field name is echoed in the error message, so it is cut to this length. */
const MAX_ECHOED_NAME_LENGTH = 64;

export type SettingsValue = string | number | boolean | null;

export type SettingsUpdateResult =
  | { ok: true; data: Record<string, SettingsValue> }
  | { ok: false; error: string };

function isOneOf<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

function quoted(name: string): string {
  return `„${name.slice(0, MAX_ECHOED_NAME_LENGTH)}“`;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** One field: either the value to store, or why it is refused. */
function parseField(
  key: string,
  value: unknown,
  encryptSecret: (plain: string) => string,
): { ok: true; value: SettingsValue } | { ok: false; error: string } {
  if (isOneOf(ENCRYPTED_FIELDS, key)) {
    if (value === null) return { ok: true, value: null };
    if (typeof value !== "string" || value.length === 0) {
      return { ok: false, error: `${quoted(key)} muss ein Schlüssel als Text sein, oder null zum Löschen.` };
    }
    if (value.length > MAX_SECRET_LENGTH) {
      return { ok: false, error: `${quoted(key)} ist länger als ${MAX_SECRET_LENGTH} Zeichen und kein gültiger Schlüssel.` };
    }
    return { ok: true, value: encryptSecret(value) };
  }

  if (isOneOf(URL_FIELDS, key)) {
    if (value === null || value === "") return { ok: true, value: null };
    if (typeof value !== "string" || value.length > MAX_URL_LENGTH || !isHttpUrl(value.trim())) {
      return { ok: false, error: `${quoted(key)} muss eine Webadresse mit http:// oder https:// sein, oder leer zum Löschen.` };
    }
    return { ok: true, value: value.trim() };
  }

  if (isOneOf(BOOLEAN_FIELDS, key)) {
    if (typeof value !== "boolean") {
      return { ok: false, error: `${quoted(key)} muss true oder false sein.` };
    }
    return { ok: true, value };
  }

  if (isOneOf(INTEGER_FIELDS, key)) {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      return { ok: false, error: `${quoted(key)} muss eine ganze Zahl sein.` };
    }
    return { ok: true, value };
  }

  const choices = CHOICE_FIELDS.get(key);
  if (choices) {
    if (typeof value !== "string" || !choices.includes(value)) {
      return { ok: false, error: `${quoted(key)} muss einer dieser Werte sein: ${choices.join(", ")}.` };
    }
    return { ok: true, value };
  }

  return { ok: false, error: `Unbekannte Einstellung ${quoted(key)}.` };
}

/**
 * Check a request body against the allow-list. Secrets come back already
 * encrypted by `encryptSecret`, so a plain key never reaches the caller's data.
 * The first refused field ends the check: nothing of a partly wrong request is
 * written.
 */
export function parseSettingsUpdate(
  body: unknown,
  encryptSecret: (plain: string) => string,
): SettingsUpdateResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Erwartet wird ein JSON-Objekt mit den Einstellungen, die sich ändern sollen." };
  }

  const data: Record<string, SettingsValue> = {};
  for (const [key, value] of Object.entries(body)) {
    const field = parseField(key, value, encryptSecret);
    if (!field.ok) return field;
    data[key] = field.value;
  }
  return { ok: true, data };
}
