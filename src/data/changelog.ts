export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
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
