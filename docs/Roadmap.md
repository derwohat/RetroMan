# RetroMan — Roadmap

Stand: 13.11.2026 · Grundlage: der ursprüngliche Bauplan vom Juni 2026 (`PLAN.md`, mit Commit
6531661 entfernt, lesbar mit `git show 6531661^:PLAN.md`), [changelog.ts](../src/data/changelog.ts)
und die Git-Tags.

> **Konvention:** Jede spätere Änderung wird mit einem roten Zeitstempel hinter dem betroffenen
> Eintrag gekennzeichnet: `<span style="color:red">(TT.MM.JJJJ, HH:MM)</span>`. Gestrichene Punkte
> bleiben durchgestrichen stehen.
>
> Zielversionen sind Vorschläge; die tatsächliche Version wird vor jedem Push abgefragt.

Dieses Dokument ist die **Quelle der Planung**. Die Seite „RetroMan Roadmap“ (privates Artifact,
Codebook `project-workflow.md` § „Roadmap-Seite für alle Beteiligten“) ist seine abgehakte, leicht
lesbare Sicht für alle Beteiligten. Sie wird mit dem Skill `roadmap` aus [roadmap.json](roadmap.json)
gebaut und nach jedem Release fortgeschrieben. Weichen beide voneinander ab, gilt dieses Dokument, und
`roadmap.json` wird nachgezogen.

**Neue Punkte** kommen zuerst hierher (mit Zeitstempel), danach in `roadmap.json`: ans Ende, wenn kein
anderer Punkt auf sie wartet, sonst an die Stelle, an die sie fachlich gehören. Offene Punkte dahinter
rücken mit ihrer Version auf; erledigte und begonnene Punkte werden nie umnummeriert.

## Überblick

| Abschnitt | Versionen | Stand |
|---|---|---|
| Grundbau | 0.0–0.4 | erledigt, 10.–23.06.2026 |
| Mehrere Benutzer | 0.5–0.8 | erledigt, 12.07.–11.08.2026 |
| Weg zu Version 1.0 | 0.9–1.0 | erledigt, 21.09.–20.10.2026 |
| Im Alltag | 1.1–1.4 | erledigt, 26.–30.10.2026 |
| Feinschliff und Pflege | 1.5–1.10.1 | erledigt, 04.–12.11.2026 |
| Geplant | 1.10.2–1.17 | offen |

## Erledigt

Nur die Linie; was jede Version im Einzelnen gebracht hat, steht in
[changelog.ts](../src/data/changelog.ts).

### Grundbau

- [x] 0.0 — Bauplan mit acht Bauabschnitten (10.06.2026)
- [x] 0.1 — Erste Fassung mit allen Grundfunktionen (16.06.2026, Tag 0.1.0)
- [x] 0.1.x — Drei Sprachen, Handy-Ansicht, mehr Datenquellen; Wunschliste bewusst entfernt
  (0.1.2–0.1.9, bis 19.06.2026)
- [x] 0.2 — Suche nach Jahr, Tags, Shop und Lagerort (19.06.2026)
- [x] 0.3 — Drei Farbthemen: Retro 80s, Retro 90s, Modern (19.06.2026)
- [x] 0.4 — Strichcode-Scanner auf dem Handy (0.4.0–0.4.4, 23.06.2026)

### Mehrere Benutzer

- [x] 0.5 — Eigene Sammlungen und Tags für jede Person (12.07.2026)
- [x] 0.6 — Benutzerverwaltung mit Einmal-Passwort und Erstanmeldung (0.6.0–0.6.6, 12.07.2026)
- [x] 0.7 — Neue Sammlung direkt anlegen, Zähler im Menü (0.7.0–0.7.8, 13.07.2026)
- [x] 0.8 — Anmeldung mit Benutzername statt E-Mail-Adresse (0.8.0–0.8.2, 11.08.2026)

### Weg zu Version 1.0

- [x] 0.9 — Passwort vergessen: neuer Zugang per E-Mail (21.09.2026)
- [x] 0.10 — Argon2id und Sperre nach Fehlversuchen (0.10.0–0.10.1, 21.09.2026)
- [x] 1.0 — Erste stabile Version (1.0.0–1.0.2, 20.10.2026, Tag v1.0.0)

### Im Alltag

- [x] 1.1 — Kaufdatum, Strichcode-Eingabe, Schutz vor Datenverlust (26.10.2026)
- [x] 1.2 — Anmeldung über beide Wege, Installationsanleitung (1.2.0–1.2.3, 27.10.2026)
- [x] 1.3 — Neues Gesicht und sichere Installation (29.10.2026)
- [x] 1.4 — Bilder nur noch nach Anmeldung erreichbar (1.4.0–1.4.1, 30.10.2026)

### Feinschliff und Pflege

- [x] 1.5 — Alle Einstellungen an einer Stelle (1.5.0–1.5.1, 04.11.2026)
- [x] 1.6 — Einladung per E-Mail und sichere Kontoverwaltung (1.6.0–1.6.3, 04.11.2026)
- [x] 1.7 — Zugangsschlüssel für Datenbanken per Knopf prüfen (04.11.2026)
- [x] 1.8 — Seitenleiste folgt sofort, Gruppen bleiben zugeklappt (1.8.0–1.8.1, 04.11.2026)
- [x] 1.9 — Status „CIB“, verstellbare Karten, aufgeräumte Tags (1.9.0–1.9.1, 07.11.2026)
- [x] 1.9.x — Sicherheitsupdates und monatlicher Versions-Check (1.9.2–1.9.5, 09.11.2026)
- [x] 1.10 — Umstieg auf Node.js 26 (09.11.2026, Tag v1.10.0)
- [x] 1.10.1 — Lesbarer aktiver Menüpunkt, Reiterleiste im Profil (12.11.2026, Tag v1.10.1)

## Geplant

Abgeglichen am 12.11.2026 gegen den Bauplan und den Code, von Dennis am 13.11.2026 vollständig
übernommen. Je Punkt: was heute im Code steht (Ist), was geplant ist (Soll), was vorher zu klären ist.

### 1.10.2 — Korrekturversion

- [ ] **Ausgewählte Knöpfe überall gut lesbar.**
  - Ist: `bg-primary/10 text-primary` an sechs Stellen, dieselbe Kombination, die in 1.10.1 am
    Menü zu blass war: [admin/settings/page.tsx:604](../src/app/(app)/admin/settings/page.tsx#L604)
    und :633, [admin/users/page.tsx:300](../src/app/(app)/admin/users/page.tsx#L300),
    [profile/page.tsx:284](../src/app/(app)/profile/page.tsx#L284) und :288,
    [ItemForm.tsx:617](../src/components/items/ItemForm.tsx#L617).
  - Soll: Text in `text-primary-text` wie der aktive Menüpunkt (`ROW_ACTIVE`,
    [SidebarNavGroup.tsx:42](../src/components/layout/SidebarNavGroup.tsx#L42)), Kontrast in allen
    sechs Themes ≥ 4,5:1 im Browser gemessen.
  - Designänderung: vorher per Artifact bestätigen lassen.
- [ ] **Hinweis am Schalter „MFA für alle Benutzer erzwingen“: wirkt erst ab Version 1.11.**
  <span style="color:red">(13.11.2026, 05:40)</span>
  - Ist: Der Schalter wird gespeichert, aber nirgends gelesen (siehe 1.11). Ein Administrator hält
    die Zwei-Faktor-Anmeldung für Pflicht, obwohl sie es nicht ist.
  - Soll: Hinweistext unter dem Schalter
    ([admin/settings/page.tsx:651](../src/app/(app)/admin/settings/page.tsx#L651)) in allen drei
    Sprachen, bis 1.11 die Pflicht durchsetzt; mit 1.11 entfällt er wieder.
  - Designänderung: vorher per Artifact bestätigen lassen.
- [ ] **Admin-Einstellungen vor dem Speichern prüfen.** <span style="color:red">(13.11.2026, 05:40)</span>
  - Ist: `PUT /api/admin/settings` übernimmt jedes Feld außer `id` und `updatedAt` ungeprüft
    ([route.ts:71](../src/app/api/admin/settings/route.ts#L71)). Unbekannte Felder und falsche Typen
    enden als Datenbankfehler mit Status 500, eine kaputte Anfrage ebenso (`req.json()` ohne
    Abfangen). `donationUrl` und `githubUrl` werden ohne URL-Prüfung gespeichert. Nur für
    Administratoren erreichbar, Risiko deshalb gering.
  - Soll: feste Liste erlaubter Felder mit Typ, nach dem Vorbild von `validateSessionLimits`:
    Ja/Nein-Felder nur als Boolean, `fontSize` und `interfaceLanguage` nur aus ihrer Werteliste, Links
    nur `http(s)`. Alles andere wird mit Status 422 und einer lesbaren Meldung abgelehnt. Ohne neue
    Abhängigkeit.

### 1.11 — Zwei-Faktor-Pflicht durchsetzen

- [ ] Ist: `AppSettings.requireMfa` ([schema.prisma:168](../prisma/schema.prisma#L168)) wird auf
  der Einstellungsseite gesetzt und gespeichert, sonst liest ihn kein Code.
- [ ] Soll: Ist der Schalter an, führt jede Anmeldung eines Kontos ohne zweiten Faktor zuerst zur
  Einrichtung. Bis dahin sind alle anderen Seiten und Schnittstellen gesperrt, serverseitig geprüft
  und nicht nur in der Oberfläche. Der Hinweis aus 1.10.2 entfällt.
- [ ] Vorher: den Guide zu Middleware/Proxy in `node_modules/next/dist/docs/` lesen (siehe
  [AGENTS.md](../AGENTS.md)).
- Grundlage: `PLAN.md:281`.

### 1.12 — Gelöschte Konten endgültig entfernen, Datenschutzseite

- [ ] Ist: [me/delete/route.ts:20](../src/app/api/me/delete/route.ts#L20) setzt nur `deletedAt`;
  Sammlungen, Einträge, Bilder und persönliche Angaben bleiben unbegrenzt gespeichert.
- [ ] Soll: 30 Tage Frist, in der sich die Löschung rückgängig machen lässt. Danach wird das Konto
  mit allen Sammlungen, Einträgen und Bilddateien auf der Platte endgültig gelöscht, durch einen
  regelmäßigen Lauf im Server.
- [ ] Soll: Seite `/privacy`, die in einfachen Worten erklärt, was RetroMan speichert, wie lange, und
  welche externen Datenbanken bei einer Suche angefragt werden.
- [ ] Vorher klären: Wer macht eine Löschung rückgängig, die Person selbst durch erneute Anmeldung
  oder ein Administrator?
- Grundlage: `PLAN.md:293` und DSGVO-Abschnitt des Bauplans.

### 1.13 — Strengere Sicherheitsregeln für den Browser

- [ ] Ist: [next.config.ts:4](../next.config.ts#L4) setzt fünf Security-Header, aber weder
  `Content-Security-Policy` noch `Strict-Transport-Security`.
- [ ] Soll: CSP nach dem Next-Guide (Nonce für Skripte). `img-src` muss alles erlauben, woher Cover
  tatsächlich geladen werden, das vorher prüfen. HSTS nur bei verschlüsselter Verbindung, nicht auf
  der internen HTTP-Adresse (seit 1.2 sind beide Wege erlaubt).
- Grundlage: `PLAN.md:343`; Codebook `security.md`.

### 1.14 — Cover und Treffer passend zur eigenen Region, MobyGames

- [ ] Ist: `User.preferredRegion` ([schema.prisma:99](../prisma/schema.prisma#L99), Standard
  `PAL-EU`) und `CollectionSettings.regionOverride` (:371) sind angelegt, aber ohne Verwendung.
  `mobyGamesKey` wird gespeichert ([route.ts:10](../src/app/api/admin/settings/route.ts#L10)), aber
  nicht gelesen.
- [ ] Soll: Die Suche zeigt Treffer der eigenen Region zuerst, andere aufklappbar dahinter; je
  Sammlung umstellbar (z. B. eine Sammlung mit US-Importen). MobyGames als weitere Cover-Quelle für
  Spiele.
- Grundlage: `PLAN.md:47` und `:63`.

### 1.15 — Marktwert der Spiele über PriceCharting

- [ ] Wartet auf: einen Zugang zu PriceCharting (Schlüssel).
- [ ] Ist: `pricechartingKey` wird gespeichert, nichts liest ihn.
- [ ] Soll: Marktwert je Spiel holen und zwischenspeichern; die Statistik zeigt „Wert heute“ neben
  dem Kaufpreis.
- [ ] Vorher klären: Nutzungsbedingungen der Schnittstelle, wie oft aktualisiert wird.
- Grundlage: `PLAN.md:39` und Abschnitt Statistiken (Gesamtwert).

### 1.16 — Import aus Tabellen mit Spaltenzuordnung

- [ ] Ist: [import/route.ts](../src/app/api/import/route.ts) nimmt nur das eigene JSON-Format an.
- [ ] Soll: CSV hochladen, Spalten der Datei anzeigen, jeder Spalte ein Feld zuordnen (auch eigene
  Felder), Vorschau, dann importieren.
- [ ] Vorher klären: eine neue Abhängigkeit zum Lesen von CSV nur nach Absprache.
- Grundlage: `PLAN.md:258`.

### 1.17 — Foto der Grading-Hülle

- [ ] Ist: `GradingInfo.caseImagePath` ([schema.prisma:345](../prisma/schema.prisma#L345)) ist
  angelegt, aber ohne Verwendung; die Note selbst lässt sich schon eintragen.
- [ ] Soll: Foto der Hülle über den seit 1.4 geschützten Bildweg hochladen und im Eintrag zeigen.
- Grundlage: `PLAN.md:249`.

## Beim Abgleich nicht aufgenommen

Am 12.11.2026 aus dem Bauplan bewusst nicht übernommen:

- Wunschliste: in 0.1.9 absichtlich entfernt.
- Spenden-Link: schon umgesetzt (`AppSettings.donationUrl`).
- `CONTRIBUTING.md` und Abzeichen „Made with Claude Code“: geringer Nutzen für eine selbst
  betriebene App.
