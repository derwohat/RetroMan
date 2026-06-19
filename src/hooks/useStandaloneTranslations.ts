"use client";

import { useState, useEffect } from "react";
import { translations, type Locale, type Translations } from "@/lib/i18n";

// Used by auth pages (login, setup, verify-mfa, change-password)
// that live outside the LanguageProvider context.
// Reads language from localStorage or API, falls back to German.
export function useStandaloneTranslations(): { t: Translations; locale: Locale } {
  const [locale, setLocale] = useState<Locale>("de");

  useEffect(() => {
    // Try localStorage first (fast, no network)
    const cached = localStorage.getItem("retroman_lang") as Locale | null;
    if (cached && (cached === "de" || cached === "en" || cached === "fr")) {
      setLocale(cached);
      return;
    }
    // Fallback: fetch from API
    fetch("/api/admin/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.interfaceLanguage && (d.interfaceLanguage === "de" || d.interfaceLanguage === "en" || d.interfaceLanguage === "fr")) {
          setLocale(d.interfaceLanguage as Locale);
          localStorage.setItem("retroman_lang", d.interfaceLanguage);
        }
      })
      .catch(() => {});
  }, []);

  return { t: translations[locale], locale };
}
