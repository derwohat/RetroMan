"use client";

import { useState, useEffect } from "react";

type Settings = {
  tmdbApiKey: boolean;
  igdbClientId: boolean;
  igdbSecret: boolean;
  discogsApiKey: boolean;
  pricechartingKey: boolean;
  theGamesDbKey: boolean;
  mobyGamesKey: boolean;
  googleSearchKey: boolean;
  googleSearchCx: boolean;
  requireMfa: boolean;
  donationUrl: string | null;
  githubUrl: string | null;
  fontSize: string;
  interfaceLanguage: string;
};

const SERVICES = [
  {
    key: "tmdbApiKey" as const,
    label: "TMDB",
    subtitle: "The Movie Database",
    icon: "🎬",
    description: "Metadaten für Filme und Serien — Titel, Cover und Beschreibung auf Deutsch.",
    steps: [
      "Registriere dich kostenlos auf themoviedb.org",
      'Gehe zu Einstellungen → API → "API-Schlüssel anfragen"',
      'Wähle "Developer" und fülle das Formular aus',
      "Kopiere den API Read Access Token (v4) oder den API Key (v3 auth)",
    ],
    url: "https://www.themoviedb.org/settings/api",
  },
  {
    key: "igdbClientId" as const,
    label: "IGDB Client ID",
    subtitle: "Twitch Developer",
    icon: "🎮",
    description: "Spieledatenbank von Twitch — PAL-Region, Cover, Release-Daten.",
    steps: [
      "Melde dich bei dev.twitch.tv an (kostenlos mit Twitch-Account)",
      '"Register Your Application" klicken',
      "Kategorie: Website Integration, OAuth Redirect: http://localhost",
      "Kopiere die Client ID",
    ],
    url: "https://dev.twitch.tv/console",
  },
  {
    key: "igdbSecret" as const,
    label: "IGDB Client Secret",
    subtitle: "Twitch Developer",
    icon: "🎮",
    description: "Zum Client ID gehörendes Secret für IGDB OAuth-Authentifizierung.",
    steps: [
      "Öffne deine App unter dev.twitch.tv/console/apps",
      '"Manage" → "New Secret" klicken',
      "Kopiere das generierte Secret (wird nur einmal angezeigt!)",
    ],
    url: "https://dev.twitch.tv/console/apps",
  },
  {
    key: "discogsApiKey" as const,
    label: "Discogs",
    subtitle: "Personal Access Token",
    icon: "💿",
    description: "Musik-Datenbank für CDs, Vinyl, MCs — inklusive länderspezifischer Pressungen.",
    steps: [
      "Registriere dich kostenlos auf discogs.com",
      "Gehe zu discogs.com/settings/developers",
      '"Neues Token generieren" klicken',
      "Kopiere den Personal Access Token",
    ],
    url: "https://www.discogs.com/settings/developers",
  },
  {
    key: "pricechartingKey" as const,
    label: "Pricecharting",
    subtitle: "API Key",
    icon: "💰",
    description: "Marktpreise für Spiele — PAL-Sektion für europäische Preise verfügbar.",
    steps: [
      "Registriere dich auf pricecharting.com",
      "Sende eine E-Mail an api@pricecharting.com",
      "Beschreibe deinen Verwendungszweck (private Sammelverwaltung)",
      "Der Key wird manuell zugesendet",
    ],
    url: "https://www.pricecharting.com/api",
  },
  {
    key: "theGamesDbKey" as const,
    label: "TheGamesDB",
    subtitle: "API Key",
    icon: "🕹️",
    description: "Cover-Fallback für Retro-Spiele — starke regionale Box-Art-Abdeckung.",
    steps: [
      "Registriere dich auf thegamesdb.net",
      "Navigiere zu deinem Profil → API-Bereich",
      "Kopiere deinen API Key",
    ],
    url: "https://thegamesdb.net",
  },
  {
    key: "mobyGamesKey" as const,
    label: "MobyGames",
    subtitle: "API Key",
    icon: "👾",
    description: "Umfangreiche Retro-Datenbank — zweiter Cover-Fallback für seltene Titel.",
    steps: [
      "Registriere dich kostenlos auf mobygames.com",
      "Gehe zu mobygames.com/info/api",
      "Beantrage einen kostenlosen Developer Key",
    ],
    url: "https://www.mobygames.com/info/api/",
  },
  {
    key: "googleSearchKey" as const,
    label: "Google Suche — API Key",
    subtitle: "Custom Search JSON API",
    icon: "🔍",
    description: "Universeller Cover-Fallback via Google Bildersuche — funktioniert für alle Medientypen wenn keine spezifische API konfiguriert ist. Kostenlos bis 100 Anfragen/Tag.",
    steps: [
      "Gehe zu console.cloud.google.com und erstelle ein Projekt",
      'Aktiviere die "Custom Search API" unter APIs & Dienste',
      "Erstelle unter APIs & Dienste → Anmeldedaten einen API-Schlüssel",
      "Kopiere den API-Schlüssel hier ein",
    ],
    url: "https://console.cloud.google.com/apis/library/customsearch.googleapis.com",
  },
  {
    key: "googleSearchCx" as const,
    label: "Google Suche — Search Engine ID",
    subtitle: "Custom Search Engine (cx)",
    icon: "🔍",
    description: 'Die ID deiner Google Custom Search Engine. Muss auf "Gesamtes Web durchsuchen" konfiguriert sein mit aktivierter Bildersuche.',
    steps: [
      "Gehe zu programmablesearchengine.google.com",
      '"Hinzufügen" klicken und eine neue Suchmaschine erstellen',
      'Bei "Zu durchsuchende Seiten": eine beliebige URL eintragen (z.B. example.com)',
      "Nach der Erstellung: Suchmaschine bearbeiten → Einstellungen → 'Gesamtes Web durchsuchen' aktivieren",
      "Grundlagen → Search Engine ID kopieren",
      "In den erweiterten Einstellungen: Bildersuche aktivieren",
    ],
    url: "https://programmablesearchengine.google.com/",
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [requireMfa, setRequireMfa] = useState(false);
  const [donationUrl, setDonationUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [interfaceLanguage, setInterfaceLanguage] = useState<"de" | "en" | "fr">("de");
  const [saving, setSaving] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        setSettings(data);
        setRequireMfa(data.requireMfa);
        setDonationUrl(data.donationUrl ?? "");
        setGithubUrl(data.githubUrl ?? "");
        setFontSize((data.fontSize as "small" | "medium" | "large") ?? "medium");
        setInterfaceLanguage((data.interfaceLanguage as "de" | "en" | "fr") ?? "de");
      });
  }, []);

  function showSaved(msg: string) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2500);
  }

  async function saveKey(serviceKey: string) {
    const value = keys[serviceKey];
    if (!value) return;
    setSaving(serviceKey);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [serviceKey]: value }),
    });
    setSaving(null);
    setSettings((s) => s ? { ...s, [serviceKey]: true } : s);
    setKeys((k) => { const n = { ...k }; delete n[serviceKey]; return n; });
    showSaved("Key gespeichert");
  }

  async function clearKey(serviceKey: string) {
    setSaving(serviceKey);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [serviceKey]: null }),
    });
    setSaving(null);
    setSettings((s) => s ? { ...s, [serviceKey]: false } : s);
    showSaved("Key gelöscht");
  }

  async function saveAppSettings() {
    setSaving("app");
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requireMfa,
        donationUrl: donationUrl || null,
        githubUrl: githubUrl || null,
        fontSize,
        interfaceLanguage,
      }),
    });
    setSaving(null);
    // Apply font size immediately
    document.documentElement.classList.remove("font-size-small", "font-size-medium", "font-size-large");
    document.documentElement.classList.add(`font-size-${fontSize}`);
    showSaved("Einstellungen gespeichert");
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">
          Einstellungen
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">API-Keys und App-Konfiguration</p>
      </div>

      {/* Toast */}
      {savedMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm text-green-500">
          ✓ {savedMsg}
        </div>
      )}

      {/* API Keys */}
      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
          API-Keys
        </h3>

        {SERVICES.map((service) => {
          const isSet = settings?.[service.key] === true;
          const isExpanded = expanded === service.key;
          const currentValue = keys[service.key] ?? "";
          const isSaving = saving === service.key;

          return (
            <div key={service.key} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : service.key)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition"
              >
                <span className="text-xl shrink-0">{service.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{service.label}</span>
                    <span className="text-xs text-muted-foreground">{service.subtitle}</span>
                    {isSet && (
                      <span className="rounded-full bg-green-500/10 border border-green-500/30 px-2 py-0.5 text-[10px] text-green-500">
                        ✓ Gesetzt
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                </div>
                <span className="text-muted-foreground shrink-0">{isExpanded ? "▲" : "▼"}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-4 bg-muted/20">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                      Anleitung
                    </p>
                    <ol className="space-y-1.5">
                      {service.steps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                          <span className="text-primary font-mono shrink-0 w-4">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-2"
                    >
                      → {service.url.replace("https://", "").split("/")[0]} öffnen ↗
                    </a>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={currentValue}
                      onChange={(e) => setKeys((k) => ({ ...k, [service.key]: e.target.value }))}
                      placeholder={isSet ? "Neuen Key eingeben, um zu überschreiben" : "API Key eingeben…"}
                      className="retro-field flex-1 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <button
                      onClick={() => saveKey(service.key)}
                      disabled={!currentValue || isSaving}
                      className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground uppercase hover:opacity-90 disabled:opacity-50 transition whitespace-nowrap"
                    >
                      {isSaving ? "…" : "Speichern"}
                    </button>
                    {isSet && (
                      <button
                        onClick={() => clearKey(service.key)}
                        disabled={isSaving}
                        className="rounded-md border border-destructive/50 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50 transition"
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* App Settings */}
      <section className="space-y-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
          App-Einstellungen
        </h3>

        <div className="rounded-lg border border-border bg-card px-4 py-4 space-y-5">
          {/* Language */}
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Sprache</p>
            <p className="text-xs text-muted-foreground mb-3">Sprache der Benutzeroberfläche</p>
            <div className="flex gap-2">
              {(["de", "en", "fr"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setInterfaceLanguage(lang)}
                  className={`flex-1 rounded-md border py-2 text-xs transition ${
                    interfaceLanguage === lang
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {lang === "de" ? "🇩🇪 Deutsch" : lang === "en" ? "🇬🇧 English" : "🇫🇷 Français"}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Font size */}
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Schriftgröße</p>
            <p className="text-xs text-muted-foreground mb-3">Beeinflusst die Schriftgröße in der gesamten Anwendung</p>
            <div className="flex gap-2">
              {(["small", "medium", "large"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`flex-1 rounded-md border py-2 text-xs transition ${
                    fontSize === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {s === "small" ? "Klein" : s === "medium" ? "Mittel" : "Groß"}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">MFA für alle Benutzer erzwingen</p>
              <p className="text-xs text-muted-foreground">Alle Konten müssen 2-Faktor-Authentifizierung aktivieren</p>
            </div>
            <button
              onClick={() => setRequireMfa((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors border border-border ${requireMfa ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${requireMfa ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              GitHub URL
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/..."
              className="retro-field w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Spenden-URL (Ko-fi, PayPal, etc.)
            </label>
            <input
              type="url"
              value={donationUrl}
              onChange={(e) => setDonationUrl(e.target.value)}
              placeholder="https://ko-fi.com/..."
              className="retro-field w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <button
            onClick={saveAppSettings}
            disabled={saving === "app"}
            className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition"
          >
            {saving === "app" ? "Speichern…" : "Einstellungen speichern"}
          </button>
        </div>
      </section>
    </div>
  );
}
