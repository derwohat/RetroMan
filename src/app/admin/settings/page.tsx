"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "@/components/LanguageProvider";

const DONATION_URL = "https://paypal.me/RetroManFree";

type Settings = {
  discogsApiKey: boolean;
  theGamesDbKey: boolean;
  tmdbApiKey: boolean;
  omdbApiKey: boolean;
  comicVineKey: boolean;
  googleBooksKey: boolean;
  requireMfa: boolean;
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
  {
    key: "comicVineKey" as const,
    label: "ComicVine",
    subtitle: "Comic-Datenbank",
    icon: "🦸",
    description: "Umfangreiche Comic-Datenbank — Suche, Cover und Metadaten für alle Comic-Sammlungen (Marvel, DC, Indie u.v.m.).",
    steps: [
      "Registriere dich kostenlos auf comicvine.gamespot.com",
      'Gehe zu comicvine.gamespot.com/api — klicke auf "Get API Key"',
      "Kopiere den API Key",
    ],
    url: "https://comicvine.gamespot.com/api/",
  },
  {
    key: "googleBooksKey" as const,
    label: "Google Books",
    subtitle: "Bücher, Comics & Manga",
    icon: "📚",
    description: "Google Books ergänzt Bücher-, Comic- und Manga-Suche mit hochwertigen Covern, Beschreibungen und ISBNs (1.000 Anfragen/Tag kostenlos).",
    steps: [
      "Gehe zu console.cloud.google.com und melde dich mit deinem Google-Konto an",
      'Erstelle ein neues Projekt oder wähle ein bestehendes',
      'Suche in der API-Bibliothek nach "Books API" und aktiviere sie',
      'Gehe zu "Anmeldedaten" → "Anmeldedaten erstellen" → "API-Schlüssel"',
      "Kopiere den generierten API-Schlüssel",
    ],
    url: "https://console.cloud.google.com/apis/library/books.googleapis.com",
  },
];

type MigrateStatus = { applied: number; failed: number; lastMigration: string | null; lastApplied: string | null; hasFailed: boolean };

export default function AdminSettingsPage() {
  const { t } = useTranslations();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [requireMfa, setRequireMfa] = useState(false);
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [interfaceLanguage, setInterfaceLanguage] = useState<"de" | "en" | "fr">("de");
  const [saving, setSaving] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [migrateStatus, setMigrateStatus] = useState<MigrateStatus | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateOutput, setMigrateOutput] = useState<string[] | null>(null);
  const [migrateSuccess, setMigrateSuccess] = useState<boolean | null>(null);
  const [donationQr, setDonationQr] = useState<string>("");

  useEffect(() => {
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(DONATION_URL, { width: 120, margin: 1, color: { dark: "#ff2d95", light: "#0d0b1e" } })
        .then(setDonationQr)
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    fetch("/api/admin/migrate").then((r) => r.ok ? r.json() : null).then((d) => { if (d) setMigrateStatus(d); });
  }, []);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        setSettings(data);
        setRequireMfa(data.requireMfa);
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
    showSaved(t.settings.keySaved);
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
    showSaved(t.settings.keyDeleted);
  }

  async function saveSetting(patch: Record<string, unknown>) {
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    showSaved(t.common.saved);
  }

  async function runMigration() {
    setMigrating(true);
    setMigrateOutput(null);
    setMigrateSuccess(null);
    const res = await fetch("/api/admin/migrate", { method: "POST" });
    const data = await res.json();
    setMigrateOutput(data.output ?? []);
    setMigrateSuccess(data.success === true);
    setMigrating(false);
    fetch("/api/admin/migrate").then((r) => r.ok ? r.json() : null).then((d) => { if (d) setMigrateStatus(d); });
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">
          {t.settings.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.settings.subtitle}</p>
      </div>

      {/* Toast */}
      {savedMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm text-green-500">
          ✓ {savedMsg}
        </div>
      )}

      {/* Datenbank-Migration */}
      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
          {t.settings.database}
        </h3>
        <div className="rounded-lg border border-border bg-card px-4 py-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t.settings.migration}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {migrateStatus
                  ? migrateStatus.hasFailed
                    ? t.settings.migrationFailed
                    : `${t.settings.migrationApplied.replace("{count}", String(migrateStatus.applied))}${migrateStatus.lastMigration ? ` · ${t.settings.migrationLast}: ${migrateStatus.lastMigration}` : ""}`
                  : t.settings.migrationLoadingStatus}
              </p>
            </div>
            <button
              onClick={runMigration}
              disabled={migrating}
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition"
            >
              {migrating ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t.settings.migrationRunning}
                </span>
              ) : t.settings.runMigration}
            </button>
          </div>

          {/* Progress bar */}
          {(migrating || migrateSuccess !== null) && (
            <div className={`relative h-6 w-full rounded-full overflow-hidden flex items-center justify-center ${
              migrating ? "bg-border" : migrateSuccess ? "bg-green-500/20" : "bg-destructive/20"
            }`}>
              {migrating && (
                <div className="absolute inset-y-0 w-1/3 bg-primary rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
              )}
              {!migrating && migrateSuccess !== null && (
                <span className={`relative z-10 text-[10px] font-medium ${migrateSuccess ? "text-green-500" : "text-destructive"}`}>
                  {migrateSuccess ? t.settings.migrationSuccess : t.settings.migrationError}
                </span>
              )}
            </div>
          )}

          {migrateOutput && (
            <div className="rounded-md bg-black/40 border border-border p-3 max-h-48 overflow-y-auto">
              {migrateOutput.map((line, i) => (
                <p key={i} className={`font-mono text-[11px] leading-5 ${
                  line.startsWith("✓") ? "text-green-400" :
                  line.startsWith("✗") ? "text-destructive" :
                  line.startsWith("▶") ? "text-primary" :
                  "text-muted-foreground"
                }`}>{line || " "}</p>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* API Keys */}
      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
          {t.settings.apiKeys}
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
                        {t.settings.keySet}
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
                      {t.settings.instructions}
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
                      → {service.url.replace("https://", "").split("/")[0]} {t.settings.open}
                    </a>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={currentValue}
                      onChange={(e) => setKeys((k) => ({ ...k, [service.key]: e.target.value }))}
                      placeholder={isSet ? t.settings.newKeyPlaceholder : t.settings.enterKeyPlaceholder}
                      className="retro-field flex-1 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <button
                      onClick={() => saveKey(service.key)}
                      disabled={!currentValue || isSaving}
                      className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground uppercase hover:opacity-90 disabled:opacity-50 transition whitespace-nowrap"
                    >
                      {isSaving ? "…" : t.common.save}
                    </button>
                    {isSet && (
                      <button
                        onClick={() => clearKey(service.key)}
                        disabled={isSaving}
                        className="rounded-md border border-destructive/50 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50 transition"
                      >
                        {t.common.delete}
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
          {t.settings.appSettings}
        </h3>

        <div className="rounded-lg border border-border bg-card px-4 py-4 space-y-5">
          {/* Language */}
          <div>
            <p className="text-sm font-medium text-foreground mb-1">{t.settings.language}</p>
            <p className="text-xs text-muted-foreground mb-3">{t.settings.languageHint}</p>
            <div className="flex gap-2">
              {(["de", "en", "fr"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => { setInterfaceLanguage(lang); saveSetting({ interfaceLanguage: lang }); }}
                  className={`flex-1 rounded-md border py-2 text-xs transition flex items-center justify-center gap-1.5 ${
                    interfaceLanguage === lang
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  <span className="text-sm leading-none">{lang === "de" ? "🇩🇪" : lang === "en" ? "🇬🇧" : "🇫🇷"}</span>
                  <span>{lang === "de" ? "Deutsch" : lang === "en" ? "English" : "Français"}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Font size */}
          <div>
            <p className="text-sm font-medium text-foreground mb-1">{t.settings.fontSize}</p>
            <p className="text-xs text-muted-foreground mb-3">{t.settings.fontSizeHint}</p>
            <div className="flex gap-2">
              {(["small", "medium", "large"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setFontSize(s);
                    document.documentElement.classList.remove("font-size-small", "font-size-medium", "font-size-large");
                    document.documentElement.classList.add(`font-size-${s}`);
                    saveSetting({ fontSize: s });
                  }}
                  className={`flex-1 rounded-md border py-2 text-xs transition ${
                    fontSize === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {s === "small" ? t.settings.fontSmall : s === "medium" ? t.settings.fontMedium : t.settings.fontLarge}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t.settings.mfa}</p>
              <p className="text-xs text-muted-foreground">{t.settings.mfaHint}</p>
            </div>
            <button
              onClick={() => { const next = !requireMfa; setRequireMfa(next); saveSetting({ requireMfa: next }); }}
              className={`relative w-11 h-6 rounded-full transition-colors border border-border ${requireMfa ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${requireMfa ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="border-t border-border" />

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{t.settings.donation}</p>
            <div className="flex items-center gap-4">
              {donationQr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={donationQr} alt="PayPal QR Code" className="w-20 h-20 rounded-lg shrink-0" />
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t.settings.donationHint}</p>
                <a
                  href={DONATION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline transition-colors"
                >
                  {DONATION_URL.replace("https://", "")}
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-sm font-medium text-foreground">{t.settings.github}</p>
            <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <a
              href="https://github.com/derwohat/RetroMan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              github.com/derwohat/RetroMan
            </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
