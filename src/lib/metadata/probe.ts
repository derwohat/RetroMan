import https from "node:https";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto/encryption";

/**
 * A test request against each external service, so an administrator can tell
 * whether a key actually works — Codebook docs/product-standards.md,
 * "Anleitungen zu Fremddiensten": the form alone (an open set of instructions)
 * is only half of it; the other half is proof that the setting took effect.
 * Without it a wrong key shows up as "no cover found" weeks later, and whoever
 * looks for the cause looks in the wrong place.
 *
 * Two rules this follows, both taken from the mail probe, which answers the
 * same question for SMTP:
 *
 *  - The service's OWN wording goes back unchanged. "401 Invalid API key" says
 *    what to change; "could not connect" says nothing.
 *  - The request is the one the app really makes, with the same authentication
 *    and the same endpoint. A probe that asks differently proves nothing about
 *    what will happen later.
 *
 * A key that is not set is answered without a request at all: nothing would be
 * learned, and some of these services count every call against a quota.
 */

export const PROBE_SERVICES = [
  "discogsApiKey",
  "theGamesDbKey",
  "tmdbApiKey",
  "omdbApiKey",
  "comicVineKey",
  "googleBooksKey",
] as const;

export type ProbeService = (typeof PROBE_SERVICES)[number];

export function isProbeService(value: unknown): value is ProbeService {
  return typeof value === "string" && (PROBE_SERVICES as readonly string[]).includes(value);
}

export type ProbeOutcome = {
  /** Three outcomes, not two — see MailOutcome for why that matters. */
  status: "ok" | "failed" | "notConfigured";
  /** HTTP status where there was one. */
  httpStatus?: number;
  /** The service's own words, kept as they came. */
  message?: string;
};

const TIMEOUT_MS = 8000;
const UA = "RetroMan/1.0";

/** Keeps a service's answer readable without letting it fill the page. */
function kurz(text: string, max = 300): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/**
 * ComicVine refuses an ordinary fetch (and the app has always gone through
 * this path for it): forced IPv4, a plain User-Agent and no compression.
 */
function httpsGet(url: string): Promise<{ status: number; body: string }> {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "GET",
        family: 4,
        headers: { "User-Agent": UA, Accept: "application/json", "Accept-Encoding": "identity", Connection: "close" },
      },
      (res) => {
        let body = "";
        res.on("data", (c: Buffer) => { body += c.toString(); });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.setTimeout(TIMEOUT_MS, () => { req.destroy(new Error(`Zeitüberschreitung nach ${TIMEOUT_MS} ms`)); });
    req.on("error", reject);
    req.end();
  });
}

/** Pulls the service's own message out of whatever shape it answers in. */
function meldung(body: string): string {
  try {
    const j = JSON.parse(body);
    const kandidat =
      j.status_message ?? // TMDB
      j.Error ?? // OMDb
      j.error?.message ?? // Google Books
      (typeof j.error === "string" ? j.error : undefined) ?? // ComicVine, Discogs
      j.message ??
      j.status?.toString();
    if (typeof kandidat === "string" && kandidat.trim()) return kurz(kandidat);
  } catch {
    // Not JSON — then the raw text is the best answer there is.
  }
  return kurz(body) || "(keine Meldung)";
}

type Prober = (key: string) => Promise<ProbeOutcome>;

const PROBER: Record<ProbeService, Prober> = {
  // The cheapest authenticated call each service has, and the same
  // authentication the app uses in src/app/api/metadata/search/route.ts.
  async discogsApiKey(key) {
    const res = await fetch("https://api.discogs.com/database/search?q=a&per_page=1", {
      headers: { Authorization: `Discogs token=${key}`, "User-Agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.text().catch(() => "");
    return res.ok
      ? { status: "ok", httpStatus: res.status }
      : { status: "failed", httpStatus: res.status, message: meldung(body) };
  },

  async theGamesDbKey(key) {
    const p = new URLSearchParams({ apikey: key, name: "a", fields: "overview" });
    const res = await fetch(`https://api.thegamesdb.net/v1/Games/ByGameName?${p}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.text().catch(() => "");
    return res.ok
      ? { status: "ok", httpStatus: res.status }
      : { status: "failed", httpStatus: res.status, message: meldung(body) };
  },

  async tmdbApiKey(key) {
    const res = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.text().catch(() => "");
    return res.ok
      ? { status: "ok", httpStatus: res.status }
      : { status: "failed", httpStatus: res.status, message: meldung(body) };
  },

  async omdbApiKey(key) {
    // OMDb answers 200 even for a bad key and puts the verdict in the body.
    const res = await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&t=matrix`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.text().catch(() => "");
    let abgelehnt = !res.ok;
    try {
      abgelehnt = abgelehnt || JSON.parse(body).Response === "False";
    } catch {
      abgelehnt = true;
    }
    return abgelehnt
      ? { status: "failed", httpStatus: res.status, message: meldung(body) }
      : { status: "ok", httpStatus: res.status };
  },

  async comicVineKey(key) {
    // ComicVine answers HTTP 200 with {"error":"Invalid API Key"}. Reading the
    // status alone would wave a wrong key through as working.
    const p = new URLSearchParams({ api_key: key, format: "json", query: "a", resources: "issue", limit: "1" });
    const { status, body } = await httpsGet(`https://comicvine.gamespot.com/api/search/?${p}`);
    let fehler: string | null = null;
    try {
      const j = JSON.parse(body);
      if (j.error && j.error !== "OK") fehler = String(j.error);
    } catch {
      fehler = kurz(body) || "Antwort war kein JSON";
    }
    if (status >= 400) fehler = fehler ?? meldung(body);
    return fehler
      ? { status: "failed", httpStatus: status, message: kurz(fehler) }
      : { status: "ok", httpStatus: status };
  },

  async googleBooksKey(key) {
    const p = new URLSearchParams({ q: "a", maxResults: "1", printType: "books", key });
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${p}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.text().catch(() => "");
    return res.ok
      ? { status: "ok", httpStatus: res.status }
      : { status: "failed", httpStatus: res.status, message: meldung(body) };
  },
};

/**
 * Runs the probe for one service with the key that is actually stored.
 *
 * Never throws: a network fault is a result the admin needs to see, not an
 * exception that turns into a bare 500 with nothing in it.
 */
export async function probeService(service: ProbeService): Promise<ProbeOutcome> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  const gespeichert = settings?.[service];
  if (!gespeichert) return { status: "notConfigured" };

  let key: string;
  try {
    key = decrypt(gespeichert);
  } catch {
    // The stored value cannot be read with the current ENCRYPTION_KEY. Saying
    // so is the whole point — otherwise this looks like a rejected key and
    // somebody goes looking for a new one at the service.
    return {
      status: "failed",
      message: "Der gespeicherte Schlüssel lässt sich nicht entschlüsseln — ENCRYPTION_KEY passt nicht zu den gespeicherten Daten. Bitte den Schlüssel neu eintragen.",
    };
  }

  try {
    return await PROBER[service](key);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    return { status: "failed", message: kurz(text) };
  }
}
