/**
 * Is the monthly version check due?
 *
 * Codebook project-workflow.md "Monatlicher Versions- und Upgrade-Check": the
 * next check is due one calendar month after the newest entry of the protocol
 * in docs/Versionspflege.md (07.11. -> 07.12., 31.01. -> 28.02.).
 *
 * A port of KONTOR's .github/scripts/version_check_due.py to Node, same rules
 * and exit codes: RetroMan is a Node project, and this keeps the script
 * runnable and testable where the code is written. Node built-ins only, so it
 * runs on the plain GitHub runner without installing anything.
 *
 * Usage: node version-check-due.mjs [--file PATH] [--today TT.MM.JJJJ]
 *
 * Prints one readable line. When GITHUB_OUTPUT is set, also writes
 * due=true|false, last=TT.MM.JJJJ and due_on=TT.MM.JJJJ for the workflow.
 *
 * Exit codes: 0 checked (due or not), 2 protocol missing, empty or invalid.
 * A date in the future counts as invalid: it would silence the reminder forever.
 */

import { appendFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const EXIT_OK = 0;
export const EXIT_INVALID = 2;
const PROTOCOL_HEADING = "## Protokoll";
const DATE_CELL = /^\|\s*(\d{2})\.(\d{2})\.(\d{4})\s*\|/;
const DEFAULT_PROTOCOL = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "Versionspflege.md");

/** The protocol cannot tell when the last check was; the message says why. */
export class ProtocolError extends Error {}

/** A calendar date in UTC, or null when the parts name no real day (31.02.). */
export function makeDate(day, month, year) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? date : null;
}

export function formatDate(date) {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getUTCFullYear()}`;
}

export function parseDate(text) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text.trim());
  const date = match ? makeDate(Number(match[1]), Number(match[2]), Number(match[3])) : null;
  if (!date) throw new ProtocolError(`Ungültiges Datum: ${text}`);
  return date;
}

/** Same day next month, clamped to that month's last day (31.01. -> 28.02.). */
export function addOneMonth(date) {
  const year = date.getUTCMonth() === 11 ? date.getUTCFullYear() + 1 : date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1) % 12; // 0-based
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

/** All dates in the first column of the table under "## Protokoll". */
export function protocolDates(markdown) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === PROTOCOL_HEADING);
  if (start === -1) throw new ProtocolError(`Abschnitt „${PROTOCOL_HEADING}“ fehlt.`);
  const dates = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    const match = DATE_CELL.exec(line.trim());
    if (!match) continue;
    const date = makeDate(Number(match[1]), Number(match[2]), Number(match[3]));
    if (!date) throw new ProtocolError(`Ungültiges Datum im Protokoll: ${match[1]}.${match[2]}.${match[3]}`);
    dates.push(date);
  }
  return dates;
}

/** The newest protocol date; fails if there is none or it lies in the future. */
export function newestCheck(markdown, today) {
  const dates = protocolDates(markdown);
  if (dates.length === 0) throw new ProtocolError("Das Protokoll hat noch keinen Eintrag.");
  const newest = new Date(Math.max(...dates.map((d) => d.getTime())));
  if (newest > today) {
    throw new ProtocolError(
      `Der neueste Eintrag (${formatDate(newest)}) liegt in der Zukunft; so bliebe die Erinnerung für immer stumm.`,
    );
  }
  return newest;
}

function writeOutputs(values) {
  const target = process.env.GITHUB_OUTPUT;
  if (!target) return;
  appendFileSync(target, Object.entries(values).map(([k, v]) => `${k}=${v}\n`).join(""), "utf8");
}

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function main(argv) {
  let file = DEFAULT_PROTOCOL;
  let todayText = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file") file = argv[++i];
    else if (argv[i] === "--today") todayText = argv[++i];
  }
  let today;
  let last;
  try {
    today = todayText ? parseDate(todayText) : todayUtc();
    last = newestCheck(readFileSync(file, "utf8"), today);
  } catch (error) {
    // Unreadable file or protocol: a failed job beats a silent reminder.
    console.error(`Versions-Check: ${file} nicht auswertbar: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_INVALID;
  }
  const dueOn = addOneMonth(last);
  const due = today >= dueOn;
  writeOutputs({ due: due ? "true" : "false", last: formatDate(last), due_on: formatDate(dueOn) });
  console.log(`Versions-Check ${due ? "fällig" : "nicht fällig"}: letzter am ${formatDate(last)}, fällig ab ${formatDate(dueOn)}.`);
  return EXIT_OK;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}

