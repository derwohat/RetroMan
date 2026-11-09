// Tests for version-check-due.mjs — run with: node --test .github/scripts/version-check-due.test.mjs
// Covers the rules of KONTOR's version_check_due.py (month clamp, newest entry,
// future date as error, exit codes, workflow outputs), plus the cases a
// hand-written date check in JavaScript can get wrong (31.02., leap day).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addOneMonth, EXIT_INVALID, EXIT_OK, formatDate, main, newestCheck, parseDate, protocolDates, ProtocolError,
} from "./version-check-due.mjs";

const d = (text) => parseDate(text);
const protokoll = (zeilen) =>
  ["# Versionspflege", "", "## Protokoll", "", "| Datum | Durch |", "|---|---|", ...zeilen, "", "## Danach", "| 01.01.2099 | x |"].join("\n");

test("ein Kalendermonat, am Monatsende abgeschnitten", () => {
  assert.equal(formatDate(addOneMonth(d("07.11.2026"))), "07.12.2026");
  assert.equal(formatDate(addOneMonth(d("15.12.2026"))), "15.01.2027");
  assert.equal(formatDate(addOneMonth(d("31.01.2027"))), "28.02.2027");
  assert.equal(formatDate(addOneMonth(d("31.01.2028"))), "29.02.2028");
  assert.equal(formatDate(addOneMonth(d("31.03.2027"))), "30.04.2027");
});

test("nur die Tabelle unter „## Protokoll“ zählt", () => {
  const dates = protocolDates(protokoll(["| 09.11.2026 | a |", "| 07.10.2026 | b |"]));
  assert.deepEqual(dates.map(formatDate), ["09.11.2026", "07.10.2026"]);
});

test("neuester Eintrag gewinnt, unabhängig von der Reihenfolge", () => {
  const md = protokoll(["| 07.10.2026 | a |", "| 09.11.2026 | b |"]);
  assert.equal(formatDate(newestCheck(md, d("10.11.2026"))), "09.11.2026");
});

test("fehlender Abschnitt, leeres Protokoll und Zukunft sind Fehler", () => {
  assert.throws(() => protocolDates("# nichts"), ProtocolError);
  assert.throws(() => newestCheck(protokoll([]), d("10.11.2026")), ProtocolError);
  assert.throws(() => newestCheck(protokoll(["| 10.12.2026 | a |"]), d("10.11.2026")), /Zukunft/);
});

test("ein Datum, das es nicht gibt, ist ein Fehler", () => {
  assert.throws(() => protocolDates(protokoll(["| 31.02.2026 | a |"])), ProtocolError);
  assert.throws(() => parseDate("29.02.2027"), ProtocolError);
});

test("main: fällig, nicht fällig, Ausgaben für den Workflow", () => {
  const dir = mkdtempSync(join(tmpdir(), "vcd-"));
  const file = join(dir, "Versionspflege.md");
  const out = join(dir, "out.txt");
  writeFileSync(file, protokoll(["| 09.11.2026 | a |"]), "utf8");
  const vorher = process.env.GITHUB_OUTPUT;
  process.env.GITHUB_OUTPUT = out;
  try {
    assert.equal(main(["--file", file, "--today", "08.12.2026"]), EXIT_OK);
    assert.match(readFileSync(out, "utf8"), /due=false\nlast=09\.11\.2026\ndue_on=09\.12\.2026\n/);
    writeFileSync(out, "", "utf8");
    assert.equal(main(["--file", file, "--today", "09.12.2026"]), EXIT_OK);
    assert.match(readFileSync(out, "utf8"), /due=true/);
    assert.equal(main(["--file", join(dir, "fehlt.md"), "--today", "09.12.2026"]), EXIT_INVALID);
  } finally {
    if (vorher === undefined) delete process.env.GITHUB_OUTPUT;
    else process.env.GITHUB_OUTPUT = vorher;
  }
});
