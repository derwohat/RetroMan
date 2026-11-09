# Versionspflege

Monatlicher Versions- und Upgrade-Check nach dem Man-Suite Codebook,
`docs/project-workflow.md` § „Monatlicher Versions- und Upgrade-Check“. Fällig ist der nächste
Check einen Kalendermonat nach dem neuesten **vollständigen** Eintrag im Protokoll unten.

> **Stand 09.11.2026: Ein vollständiger Check steht noch aus und ist fällig.** Die beiden
> Einträge unten sind Teil-Checks (nur Pakete). Offen ist vor allem Node 20, siehe Protokoll.

## Checkliste

1. **Laufzeiten**
   - Node: `docker/Dockerfile` (alle vier Stufen `node:20-slim`) und `package.json`
     (`@types/node`). Release-Linie und Support-Phase laut https://nodejs.org/en/about/previous-releases
     und den Tags von https://hub.docker.com/_/node.
   - PostgreSQL: `docker-compose.yml` (`postgres:16-alpine`). Neue Hauptversion nur über
     Sicherung und Wiederherstellung, nie durch Umstellen des Abbilds.
2. **Basisabbilder:** `docker build --pull -f docker/Dockerfile .` und das Ergebnis scannen.
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

## Protokoll

Neuester Eintrag oben.

| Datum | Durch | Ergebnis | Entscheidung | Release |
|---|---|---|---|---|
| 09.11.2026 | Claude Code mit Dennis | **Teil-Check, nur Pakete** (Anlass: `npm audit`). Im Betrieb 33 Meldungen, 4 kritisch, danach 0. `next` 16.2.9 → 16.4.5 (u. a. Proxy-Umgehung GHSA-6gpp-xcg3-4w24 — RetroMans Anmeldesperre sitzt im Proxy), `next-auth` beta.31 → beta.32 mit `@auth/core` 0.41.2 → 0.41.3, `nodemailer` 9.1.1 → 10.4.0 (Adressparser: Anzeigetext wurde zum Empfänger u. a.), `shadcn` zu den devDependencies (nur dessen CSS wird beim Bauen gebraucht), `npm audit fix`. Übrig: 13 mittlere/niedrige Meldungen in Entwicklungswerkzeugen. **Nicht geprüft:** Laufzeiten, Basisabbilder, Actions. | Umgesetzt und gegen den Produktions-Build geprüft (Anmeldung, Proxy-Sperre mit Pfad-Tricks, Mailversand samt Umschlag). **Offen für den vollen Check:** Node 20 (Build und Laufzeit) hat seit 30.04.2026 keinen Support mehr — Upgrade auf die aktuelle LTS als eigene Entscheidung. | v1.9.3 |
| 09.11.2026 | Claude Code mit Dennis | Bestandsaufnahme beim ersten Eintrag der Trilium-Note „Abhängigkeiten“: `next-intl`, `@base-ui/react`, `lucide-react`, `@auth/prisma-adapter` nirgends importiert. | Entfernt. | v1.9.2 |
