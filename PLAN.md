# Plan: RetroMan — Collector Web App

## Context
RetroMan ist eine selbst-gehostete Web-App für Sammler physischer Medien. Sammler verwalten ihre Sammlung privat in einer zentralen Oberfläche. Ein Admin legt Accounts an. Die App läuft als Docker Container, wird auf GitHub veröffentlicht, und enthält einen Retro-Design-Stil (Mockup folgt via v0).

---

## Tech-Stack

| Komponente | Technologie | Begründung |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Full-Stack TypeScript, SSR, API Routes in einem Repo |
| Sprache | **TypeScript** | End-to-end Typsicherheit (Prisma → API → UI) |
| Datenbank | **PostgreSQL 16** | Robust, DSGVO-freundlich, Docker-ready |
| ORM | **Prisma** | Type-safe, Migrations, flexible JSON-Felder |
| Auth | **Auth.js v5** | Session, Credentials, erweiterbar für MFA |
| MFA | **otplib** + **qrcode** | TOTP (Google Authenticator kompatibel) |
| Styling | **Tailwind CSS** + **shadcn/ui** | Zugänglich, Retro-Theme anpassbar |
| i18n | **next-intl** | DE + EN, date format per User-Setting |
| Barcode | **@zxing/browser** | EAN/UPC Scan über Kamera im Mobile-Browser |
| Drag & Drop | **@dnd-kit** | Bild-Reihenfolge, Feld-Reihenfolge in Admin |
| Charts | **Recharts** | Statistik-Dashboard |
| Container | **Docker + Docker Compose** | Self-hosted Deployment |
| Reverse Proxy | **Nginx** | HTTPS-Termination, Static Files |
| CI/CD | **GitHub Actions** | Tests, Lint, Docker Image → ghcr.io |

---

## Metadata-APIs & Datenquellen

| Medium | API/Service | API Key? | Regionsunterstützung |
|---|---|---|---|
| Filme, Serien | **TMDB** | Kostenlos (Registrierung) | Hervorragend: `language=de-DE&region=DE`, lokalisierte Titel + Poster |
| Musik (CD/MC/Vinyl) | **Discogs** | Kostenlos (Registrierung) | Perfekt: Jede Pressung ist eine eigene Veröffentlichung mit Land + Cover |
| Musik (zusätzlich) | **MusicBrainz** | Kein Key | Cover Art Archive nach Release-Country filterbar |
| Spiele (primär) | **IGDB** | Twitch-Account (kostenlos) | Region-Feld auf Releases (PAL=Europa); Cover-DB bei alten PAL-Titeln lückenhaft |
| Spiele (Cover-Fallback) | **TheGamesDB** | Kostenlos (Registrierung) | Gute regionale Box-Art, starke Retro-Abdeckung |
| Spiele (Cover-Fallback 2) | **MobyGames** | Kostenlos (Registrierung) | Sehr umfangreich für Retro, detaillierte regionale Covers |
| Spiele (Preise) | **Pricecharting** | API Key (kostenlos) | PAL-Sektion für europäische Preise vorhanden |
| Bücher/Comics/Manga | **OpenLibrary** | Kein Key | Editions nach Sprache/Land filterbar |
| Barcode (EAN/UPC) | **UPCitemdb + Open EAN DB** | Kein Key | EAN-Codes sind bereits regional (DE-EANs = PAL) |

**Amazon & eBay: bewusst weggelassen** — keine freie API für unseren Anwendungsfall. Pricecharting deckt Game-Pricing ab; für Filme/Musik gibt es keine sinnvolle freie Alternative (Preise schwanken stark).

**API Keys werden im Admin-Bereich der App eingetragen** (verschlüsselt in DB gespeichert), nicht in `.env`. Jeder Key hat eine kurze Anleitung mit Link zum jeweiligen Service.

### Regionale Cover-Auflösungsstrategie (Games)

```
1. IGDB → suche Release mit matching Region (PAL für EU-User)
2. Falls IGDB-Cover leer/ungenügend → TheGamesDB → filter by region
3. Falls TheGamesDB leer → MobyGames → filter by region/country
4. Falls alle leer → User lädt manuell hoch
```

### Sprachpräferenz bei API-Anfragen
- TMDB: `language={userLang}-{userCountry}` + `region={userCountry}` (z.B. `de-DE`, `region=DE`)
- Discogs: `country=Germany` (oder User-Land) als Primärfilter, Fallback ohne Länderfilter
- IGDB: Region-Enum (PAL = 1 für Europa) auf `release_dates` endpoint
- OpenLibrary: `language:{lang}` Filter auf Editions
- User sieht immer zuerst regionsspezifische Ergebnisse; andere Regionen als "Weitere Ergebnisse" klappbar

### Regions-Einstellungen
- **Global**: User stellt in Profil-Einstellungen: bevorzugte Sprache + Region (z.B. Deutsch / PAL-Europa)
- **Pro Sammlung überschreibbar**: z.B. eine NTSC-Import-Sammlung kann auf Region USA umgestellt werden
- Gespeichert in: `User.preferredLanguage` / `User.preferredRegion` + `CollectionSettings.regionOverride`

---

## Datenbankmodell (Prisma-Schema Schlüsselmodelle)

```prisma
model User {
  id                 String    @id @default(cuid())
  email              String    @unique
  name               String
  passwordHash       String
  mustChangePassword Boolean   @default(true)
  mfaEnabled         Boolean   @default(false)
  mfaSecret          String?   // AES-verschlüsselt
  role               Role      @default(USER)
  preferredLanguage  String    @default("de")
  preferredRegion    String    @default("PAL-EU") // PAL-EU | NTSC-U | NTSC-J | ...
  dateFormat         DateFormat @default(EUROPEAN)
  gdprConsentAt      DateTime?
  deletedAt          DateTime? // Soft Delete
  items              Item[]
  viewSettings       CollectionViewSettings[]
  collectionSettings CollectionSettings[]
}

model AppSettings {
  id               String  @id @default("singleton")
  tmdbApiKey       String? // verschlüsselt
  igdbClientId     String?
  igdbSecret       String?
  discogsApiKey    String?
  pricechartingKey String?
  theGamesDbKey    String?
  mobyGamesKey     String?
  donationUrl      String?
  githubUrl        String?
  requireMfa       Boolean @default(false)
}

// Region-Override auf Collection-Ebene
// ergänzt User.preferredLanguage + User.preferredRegion
model CollectionSettings {
  id             String   @id @default(cuid())
  userId         String
  categoryId     String
  regionOverride String?  // z.B. "NTSC-U" für eine US-Import-Sammlung
  @@unique([userId, categoryId])
}

model Category {
  id        String          @id @default(cuid())
  nameKey   String          @unique // i18n key
  icon      String?
  mediaType MediaType       // bestimmt verfügbare View-Typen
  fields    CategoryField[] // benutzerdefinierte Felder
  items     Item[]
  viewSettings CollectionViewSettings[]
}

model CategoryField {
  id         String    @id @default(cuid())
  categoryId String
  name       String    // direkt lokalisiert oder i18n key
  fieldKey   String    // z.B. "platform", "publisher"
  fieldType  FieldType // TEXT | NUMBER | DATE | SELECT | BOOLEAN | TEXTAREA
  options    String[]  // für SELECT-Typ
  order      Int       // Drag-and-Drop-Reihenfolge
  required   Boolean   @default(false)
}

model Item {
  id              String    @id @default(cuid())
  userId          String
  categoryId      String
  title           String
  year            Int?
  purchaseDate    DateTime?
  purchasePrice   Decimal?
  store           String?   // Freitext, Autocomplete aus bisherigen Einträgen
  condition       Condition?
  itemStatus      ItemStatus?
  location        String?   // Lagerort
  quantity        Int       @default(1)
  barcode         String?
  description     String?
  notes           String?
  rating          Int?      // 1–10
  collectionStatus CollectionStatus @default(OWNED)
  isFavorite      Boolean   @default(false)
  externalId      String?   // z.B. TMDB-ID
  externalSource  String?   // "tmdb" | "discogs" | "igdb" | ...
  metadata        Json?     // flexible Zusatzdaten aus API
  images          ItemImage[]
  tags            ItemTag[]
  grading         GradingInfo?
  customFields    ItemCustomField[] // Werte für CategoryFields
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model ItemImage {
  id        String  @id @default(cuid())
  itemId    String
  url       String?      // externe URL (z.B. von API)
  filePath  String?      // lokaler Upload (Docker Volume)
  order     Int          // Drag-and-Drop-Reihenfolge
  isPrimary Boolean      @default(false)
}

model GradingInfo {
  id            String    @id @default(cuid())
  itemId        String    @unique
  service       String    // "VGA" | "WATA" | "CGC" | ...
  score         String    // "85+" | "9.0 A+" | ...
  gradedAt      DateTime?
  caseImagePath String?
}

model CollectionViewSettings {
  id          String    @id @default(cuid())
  userId      String
  categoryId  String
  viewType    ViewType
  visibleTags String[]  // fieldKeys die als Chips angezeigt werden
  sortBy      String    @default("title")
  sortOrder   SortOrder @default(ASC)
  @@unique([userId, categoryId, viewType])
}

enum MediaType       { MUSIC VIDEO GAME BOOK CONSOLE CUSTOM }
enum Condition       { MINT VERY_GOOD GOOD USED POOR }
enum ItemStatus      { OPENED SEALED GRADED }
enum CollectionStatus { OWNED WISHLIST }
enum ViewType        { SHELF SPINE CDWALL SIMPLE TABLE }
enum Role            { USER ADMIN }
enum DateFormat      { EUROPEAN AMERICAN }
enum FieldType       { TEXT NUMBER DATE SELECT BOOLEAN TEXTAREA }
enum SortOrder       { ASC DESC }
```

---

## Vordefinierte Medientypen & Felder

| Kategorie | Spezialfelder | Verfügbare Views |
|---|---|---|
| Konsolen | Typ (PS1-5/XBOX/...), Hersteller, Revisionsnummer | SHELF, SIMPLE, TABLE |
| Konsolenspiele | Plattform, Publisher, Completeness, Region (PAL/NTSC) | SHELF, SPINE, SIMPLE, TABLE |
| PC-Spiele | Typ (Big Box/DVD/Special Ed.), Publisher, Completeness | SHELF, SPINE, SIMPLE, TABLE |
| Bücher/Comics/Manga/Zeitschriften | Autor, Verlag, ISBN, Band-Nr., Reihe | SHELF (portrait), SPINE, SIMPLE, TABLE |
| CD/MC/Vinyl | Interpret, Label, Format, Katalognr. | CDWALL (square), SHELF, SIMPLE, TABLE |
| VHS/DVD/Bluray | Regie, Studio, Laufzeit, Format | SHELF (portrait), SIMPLE, TABLE |

Cover-Aspect-Ratio je Typ: Quadratisch (CDs, Vinyl, Gameboy), Hochkant (DVD, Bluray, Bücher), Querformat (SNES-Boxen).

---

## Key Feature Details

### Barcode Scanner (Mobile)
- `@zxing/browser` scannt EAN-13/UPC-A über Gerätekamera im Browser
- Lookup-Kette: UPCitemdb → Open EAN DB → medienspezifische API (TMDB/Discogs/IGDB)
- Ergebnisse als Vorschau, User bestätigt vor dem Speichern

### View-Modi & Tag-Konfiguration
- Pro Sammlung UND pro View-Typ konfigurierbar: welche Felder als Chips auf den Kacheln erscheinen
- Gespeichert in `CollectionViewSettings.visibleTags`
- UI: Settings-Icon pro Sammlung öffnet Einstellungssheet

### Retro-Design & UX (Synthwave — aus v0.md)
- **Dark Theme**: Background `#0d0b1e`, Primary `#ff2d95` (Neon-Pink), Accent `#00f5d4` (Neon-Cyan)
- **Light Theme**: Background `#faf8ff`, Primary `#d4177a`, Accent `#0d9488`
- **Fonts**: `Press Start 2P` (Pixel-Font, Headings) + `Geist Sans` (Body) + `Geist Mono`
- **Dark-Mode-Effekte**: Neon-Glow (text-shadow), CRT-Scanlines (::after pseudo), Grid-Background (40px, pink 4% opacity)
- **Condition-Farben**: Mint=`#22c55e`, Excellent=Cyan, Good=`#ffd700`, Fair=`#f97316`, Poor=Red
- **Layout**: Sticky Header + Collapsible Sidebar + Modal Overlays
- **Animationen**: 150–200ms ease, hover `scale-105` auf Grid-Items
- Feld-Interaktion: oranger Rahmen beim Fokus, kurzer grüner Blitz bei verlassen (Auto-Save-Bestätigung)
- Light/Dark Mode Toggle oben rechts
- CSS Custom Properties in `globals.css` — `:root` (light) + `.dark` (dark), siehe `v0.md`

### Grading
- Felder: Service (VGA/WATA/CGC/frei), Score (Freitext z.B. "85+"), Datum, Foto des Cases
- Wird in separatem `GradingInfo`-Model gespeichert (1:1 zu Item)

### Danger Zones
- Jede Lösch-Aktion: modales Bestätigungs-Popup mit rot hervorgehobenem Bestätigungs-Button
- Account-Löschung: zweistufig (Eingabe von "LÖSCHEN" oder E-Mail-Adresse)

### Daten-Import / Export
- Export: JSON (alle Items mit Metadaten) + CSV (für Tabellenkalkulation)
- Import: JSON (eigenes Format) + CSV (mit Spalten-Mapping-Dialog)
- DSGVO-Export: kompletter Daten-Download des eigenen Accounts

### Statistiken
- Items nach Plattform (z.B. Games: PC / PS5 / XBOX aufgeschlüsselt)
- Items nach Condition
- Wertvollste Items (nach Kaufpreis)
- Timeline: Items nach Kaufdatum
- Gesamtwert der Sammlung

---

## Auth-Flows

**Erster Login:**
1. Admin erstellt User → `mustChangePassword: true`
2. Login → Middleware prüft Flag → Redirect auf `/change-password`
3. Middleware blockt alle anderen Routen bis Passwort geändert
4. Danach: normales Dashboard

**MFA (TOTP):**
1. User aktiviert in Einstellungen → QR-Code (otplib + qrcode)
2. Login-Flow: Passwort → TOTP-Eingabe
3. Admin kann MFA global erzwingen (`AppSettings.requireMfa`)

---

## DSGVO

- Passwörter: bcrypt (cost ≥ 12)
- API Keys + MFA Secrets: AES-verschlüsselt in DB (Encryption Key als Env-Var)
- Kein externes Tracking / keine externen Fonts (self-hosted)
- Datenschutz-Seite: statische `/privacy` Route (DE + EN)
- Consent-Datum gespeichert: `User.gdprConsentAt`
- Daten-Export: JSON-Download aller eigenen Daten
- Account-Löschung: Soft Delete → Hard Delete nach 30 Tagen (Cronjob)

---

## Entwicklungs-Phasen (Milestones)

### Phase 1 — Foundation
- [ ] Repo-Setup: Next.js 15, TypeScript, Prisma, Tailwind, shadcn/ui, next-intl
- [ ] Datenbankschema + erste Migration
- [ ] Docker: Dockerfile, docker-compose.yml (dev + prod), Nginx
- [ ] Auth: Login, Sessions, Passwort-Zwangswechsel-Middleware
- [ ] GitHub Actions CI (lint, typecheck, Prisma validate)

### Phase 2 — Admin & Datenbasis
- [ ] Admin: User-Verwaltung (erstellen, Passwort zurücksetzen, deaktivieren)
- [ ] Admin: Kategorien + Felder verwalten (Drag-and-Drop Reihenfolge)
- [ ] Admin: API-Key-Einstellungsseite mit Service-Anleitungen
- [ ] AppSettings-Model (Donation URL, Pflicht-MFA etc.)

### Phase 3 — Core Collection
- [ ] Item CRUD mit allen Universalfeldern + Custom Fields
- [ ] Bild-Handling: URL + Upload (Docker Volume), Drag-and-Drop-Reihenfolge
- [ ] Tags
- [ ] Danger-Zone Bestätigungsdialoge
- [ ] Suche + Filter + Sortierung

### Phase 4 — Views & UX
- [ ] Ansichten: SHELF, SPINE, CDWALL, SIMPLE, TABLE
- [ ] Kachel-Tag-Konfiguration (CollectionViewSettings)
- [ ] Retro-Design System (nach v0-Mockup)
- [ ] Light/Dark Toggle
- [ ] Feld-Interaktion: oranger Fokus, grünes Auto-Save-Feedback

### Phase 5 — Metadaten & Barcode
- [ ] Metadata-API-Integration: TMDB, Discogs, MusicBrainz, IGDB, OpenLibrary, Pricecharting
- [ ] Cover-Fallback-Chain für Games: IGDB → TheGamesDB → MobyGames
- [ ] Regionale API-Anfragen (User-Sprache + Region, per Collection überschreibbar)
- [ ] Barcode-Scanner (@zxing/browser) für Mobile + EAN-Lookup mit regionaler Priorisierung
- [ ] Cover-Suche-Dialog (offene Bildquellen: MusicBrainz Cover Art Archive, TheGamesDB)

### Phase 6 — Extended Features
- [ ] Wishlist
- [ ] Favoriten-Listen
- [ ] Statistik-Dashboard (Recharts)
- [ ] Grading-Felder + Case-Foto-Upload
- [ ] Daten Import/Export (JSON + CSV)
- [ ] MFA (TOTP)

### Phase 7 — DSGVO & Security
- [ ] Rate Limiting auf Auth-Endpoints
- [ ] Security Headers (CSP, HSTS)
- [ ] DSGVO-Export + Account-Löschung
- [ ] Verschlüsselung API Keys + MFA Secrets

### Phase 8 — Docs & Release
- [ ] README.md: Quickstart, Docker-Install-Guide, Env-Variablen
- [ ] GitHub Actions: Docker Image → ghcr.io bei Tag-Push
- [ ] CONTRIBUTING.md, CHANGELOG.md
- [ ] "Made with Claude Code" Badge + Spenden-Link im Footer
- [ ] GitHub Release v1.0.0

---

## Projektstruktur

```
retro-man/
├── .github/
│   └── workflows/         ci.yml, docker-publish.yml
├── src/
│   ├── app/
│   │   ├── (auth)/        login, change-password, setup-mfa
│   │   ├── (app)/
│   │   │   ├── collection/[categoryId]/   Sammlung mit Views
│   │   │   ├── wishlist/
│   │   │   ├── favorites/
│   │   │   └── stats/
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   ├── categories/
│   │   │   └── settings/  API Keys + App-Einstellungen
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── items/
│   │   │   ├── metadata/[source]/
│   │   │   ├── barcode/
│   │   │   └── admin/
│   │   └── (static)/      privacy, imprint
│   ├── components/
│   │   ├── ui/            shadcn Basiskomponenten
│   │   ├── views/         ShelfView, SpineView, CdWallView, SimpleView, TableView
│   │   ├── scanner/       BarcodeScanner
│   │   └── forms/         ItemForm, CategoryForm
│   ├── lib/
│   │   ├── auth/          Auth.js Config, MFA
│   │   ├── db/            Prisma Client
│   │   ├── crypto/        AES für API Keys
│   │   └── metadata/      tmdb.ts, discogs.ts, igdb.ts, openlib.ts, pricecharting.ts
│   └── messages/          de.json, en.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker/
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml     (Produktion)
├── docker-compose.dev.yml (Entwicklung mit Hot Reload)
└── README.md
```

---

## Verifikation (End-to-End)

1. `docker compose up` → App auf http://localhost
2. Admin-Login → Passwort-Wechsel-Dialog
3. MFA einrichten → QR-Code scannen → Login mit TOTP
4. Kategorie + Felder anlegen, Reihenfolge per Drag-and-Drop ändern
5. API-Key in Admin-Einstellungen eintragen → Metadaten-Suche liefert Ergebnisse
6. Item via Barcode-Scan (Mobile) → EAN-Lookup → Item in Sammlung
7. Verschiedene View-Modi wechseln, Tag-Konfiguration speichern
8. Bild hochladen + Reihenfolge per Drag-and-Drop ändern
9. Export als JSON + CSV → Daten vollständig und korrekt
10. CI-Pipeline grün, Docker Image auf ghcr.io verfügbar
