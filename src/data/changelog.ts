export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
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
