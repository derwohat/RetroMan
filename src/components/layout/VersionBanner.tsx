"use client";

import { useVersionCheck } from "@/hooks/useVersionCheck";
import { useTranslations } from "@/components/LanguageProvider";

export function VersionBanner() {
  const { updateAvailable, latestVersion, dismiss } = useVersionCheck();
  const { t } = useTranslations();

  if (!updateAvailable) return null;

  // relative + overflow-hidden carry the .streiflicht pseudo-element; the
  // class itself only defines the sweep.
  return (
    <div className="version-banner-card streiflicht relative overflow-hidden mb-2 rounded-md px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-snug">
          {t.versionBanner.available}{" "}
          <span className="font-mono">v{latestVersion}</span>
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 text-xs leading-none opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 w-full rounded bg-primary px-2 py-1.5 text-[11px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        {t.versionBanner.reload}
      </button>
    </div>
  );
}
