"use client";

import { useEffect, useState, useCallback } from "react";
import type { ChangelogEntry } from "@/data/changelog";
import { useTranslations } from "@/components/LanguageProvider";

type Props = {
  forceOpen?: boolean;
  onClose?: () => void;
};

function semverGt(a: string, b: string): boolean {
  const [ma, mi, pa] = a.split(".").map(Number);
  const [mb, mib, pb] = b.split(".").map(Number);
  if (ma !== mb) return ma > mb;
  if (mi !== mib) return mi > mib;
  return pa > pb;
}

export function ChangelogModal({ forceOpen = false, onClose }: Props) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [allEntries, setAllEntries] = useState<ChangelogEntry[]>([]);
  const [visibleEntries, setVisibleEntries] = useState<ChangelogEntry[]>([]);
  const [currentVersion, setCurrentVersion] = useState("");
  // Whether THIS opening was the automatic one. Marking as seen on every
  // close means a curious look via the version button silently acknowledges
  // entries that were never read — the next real update then shows nothing.
  // The same bug was found in three other Man-Suite projects before this one.
  const [openedAutomatically, setOpenedAutomatically] = useState(false);

  const dismiss = useCallback(async () => {
    setOpen(false);
    onClose?.();
    if (!openedAutomatically) return;
    setOpenedAutomatically(false);
    await fetch("/api/changelog/seen", { method: "POST" });
  }, [onClose, openedAutomatically]);

  // Escape closes it, like every other overlay in the app. Without this the
  // only way out is the ✕, which is the one thing a keyboard user cannot
  // reach quickly.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") void dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dismiss]);
  useEffect(() => {
    fetch("/api/changelog")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const all: ChangelogEntry[] = data.entries ?? [];
        const lastSeen: string | null = data.lastSeenVersion ?? null;
        const current: string = data.currentVersion ?? "";

        setAllEntries(all);
        setCurrentVersion(current);

        if (forceOpen) {
          setVisibleEntries(all);
          setOpen(true);
        } else if (!data.seen && all.length > 0) {
          // Show only entries newer than the last seen version
          const unseen = lastSeen
            ? all.filter((e) => semverGt(e.version, lastSeen))
            : all;
          // Nothing newer means nothing to announce. The old fallback showed
          // the WHOLE history instead, which happens for real whenever the
          // app version moves without a changelog entry: `seen` compares
          // exact strings, so it says no, while `unseen` is empty.
          if (unseen.length === 0) return;
          setVisibleEntries(unseen);
          setOpen(true);
          setOpenedAutomatically(true);
        }
      })
      .catch(() => {});
  }, [forceOpen]);

  // When forceOpen toggles to true after initial load, show all entries.
  // A manual reopen clears the flag, so closing it afterwards acknowledges
  // nothing.
  useEffect(() => {
    if (forceOpen && allEntries.length > 0) {
      setVisibleEntries(allEntries);
      setOpen(true);
      setOpenedAutomatically(false);
    }
  }, [forceOpen, allEntries]);

  if (!open || visibleEntries.length === 0) return null;

  const isFullHistory = forceOpen || visibleEntries.length === allEntries.length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* Three parts, not one: a header that does not scroll, the entries
          below it, and nothing else. min-h-0 is what keeps the child from
          growing past its parent and scrolling the whole dialog again. */}
      <div className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex flex-none items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="font-heading text-[10px] text-primary neon-glow uppercase tracking-widest">
              {isFullHistory ? t.header.changelogHistory : t.header.changelogWhatsNew}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">RetroMan v{currentVersion}</p>
          </div>
          {/* Exactly one action, and its label follows the reason the dialog
              is open: nothing is acknowledged when someone looked it up. */}
          <button
            onClick={dismiss}
            className="min-h-11 shrink-0 rounded-md bg-primary px-5 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 transition"
          >
            {openedAutomatically ? t.header.changelogAck : t.header.changelogClose}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {visibleEntries.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-heading text-xs font-semibold text-primary">v{entry.version}</span>
                <span className="text-[10px] text-muted-foreground">{entry.date}</span>
              </div>
              <ul className="space-y-1.5">
                {entry.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
