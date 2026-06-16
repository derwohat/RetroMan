"use client";

import { useState, useEffect } from "react";

type Settings = {
  discogsApiKey: boolean;
  theGamesDbKey: boolean;
  tmdbApiKey: boolean;
  omdbApiKey: boolean;
  requireMfa: boolean;
  donationUrl: string | null;
  fontSize: string;
  interfaceLanguage: string;
};

const SERVICES = [
  {
    key: "discogsApiKey" as const,
    label: "Discogs",
    subtitle: "Personal Access Token",
    icon: "💿",
    description: "Musik-Datenbank für CDs, Vinyl, MCs — Suche und Cover für alle Musiksammlungen.",
    steps: [
      "Registriere dich kostenlos auf discogs.com",
      "Gehe zu discogs.com/settings/developers",
      'Scrolle zu "Personal Access Tokens" (nicht zu Apps/OAuth)',
      '"Neues Token generieren" klicken',
      "Kopiere den generierten Token (langer Zufallsstring)",
    ],
    url: "https://www.discogs.com/settings/developers",
  },
  {
    key: "theGamesDbKey" as const,
    label: "TheGamesDB",
    subtitle: "API Key",
    icon: "🕹️",
    description: "Spiele-Datenbank — Suche, Cover und Metadaten für alle Spielesammlungen.",
    steps: [
      "Registriere dich auf thegamesdb.net",
      "Navigiere zu deinem Profil → API-Bereich",
      "Kopiere deinen API Key",
    ],
    url: "https://thegamesdb.net",
  },
  {
    key: "tmdbApiKey" as const,
    label: "TMDB",
    subtitle: "The Movie Database",
    icon: "🎬",
    description: "Film-Datenbank — Suche, Cover und Beschreibungen für alle Filmsammlungen.",
    steps: [
      "Registriere dich kostenlos auf themoviedb.org",
      'Gehe zu Einstellungen → API → "API-Schlüssel anfragen"',
      'Wähle "Developer" und fülle das Formular aus',
      "Kopiere den API Read Access Token (v4)",
    ],
    url: "https://www.themoviedb.org/settings/api",
  },
  {
    key: "omdbApiKey" as const,
    label: "OMDb",
    subtitle: "Open Movie Database — IMDB-Bewertungen",
    icon: "⭐",
    description: "Liefert IMDB-Bewertungen für Filme (1.000 Anfragen/Tag kostenlos). Ergänzt TMDB.",
    steps: [
      "Gehe zu omdbapi.com/apikey.aspx",
      'Wähle "FREE" (1.000 Anfragen täglich)',
      "E-Mail-Adresse eingeben und absenden",
      "Link in der Bestätigungs-E-Mail klicken",
      "API-Key aus der E-Mail kopieren",
    ],
    url: "https://www.omdbapi.com/apikey.aspx",
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [requireMfa, setRequireMfa] = useState(false);
  const [donationUrl, setDonationUrl] = useState("");
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
