export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.2.1",
    date: "27.10.2026",
    changes: [
      "Behoben: Eine frische Installation ohne Internetzugang konnte überhaupt nicht starten. Das Abbild brachte den falschen Datenbank-Treiber mit und lud sich den passenden beim ersten Start aus dem Netz nach — war keins da, blieb RetroMan stehen, mit einer Meldung, die nach einem fremden Programm klang",
      "Der richtige Treiber steckt jetzt im Abbild. Es ist dadurch sogar kleiner, weil der unbrauchbare zweite nicht mehr mitfährt",
    ],
  },
  {
    version: "1.2.0",
    date: "27.10.2026",
    changes: [
      "Behoben: Wer RetroMan über die interne Adresse mit Port aufrief statt über die verschlüsselte Adresse, kam nicht herein — richtige Zugangsdaten, keine Fehlermeldung, und trotzdem wieder die Anmeldemaske. Ursache war, dass die Sitzung an die eingetragene Adresse gebunden war statt an die tatsächlich benutzte Verbindung",
      "Beide Zugangswege funktionieren jetzt gleichzeitig, jeder mit dem Schutz, den seine Verbindung hergibt. Angemeldet bleibt, wer angemeldet war",
      "Neu: Eine Installationsanleitung. Bisher lag im Projekt nur die unveränderte Vorlage von Next.js — ohne ein Wort zu Installation, Einstellungen, Reverse Proxy, Sicherung oder Update",
      "Drei Angaben in den Beispiel-Einstellungen waren falsch oder tot und sind berichtigt",
    ],
  },
  {
    version: "1.1.0",
    date: "26.10.2026",
    changes: [
      "Behoben: Ein Eintrag mit Kaufdatum ließ sich überhaupt nicht speichern — es kam nur „Datenbankfehler beim Erstellen des Eintrags“. Deshalb trägt bisher kein einziger Eintrag ein Kaufdatum",
      "Das Kaufdatum lässt sich ohne Punkte eintippen: aus 19102026 wird 19.10.2026",
      "Der Datumswähler funktioniert jetzt auch auf iPhone und iPad. Bisher passierte beim Tippen auf das Kalendersymbol dort nichts",
      "Der Kaufpreis zeigt das €-Zeichen",
      "Neu: Ein eingetippter Barcode löst die Suche jetzt selbst aus — bisher ging das nur über die Kamera. Und wenn zu einem Barcode nichts hinterlegt ist, steht das jetzt da, statt dass scheinbar nichts passiert",
      "Neu: Läuft die Sitzung ab, führt die App sofort zur Anmeldung und danach zurück auf die Seite, auf der man war. Bisher wirkte die Seite einfach kaputt",
      "Neu: Wer den Eintrags-Dialog mit ungespeicherten Eingaben schließt, wird gefragt. Bisher war mit Escape alles weg",
      "Der Speichern-Knopf sitzt jetzt oben im Dialog und wandert bei langen Formularen nicht mehr aus dem Bild",
      "Behoben: Das Symbol im Browser-Tab zeigte noch das alte Zeichen vom Juli oder gar keines",
      "Behoben: Auf dem iPhone waren die Auswahlfelder im dunklen Formular weiß",
      "Behoben: Schriftgröße und Sprache aus den Einstellungen galten nur für Administratoren — alle anderen bekamen immer die Vorgabewerte, und auf der Anmeldeseite griffen sie nie",
      "Sicherheit: Beim Anlegen und Ändern eines Eintrags wird jetzt geprüft, was geschickt wird. Bisher wurde der Inhalt der Anfrage ungefiltert an die Datenbank gereicht — darüber ließ sich ein Eintrag unter fremdem Konto anlegen",
      "Die Aktionen in der Benutzerliste sind Symbole statt Textknöpfe und brechen auf dem Handy nicht mehr um",
      "Der Import nennt jetzt sein Dateiformat und zeigt ein Beispiel",
    ],
  },
  {
    version: "1.0.2",
    date: "20.10.2026",
    changes: [
      "Behoben: Beim Start meldete die Datenbankschicht jedes Mal, sie könne die OpenSSL-Version nicht erkennen, und arbeitete mit einer geratenen weiter. Das Abbild bringt OpenSSL jetzt mit",
    ],
  },
  {
    version: "1.0.1",
    date: "20.10.2026",
    changes: [
      "Behoben: Eine frische Installation startete gar nicht. Beim ersten Hochfahren legt RetroMan Standard-Sammlungen an — die brauchen seit Juli einen Besitzer, bekamen aber keinen, und der Container brach mit einem Datenbankfehler ab. Bestehende Installationen waren nicht betroffen, weil ihre Sammlungen älter sind als diese Änderung",
      "Die Standard-Sammlungen gehören jetzt dem ersten Konto und werden beim Einrichten angelegt",
    ],
  },
  {
    version: "1.0.0",
    date: "20.10.2026",
    changes: [
      "Erstes stabiles Release",
      "Neu: Der Mailversand lässt sich prüfen. Unter Einstellungen steht, mit welchem Server die App es versucht, ein Testversand geht an eine beliebige Adresse, und ein Verlauf zeigt die letzten Versuche samt der Antwort des Servers im Wortlaut. Ohne eingerichteten Mailserver steht dort kein Knopf, sondern was fehlt",
      "Behoben: Eine Sammlung mit Einträgen ließ sich gar nicht löschen — der Dialog versprach, die Einträge mitzulöschen, der Vorgang brach aber kommentarlos ab. Dasselbe beim Löschen eines Benutzers, der eine Sammlung angelegt hatte",
      "Jede Löschung fragt jetzt nach und nennt vorher die Folgen mit Zahlen: wie viele Einträge, Bilder, Felder oder Tag-Zuordnungen mitgehen. Bestätigt wird durch Tippen von del",
      "Behoben: Ein Klick auf das Kreuz neben einem Feld löschte es samt aller gespeicherten Werte, ohne zu fragen. Dasselbe galt für Bilder und für die Bewertung eines Eintrags",
      "Behoben: An fünf Stellen verschwand eine Zeile aus der Liste, obwohl der Server die Löschung abgelehnt hatte — beim nächsten Laden war sie wieder da",
      "Fehlermeldungen des Servers stehen jetzt im Dialog, der dabei offen bleibt, statt in einem Hinweisfenster dahinter",
      "Der Admin-Bereich ist auf dem Handy bedienbar: Die Seitenleiste wird zur Schublade, die Benutzerliste zu Karten. Bisher nahm die feste Seitenleiste über die Hälfte des Bildschirms ein und die Tabelle ließ sich nur durch seitliches Wischen lesen",
      "Die Sammlung zeigt auf dem Handy zwei Kacheln pro Reihe statt einer",
      "Knöpfe und Symbole sind auf Berührungsgeräten groß genug zum Treffen",
      "Behoben: Das Menü auf dem Handy öffnete sich unter der Kopfzeile, sein Schließen-Kreuz war verdeckt",
      "Behoben: Der Changelog klappte manchmal ungefragt vollständig auf, obwohl es nichts Neues gab",
      "Der Changelog hat nur noch einen Knopf, oben in der Kopfzeile. Wer absichtlich nachschlägt, liest dort Schließen statt Verstanden — und stellt damit nichts still, was er nie gelesen hat",
      "Speichern quittiert jetzt am Knopf selbst statt mit einer Meldung daneben",
      "Behoben: Im Profil wurde ein fehlgeschlagenes Speichern verschluckt — es sah genauso aus wie ein erfolgreiches",
      "Die Sitzungsdauer lässt sich einstellen: eine Grenze für Untätigkeit und eine absolute, die früher erreichte gewinnt",
      "Unten in der Seitenleiste stehen jetzt Person und Ansicht getrennt: Name und Abmelden in einer Zeile, Hell/Dunkel und Version darunter",
      "Aufklappbare Karten lassen sich mit der Tastatur bedienen und sagen Vorlesegeräten, ob sie offen sind",
    ],
  },
  {
    version: "0.10.1",
    date: "21.09.2026",
    changes: [
      "Behoben: v0.10.0 startete im Docker-Container nicht. Die App meldete zwar Bereit, stürzte im selben Moment ab und wurde endlos neu gestartet — Ursache war die neue Passwort-Verschlüsselung, deren Programmteil im fertigen Abbild fehlte",
    ],
  },
  {
    version: "0.10.0",
    date: "21.09.2026",
    changes: [
      "Passwörter werden jetzt mit Argon2id geschützt statt mit bcrypt. Die Umstellung passiert beim nächsten Anmelden von selbst — niemand muss sein Passwort ändern",
      "Neu: Nach fünf Fehlversuchen wird ein Konto vorübergehend gesperrt, bei wiederholten Versuchen jeweils länger. Ein richtiges Passwort setzt den Zähler sofort zurück",
      "Behoben: Bisher konnte zehnmaliges richtiges Anmelden das eigene Konto aussperren, weil auch erfolgreiche Versuche mitgezählt wurden",
      "Behoben: Die Meldung bei zu vielen Anmeldeversuchen erschien nie — stattdessen stand immer Falsches Passwort da. Gesperrte Konten sagen das jetzt auch",
      "Behoben: Der Passwortwechsel im Profil funktionierte überhaupt nicht und meldete immer Passwort zu kurz",
      "Sicherheit: Beim Passwortwechsel wird jetzt das aktuelle Passwort abgefragt. Wer an ein offenes Gerät kommt, kann den Besitzer nicht mehr aussperren",
      "Sicherheit: Jeder Passwortwechsel beendet alle offenen Sitzungen des Kontos — danach ist eine Neuanmeldung nötig",
      "Sicherheit: Ohne gesetzte Umgebungsvariable ist die App jetzt geschlossen statt offen. Bisher genügte eine fehlende Einstellung, damit Sammlung und Benutzerverwaltung ohne Anmeldung erreichbar waren",
      "Das Startbildschirm-Symbol war bisher hinter der Anmeldung versteckt und erschien deshalb gar nicht. Jetzt gibt es Symbole für iPhone und Android, samt Installation als App",
      "Tabellen auf dem Handy: statt seitlich zu scrollen wird jede Zeile zu einer Karte mit Beschriftungen",
      "Beim Bearbeiten einzelner Felder zeigt ein farbiger Streifen jetzt an, ob gerade gespeichert wird, ob es geklappt hat oder fehlgeschlagen ist. Fehler blieben bisher unbemerkt",
      "Die Anleitungen bei den API-Schlüsseln stehen offen, solange ein Dienst noch nicht eingerichtet ist",
    ],
  },
  {
    version: "0.9.0",
    date: "21.09.2026",
    changes: [
      "Passwort vergessen: Auf der Anmeldeseite lässt sich jetzt ein Link per E-Mail anfordern, mit dem ein neues Passwort vergeben werden kann. Der Link gilt eine Stunde und funktioniert nur einmal. Erscheint nur, wenn ein Mailserver eingerichtet ist",
      "Sicherheit: Nach dem Zurücksetzen werden alle offenen Sitzungen des Kontos beendet — wer noch angemeldet war, fliegt raus",
      "Das Symbol für den Startbildschirm wird auf dem iPhone jetzt wirklich angezeigt. Bisher lag es zwar bereit, wurde aber nie ausgeliefert",
      "Kein ungewolltes Heranzoomen mehr auf dem Handy: Beim Tippen in ein Eingabefeld bleibt die Ansicht, wo sie ist",
      "Das Update-Banner in der Seitenleiste trägt jetzt die Markenfarbe statt eines Warntons, mit wanderndem Lichtstreifen und einer Schaltfläche über die volle Breite",
    ],
  },
  {
    version: "0.8.2",
    date: "16.09.2026",
    changes: [
      "Zu viele fehlgeschlagene Anmeldeversuche zeigen jetzt eine eigene Meldung statt des generischen Falsches-Passwort-Hinweises",
      "Neues Update-Banner in der Seitenleiste: Ist eine neue Version verfügbar, erscheint ein Hinweis mit Neu-laden-Schaltfläche — kein stilles Weiterarbeiten mit altem Code mehr",
      "iOS-Startbildschirm-Icon: schwarze Vinyl-Scheibe auf Neon-Pink-Hintergrund",
    ],
  },
  {
    version: "0.8.1",
    date: "27.08.2026",
    changes: [
      "In den Docker-Compose-Dateien sind jetzt alle Secrets (Datenbank-Passwort, Sitzungs-Schlüssel, Verschlüsselungs-Schlüssel) direkt mit Erzeugungsbefehl erklärt, statt nur in .env.example nachschlagen zu müssen",
    ],
  },
  {
    version: "0.8.0",
    date: "11.08.2026",
    changes: [
      "Login läuft jetzt über Benutzername + Passwort statt E-Mail-Adresse (Man-Suite-weite Standardumstellung) — E-Mail bleibt als Zusatzfeld für das Nutzerkonto erhalten",
      "Bestehende Accounts haben automatisch einen Benutzernamen aus dem bisherigen E-Mail-Namen erhalten",
    ],
  },
  {
    version: "0.7.8",
    date: "10.08.2026",
    changes: [
      "Design-/Theme-Umschalter und Profilmenü aus der Kopfzeile in die Seitenleiste verschoben — sitzen jetzt zusammen mit der Versionsnummer/dem Changelog unten in der Sidebar",
      "„Profil & Einstellungen“ und „Admin-Bereich“ sind jetzt feste Menüpunkte in der Seitenleiste statt Einträgen in einem Dropdown-Menü",
    ],
  },
  {
    version: "0.7.7",
    date: "13.07.2026",
    changes: [
      "Favicon: RetroMan-Logo wird jetzt korrekt im Browser-Tab angezeigt — ersetzt den Next.js-Platzhalter",
      "Favicon: 32×32 ICO für Browser-Tab, 64×64 PNG für moderne Browser, 192×192 PNG für Apple Touch Icon",
    ],
  },
  {
    version: "0.7.6",
    date: "13.07.2026",
    changes: [
      "Ansichtsgrößen: Kacheln, CD-Wand und Regal — Stufen neu kalibriert, frühere Mittelgröße ist jetzt die kleinste Stufe",
      "Ansichtsgrößen: Zwei neue größere Stufen hinzugefügt — bei 1100–1200px Inhaltsbreite alle 5 Stufen klar unterscheidbar",
      "Regal-Ansicht: Thumbnail wächst sichtbar zwischen benachbarten Stufen für klare visuelle Differenzierung",
    ],
  },
  {
    version: "0.7.5",
    date: "13.07.2026",
    changes: [
      "Musik-Suche: Discogs-Varianten werden jetzt von spezifischster zu allgemeinster geprüft — 'Depeche Mode M' findet zuerst artist=Depeche Mode / title=M statt falsch aufgeteilt",
      "Musik-Suche: Breiter Fallback-Query läuft immer zuerst — fängt reine Interpreten-Suchen wie 'Depeche Mode' korrekt ab",
      "Suche allgemein: Kurzsuchen ab 2 Zeichen möglich — Album-Titel wie 'M' oder 'OK' werden nicht mehr blockiert",
      "Suche allgemein: AbortController verhindert Race Conditions — veraltete Requests überschreiben keine neuen Ergebnisse mehr",
    ],
  },
  {
    version: "0.7.4",
    date: "13.07.2026",
    changes: [
      "Sidebar: Anzahl der Einheiten je Sammlung als Badge rechtsbündig im Menüeintrag",
      "Sidebar: Favoriten-Zähler ebenfalls als Badge",
    ],
  },
  {
    version: "0.7.3",
    date: "13.07.2026",
    changes: [
      "Google Books: funktioniert jetzt ohne API-Key (1.000 Anfragen/Tag kostenlos) — Key ist nur für höhere Rate Limits nötig",
      "Manga-Suche: Google Books + Open Library jetzt immer aktiv, kein Key erforderlich",
      "Admin-Einstellungen: Google Books zeigt 'Aktiv (kein Key)' wenn kein Key hinterlegt ist",
    ],
  },
  {
    version: "0.7.2",
    date: "13.07.2026",
    changes: [
      "Manga-Suche: AniList und MangaDex entfernt — die App sammelt physische Medien, keine Streaming-Serien",
      "Manga-Suche: nutzt jetzt Google Books + Open Library für gedruckte Bände und Deluxe-Editionen mit ISBN",
    ],
  },
  {
    version: "0.7.1",
    date: "13.07.2026",
    changes: [
      "Neue Sammlung: Formular als Karte — gleiche Breite wie die anderen Sammlungen",
      "Neue Sammlung: Name-Eingabe in eigener Zeile — volle Breite, Text immer sichtbar",
      "Neue Sammlung: Icon-Auswahl wieder verfügbar — wechselt automatisch mit dem Medientyp, manuell überschreibbar",
    ],
  },
  {
    version: "0.7.0",
    date: "13.07.2026",
    changes: [
      "Neue Sammlung: Inline-Formular direkt auf der Seite — kein Modal mehr, Speichern-Button direkt daneben",
      "Neue Sammlung: Icon wird automatisch passend zum Medientyp gewählt",
      "Sidebar: Aktualisiert sich sofort wenn eine Sammlung hinzugefügt, umbenannt, gelöscht oder neu sortiert wird",
    ],
  },
  {
    version: "0.6.6",
    date: "13.07.2026",
    changes: [
      "Sicherheit: Nach App-Neustart wird die Session sofort ungültig — Neuanmeldung erforderlich",
    ],
  },
  {
    version: "0.6.5",
    date: "12.07.2026",
    changes: [
      "Admin-Einstellungen: Quellen-Übersicht zeigt alle Datenquellen — kostenlose immer aktiv, API-Key-Quellen mit Status",
      "Admin-Einstellungen: Jede Quelle zeigt ihre Kategorie (Musik, Bücher, Filme, …)",
      "Navigation: Menüeinträge sind jetzt größer und besser lesbar",
      "Sicherheit: Automatischer Logout nach 30 Minuten Inaktivität",
      "Sicherheit: Session läuft nach 30 Minuten ab — kein dauerhafter Login nach App-Neustart",
    ],
  },
  {
    version: "0.6.4",
    date: "12.07.2026",
    changes: [
      "Google Books: neue Suchquelle für Bücher, Comics und Graphic Novels (API-Key in den Admin-Einstellungen)",
      "AniList: neue Suchquelle für Manga — kein API-Key nötig, automatisch aktiv",
      "Bücher-Suche: Google Books und Open Library laufen parallel, Ergebnisse werden zusammengeführt",
      "Manga-Suche: AniList und MangaDex laufen parallel für maximale Trefferquote",
    ],
  },
  {
    version: "0.6.3",
    date: "12.07.2026",
    changes: [
      "Discogs-Suche: Interpret und Albumtitel werden automatisch erkannt — kein Trennzeichen (: oder -) mehr nötig",
      "Discogs-Suche: Ergebnisse werden nach Relevanz sortiert — passendste Treffer erscheinen zuerst",
    ],
  },
  {
    version: "0.6.2",
    date: "12.07.2026",
    changes: [
      "2FA: Zeittoleranz auf ±30 Sekunden erhöht — Codes funktionieren auch bei kleiner Uhrzeitabweichung",
      "Admin: 2FA für Benutzer per Knopfdruck deaktivieren",
    ],
  },
  {
    version: "0.6.1",
    date: "12.07.2026",
    changes: [
      "Changelog zeigt jetzt alle Versionen seit dem letzten Login — nicht nur die neueste",
      "Cover-Wiederherstellung: Button erscheint wenn Cover gelöscht wurde und eine Originalquelle vorhanden ist",
      "Mobile: Mehr Abstand am unteren Seitenrand — Add-Button nicht mehr vom Browser verdeckt",
      "Suchleiste und Login-Felder ohne Platzhaltertext",
    ],
  },
  {
    version: "0.6.0",
    date: "12.07.2026",
    changes: [
      "Benutzerverwaltung: Nur der Admin kann neue Benutzer anlegen",
      "Benutzerverwaltung: Admin kann Passwörter zurücksetzen — temporäres Passwort wird einmalig angezeigt",
      "Benutzerverwaltung: Neue Benutzer müssen das temporäre Passwort beim ersten Login ändern",
      "Benutzerverwaltung: Admin-Account ist geschützt und kann nicht gelöscht oder deaktiviert werden",
      "Benutzerverwaltung: Übersicht zeigt wer sich noch nie angemeldet hat (Erstanmeldung ausstehend)",
      "Profil & Einstellungen: Sammlungen und Tags direkt im Profil-Bereich verwalten (4 Tabs)",
      "Navigation: Einstellungen nur noch über den Avatar-Button rechts oben erreichbar",
    ],
  },
  {
    version: "0.5.0",
    date: "12.07.2026",
    changes: [
      "Per-User Sammlungen: Jeder Benutzer verwaltet seine eigenen Sammlungen unabhängig",
      "Per-User Tags: Eigene Tag-Gruppen und Werte pro Benutzer (System-Tags bleiben global)",
      "Einstellungsbereich (/settings): Sammlungen und Tags erstellen, umbenennen, löschen und sortieren",
      "Drag & Drop: Reihenfolge von Sammlungen und Tags per Drag & Drop anpassen",
      "Changelog-System: Neuerungen werden nach Login einmalig angezeigt und sind über die Versionsnummer erneut aufrufbar",
    ],
  },
];

export const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
