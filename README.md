# RetroMan – Sammlungsverwaltung für physische Medien

Selbstgehostete, Docker-basierte Webanwendung für die eigene Sammlung:
Schallplatten, CDs, Kassetten, VHS, DVDs, Blu-rays, Konsolen- und PC-Spiele,
Bücher, Comics und Mangas. Teil der Man-Suite-Projektfamilie.

Statt für jede Medienart ein eigenes Werkzeug: ein Bestand, eine Suche, eine
Statistik — mit Titelsuche und Barcode-Scan über öffentliche Datenbanken,
damit ein Eintrag nicht aus zwanzig Feldern von Hand besteht.

## Funktionsumfang

- **Zehn Medienarten** mit eigenen Feldern je Sammlung, dazu frei definierbare
  Sammlungen mit eigenen Feldern
- **Eintrag anlegen über Titelsuche oder EAN/Barcode** — per Kamera gescannt
  oder eingetippt. Cover, Jahr, Beteiligte und Beschreibung kommen aus den
  angebundenen Datenbanken
- **Zustand, Kaufdatum, Kaufpreis, Stückzahl, Notizen**, Bewertung und frei
  vergebbare Schlagworte
- **Mehrbenutzerbetrieb** mit getrennten Sammlungen, Rollen und optionaler
  Zwei-Faktor-Anmeldung (TOTP)
- **Import und Export** der eigenen Bestände
- **Dunkles und helles Erscheinungsbild**, Oberfläche auf Deutsch, Englisch
  und Französisch, auf dem Telefon genauso bedienbar wie am Schreibtisch

## Installation

Es gibt **eine** Compose-Datei, und sie ist die Installationsdatei: Sie zieht
das fertige Abbild von `ghcr.io`, nichts wird lokal gebaut. Für den Synology
Container Manager reicht sie allein.

```sh
mkdir -p retroman && cd retroman
curl -O https://raw.githubusercontent.com/derwohat/RetroMan/main/docker-compose.yml
```

Die Werte stehen **nicht** in der Compose-Datei, sondern daneben: in einer
`.env` oder in der Variablen-Maske der Stack-Verwaltung. Beides funktioniert,
weil jeder Wert in der Datei als `${...}` auftaucht — und genau daraus leitet
eine Stack-Verwaltung ihre Eingabefelder ab.

Vier Werte haben keine Vorgabe. Fehlt einer, bricht `docker compose up`
sofort ab und nennt ihn beim Namen, statt einen Container zu starten, der
gleich wieder abstürzt:

| Wert | Wie er entsteht |
|---|---|
| `POSTGRES_PASSWORD` | frei wählbar. Steht nur hier — die Compose-Datei baut `DATABASE_URL` daraus |
| `NEXTAUTH_URL` | die Adresse, unter der RetroMan von außen erreichbar ist |
| `NEXTAUTH_SECRET` | 32 Zufallsbytes als Base64: `head -c 32 /dev/urandom \| base64` |
| `ENCRYPTION_KEY` | **64 Hexzeichen**, anderes Format: `od -An -tx1 -N32 /dev/urandom \| tr -d " \n"` |

Die beiden Geheimnisse sind nicht austauschbar — ein Base64-Wert im
`ENCRYPTION_KEY` lässt den Start fehlschlagen. `.env.example` im Projekt
zeigt alle Variablen samt der Befehle, die sie erzeugen; `openssl` ist
darunter bewusst nicht, weil es auf einem nackten Docker-Host fehlt.

Danach:

```sh
docker compose up -d
```

**Der Port ist zunächst nur vom Gerät selbst erreichbar** (`127.0.0.1:7007`).
Hinter einem Reverse Proxy auf demselben Host ist das richtig so — dessen Ziel
ist `localhost`. Wer RetroMan direkt von anderen Rechnern im Netz aufrufen
will, setzt `RETROMAN_BIND=0.0.0.0`.

> **Beim Umstieg von einer Installation vor 1.3.0:** Dort stand das Passwort
> zweimal in der Compose-Datei, einmal als `POSTGRES_PASSWORD` und einmal
> mitten in `DATABASE_URL`. Jetzt genügt `POSTGRES_PASSWORD` — es muss
> dasselbe bleiben, sonst findet die Anwendung ihre Datenbank nicht mehr.

Beim ersten Start legt der Container das Datenbankschema an und richtet die
Standardsammlungen ein. Dann `http://<host>:7007` aufrufen: Die Anwendung
führt auf eine Einrichtungsseite, auf der das erste Konto entsteht. Dieses
Konto ist Administrator; weitere Benutzer legt es im Admin-Bereich an. Die
Einrichtungsseite verschwindet, sobald ein Konto existiert.

### Daten

Alles liegt in `./data` neben der Compose-Datei: `data/postgres` die
Datenbank, `data/uploads` die hochgeladenen Bilder. Docker legt beide beim
ersten Start selbst an.

## Betrieb hinter einem Reverse Proxy

Empfohlen, und für den Zugriff von außen Pflicht: Ohne TLS gehen Passwörter
im Klartext über die Leitung.

Der Proxy nimmt HTTPS an und reicht auf `127.0.0.1:7007` weiter. Beispiel
Synology (Systemsteuerung → Anmeldeportal → Erweitert → Reverse Proxy):

| | Protokoll | Hostname | Port |
|---|---|---|---|
| Quelle | HTTPS | `retroman.example.com` | 443 |
| Ziel | HTTP | `localhost` | 7007 |

`NEXTAUTH_URL` muss danach die **öffentliche** Adresse tragen, also
`https://retroman.example.com`, nicht die interne.

**Der Klartext-Port bleibt dabei offen.** RetroMan bindet das Sitzungs-Cookie
an die tatsächliche Verbindung, nicht an eine Einstellung: Wer über den Proxy
kommt, bekommt ein auf HTTPS gebundenes Cookie, wer die interne Adresse mit
Port benutzt, ein ungebundenes — beide Wege funktionieren, jeder mit dem
Schutz, den seine Verbindung hergibt. Wer den internen Weg nicht braucht,
schließt ihn besser ganz, statt sich auf die Bindung zu verlassen:

```yaml
    ports:
      - "127.0.0.1:7007:7007"
```

Danach `docker compose up -d` — ein Neustart genügt nicht, die Port-Bindung
entsteht beim Erzeugen des Containers. Der Proxy erreicht die Anwendung
weiterhin, weil er auf demselben Host läuft; aus dem übrigen Netz ist sie
dann nicht mehr direkt erreichbar.

## Umgebungsvariablen

Gesetzt werden sie in der Compose-Datei (Abschnitt `app:` → `environment:`).

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `DATABASE_URL` | ja | Verbindung zur Datenbank, Passwort identisch zu `POSTGRES_PASSWORD` |
| `NEXTAUTH_SECRET` | ja | Unterschreibt die Sitzungs-Token. Ändern meldet alle ab |
| `ENCRYPTION_KEY` | ja | 64 Hexzeichen. Verschlüsselt API-Schlüssel und 2FA-Geheimnisse **in der Datenbank** — geht er verloren, sind diese Werte unlesbar |
| `NEXTAUTH_URL` | ja | Öffentliche Adresse der Anwendung |
| `AUTH_TRUST_HOST` | hinter Proxy | `"true"`, sonst weist die Anmeldung fremde Hostnamen ab |
| `RETROMAN_VERSION` | empfohlen | Abbild-Version. Ohne Angabe `latest` — dann zieht jeder Neustart womöglich eine andere Fassung, und nach einem schlechten Release gibt es keine Version, auf die man zurück kann |
| `SMTP_*` | nein | Mailversand für „Passwort vergessen". Ohne `SMTP_HOST` verschwindet der Link und die zugehörigen Seiten antworten mit 404; ein Administrator kann weiterhin ein Einmalpasswort vergeben |
| `APP_BASE_URL` | nein | Adresse in verschickten Mails. Ohne Angabe gilt `NEXTAUTH_URL` |
| `LOG_MAX_SIZE`, `LOG_MAX_FILES` | nein | Grenzen des Container-Logs, Vorgabe 10 MB × 3 |

**API-Schlüssel gehören nicht hierher.** Die Zugänge zu den Medien-Datenbanken
(TMDB, Discogs, IGDB, TheGamesDB, MobyGames, OMDb, ComicVine, Google Books,
PriceCharting) trägt ein Administrator in der Oberfläche ein; sie liegen
verschlüsselt in der Datenbank. Ohne Schlüssel funktioniert RetroMan
vollständig, nur die automatische Suche fällt auf die frei zugänglichen
Quellen zurück.

## Sicherung

Alles Wichtige liegt in `./data`. Bei laufendem Betrieb ist eine Dateikopie
der Postgres-Dateien allerdings kein verlässlicher Stand — für die Datenbank
besser einen Abzug ziehen:

```sh
docker compose exec -T db pg_dump -U retroman retroman > retroman-$(date +%F).sql
```

Zurückspielen in eine leere Datenbank:

```sh
docker compose exec -T db psql -U retroman -d retroman < retroman-2026-01-01.sql
```

Die Bilder in `data/uploads` werden einfach mitkopiert. Auf einer Synology
deckt Hyper Backup auf das Verzeichnis beides ab, sofern der Abzug vorher
läuft.

## Update

```sh
# Version in der Compose-Datei oder .env hochsetzen, dann:
docker compose pull
docker compose up -d
```

Nötige Datenbankmigrationen laufen beim Start selbsttätig. **Vor einem Update
sichern** — ein Rückweg über eine ältere Version ist nicht vorgesehen, Schemata
wandern nur vorwärts.

## Entwicklung

Voraussetzung: Node 22+, eine erreichbare PostgreSQL-Instanz.

```sh
npm install
cp .env.example .env     # DATABASE_URL und die Geheimnisse eintragen
npx prisma migrate deploy
node prisma/seed.mjs
npm run dev              # http://localhost:7002
```

`DEV_SKIP_AUTH=true` überspringt die Anmeldung und behandelt jeden Aufruf als
das erste Konto. Lokal bequem, auf einer erreichbaren Instanz verheerend —
ein Produktionsbuild ignoriert die Variable deshalb.

| | |
|---|---|
| Oberfläche | Next.js 16 (App Router), React, Tailwind CSS 4 |
| Datenhaltung | PostgreSQL 16, Prisma |
| Anmeldung | Auth.js v5, Argon2id, TOTP als zweiter Faktor |
| Auslieferung | Docker, `output: standalone` |

## Status

Produktiv im Einsatz. Die laufende Version samt Änderungen steht in der
Anwendung selbst unter *Profil & Einstellungen → Changelog*.
