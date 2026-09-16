"use client";

import { useVersionCheck } from "@/hooks/useVersionCheck";
import { useTranslations } from "@/components/LanguageProvider";

export function VersionBanner() {
  const { updateAvailable, latestVersion, dismiss } = useVersionCheck();
  const { t } = useTranslations();

  if (!updateAvailable) return null;

  return (
    <div className="mb-2 rounded-md border-l-[3px] bg-muted px-3 py-2.5" style={{ borderLeftColor: "var(--neon-yellow)" }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-foreground leading-snug">
          {t.versionBanner.available}{" "}
          <span className="font-mono" style={{ color: "var(--neon-yellow)" }}>
            v{latestVersion}
          </span>
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors text-xs leading-none"
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 w-full rounded bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
      >
        {t.versionBanner.reload}
      </button>
    </div>
  );
}
