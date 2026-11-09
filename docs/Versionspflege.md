# Versionspflege

Monatlicher Versions- und Upgrade-Check nach dem Man-Suite Codebook,
`docs/project-workflow.md` § „Monatlicher Versions- und Upgrade-Check“. Fällig ist der nächste
Check einen Kalendermonat nach dem neuesten Eintrag im Protokoll unten. Daran erinnert
`.github/workflows/version-check.yml` (montags 06:00 UTC und auf Knopfdruck): Ist der Check
fällig, öffnet der Job ein Issue „Versions-Check fällig“, nie ein zweites, solange eins offen
ist. Das Datum liest `.github/scripts/version-check-due.mjs` (Tests:
`node --test .github/scripts/version-check-due.test.mjs`, laufen auch in der CI).

> **Nächster Check fällig ab 09.12.2026.** Aus dem Check vom 09.11.2026 nichts mehr offen:
> Node 26 ist mit v1.10.0 umgesetzt (Trivy: 7 kritische → 0, verbleibende hohe ohne Debian-Fix).
>
> **Fürs nächste Release vorgemerkt:** `DEBIAN_FRONTEND=noninteractive` vor das `apt-get upgrade` der
> Laufzeit-Stufe (Codebook `operations.md` „OS-Pakete der Basis im Image-Build patchen“, nur für diesen
> einen Befehl, nicht als `ENV`). In der Praxis ohne Wirkung, weil ohne Terminal ohnehin nicht-interaktiv.

## Checkliste

1. **Laufzeiten**
   - Node: `docker/Dockerfile` (alle vier Stufen `node:26-slim`), `.github/workflows/ci.yml`
     (`node-version`) und `package.json` (`@types/node`) — immer dieselbe Hauptversion. Release-Linie und Support-Phase laut https://nodejs.org/en/about/previous-releases
     und den Tags von https://hub.docker.com/_/node.
   - PostgreSQL: `docker-compose.yml` (`postgres:16-alpine`). Neue Hauptversion nur über
     Sicherung und Wiederherstellung, nie durch Umstellen des Abbilds.
2. **Basisabbilder:** `docker build --pull -f docker/Dockerfile .` und das Ergebnis scannen,
   zum Vergleich auch das Basis-Abbild allein. Scanner ohne Installation und ohne Konto:
   `docker run --rm -v trivy-cache:/root/.cache aquasec/trivy:<version> image --scanners vuln --severity HIGH,CRITICAL <abbild>`
   (feste Version, nicht `latest`).
3. **Pakete:** `npm outdated` und `npm audit --omit=dev` (nur, was im Betrieb läuft). Eine
   Lücke mit verfügbarem Fix wartet nicht auf den nächsten Check.
4. **Werkzeuge und CI:** `.github/workflows/ci.yml` — `actions/checkout@v7`,
   `actions/setup-node@v7`, `docker/login-action@v4`, `docker/metadata-action@v6`,
   `docker/build-push-action@v7` gegen ihr neuestes Release; npm-Version.
5. **Suite-Abhängigkeiten:** keine (kein Brandbook-Preset, keine Git-Abhängigkeiten).
6. **Bewusste Ausnahmen** (Tabelle unten): Gilt der Grund noch?

Nach dem Check: Protokollzeile hier, dann die Trilium-Note „Abhängigkeiten“ fortschreiben.

## Bewusste Ausnahmen

| Komponente | Festlegung | Grund | Seit |
|---|---|---|---|
| `nodemailer` | `overrides` auf `^10.4.0` | `next-auth` verlangt für seinen (ungenutzten) E-Mail-Anbieter `^7`/`^8`. Die Festlegung erzwingt die reparierte Version; RetroMan nutzt nur den Credentials-Anbieter. Begründung auch in `src/lib/mailer.ts`. | 09.11.2026 (vorher `^9`) |
| `@auth/core` | devDependency, exakt die Version, die `next-auth` mitbringt (0.41.3) | Ohne die Festlegung legt npm eine zweite Kopie unter `next-auth` an, und die Sitzungstypen brechen. Bei jedem `next-auth`-Update mitziehen. | 21.09.2026 (v0.9.0) |
| `next-auth` | `5.0.0-beta.x` | Version 5 hat den Beta-Status nie verlassen, RetroMan baut darauf. Monatlich prüfen, ob es eine stabile Fassung gibt. | 10.06.2026 (Projektbeginn) |
| `eslint` | bleibt auf 9 (10 verfügbar) | Hauptversion eines Werkzeugs; eigener Schritt, sobald `eslint-config-next` 10 offiziell unterstützt. Läuft nicht im Betrieb. | 09.11.2026 |
| `typescript` | bleibt auf 5.9 (7 verfügbar) | Hauptversion mit neuem Compiler; eigener Schritt mit Prüfung gegen Next. Läuft nicht im Betrieb. | 09.11.2026 |
| `prisma` | bleibt auf 7 (8 nur als Release-Kandidat) | Kein stabiles Release; erst nach Erscheinen von 8.0.0 bewerten. | 09.11.2026 |

## Protokoll

Neuester Eintrag oben.

| Datum | Durch | Ergebnis | Entscheidung | Release |
|---|---|---|---|---|
| 09.11.2026 | Claude Code mit Dennis | **Vollständiger Check.** *Laufzeiten:* Node 20 seit 30.04.2026 ohne Support; Node 26 seit 28.10.2026 Active LTS (bis 30.04.2029), Node 24 Maintenance (bis 30.04.2028); alle Kernpakete lassen 26 zu (Prisma ≥ 24). PostgreSQL 16 unterstützt bis 11/2028, `16-alpine` liefert 16.15. *Basisabbilder (Trivy 0.76.1, HIGH/CRITICAL):* RetroMan 1.9.4 = `node:20-slim` mit 7 kritischen und 69 hohen Funden, alle geerbt (u. a. gnutls, perl, zlib, das npm-eigene tar); `node:26-slim` 0 kritisch, 54 hoch; `node:20-slim` seit 22.04.2026 nicht mehr aktualisiert. *Pakete:* 12 Patch/Minor im erlaubten Bereich, `react`/`react-dom` 19.2.4 → 19.3.1; Hauptversionen eslint 10, TypeScript 7, Prisma 8 (RC). *Actions:* alle auf der aktuellen Hauptversion. CI-Lint lief auf Node 22. | Bündel (12 Pakete + React) und CI-Erinnerung umgesetzt. **Node 26 beschlossen**, als eigenes Release auf einem Feature-Branch, CI-Node und `@types/node` ziehen mit; danach prüfen, ob `apt-get upgrade` die verbleibenden hohen Systemfunde schließt. Hauptversionen von Werkzeugen und Prisma 8 zurückgestellt (Ausnahmen oben). PostgreSQL bleibt. | v1.9.5 |
| 09.11.2026 | Claude Code mit Dennis | **Teil-Check, nur Pakete** (Anlass: `npm audit`). Im Betrieb 33 Meldungen, 4 kritisch, danach 0. `next` 16.2.9 → 16.4.5 (u. a. Proxy-Umgehung GHSA-6gpp-xcg3-4w24 — RetroMans Anmeldesperre sitzt im Proxy), `next-auth` beta.31 → beta.32 mit `@auth/core` 0.41.2 → 0.41.3, `nodemailer` 9.1.1 → 10.4.0 (Adressparser: Anzeigetext wurde zum Empfänger u. a.), `shadcn` zu den devDependencies (nur dessen CSS wird beim Bauen gebraucht), `npm audit fix`. Übrig: 13 mittlere/niedrige Meldungen in Entwicklungswerkzeugen. **Nicht geprüft:** Laufzeiten, Basisabbilder, Actions. | Umgesetzt und gegen den Produktions-Build geprüft (Anmeldung, Proxy-Sperre mit Pfad-Tricks, Mailversand samt Umschlag). **Offen für den vollen Check:** Node 20 (Build und Laufzeit) hat seit 30.04.2026 keinen Support mehr — Upgrade auf die aktuelle LTS als eigene Entscheidung. | v1.9.3 |
| 09.11.2026 | Claude Code mit Dennis | Bestandsaufnahme beim ersten Eintrag der Trilium-Note „Abhängigkeiten“: `next-intl`, `@base-ui/react`, `lucide-react`, `@auth/prisma-adapter` nirgends importiert. | Entfernt. | v1.9.2 |
