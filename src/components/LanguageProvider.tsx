"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, type Locale, type Translations } from "@/lib/i18n";

type LanguageContextType = { t: Translations; locale: Locale };

const LanguageContext = createContext<LanguageContextType>({
  t: translations.de,
  locale: "de",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("de");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { interfaceLanguage?: string }) => {
        const lang = data.interfaceLanguage;
        if (lang === "de" || lang === "en" || lang === "fr") {
          setLocale(lang);
          localStorage.setItem("retroman_lang", lang);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <LanguageContext.Provider value={{ t: translations[locale], locale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslations() {
  return useContext(LanguageContext);
}
