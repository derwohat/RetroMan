"use client";

import { useEffect, useState, useCallback } from "react";
import type { ChangelogEntry } from "@/data/changelog";

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
  const [open, setOpen] = useState(false);
  const [allEntries, setAllEntries] = useState<ChangelogEntry[]>([]);
  const [visibleEntries, setVisibleEntries] = useState<ChangelogEntry[]>([]);
  const [currentVersion, setCurrentVersion] = useState("");

  const dismiss = useCallback(async () => {
    setOpen(false);
    onClose?.();
    await fetch("/api/changelog/seen", { method: "POST" });
  }, [onClose]);

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
          setVisibleEntries(unseen.length > 0 ? unseen : all);
          setOpen(true);
        }
      })
      .catch(() => {});
  }, [forceOpen]);

  // When forceOpen toggles to true after initial load, show all entries
  useEffect(() => {
    if (forceOpen && allEntries.length > 0) {
      setVisibleEntries(allEntries);
      setOpen(true);
    }
  }, [forceOpen, allEntries]);

  if (!open || visibleEntries.length === 0) return null;

  const isFullHistory = forceOpen || visibleEntries.length === allEntries.length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="font-heading text-[10px] text-primary neon-glow uppercase tracking-widest">
              {isFullHistory ? "Changelog" : "Was ist neu?"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">RetroMan v{currentVersion}</p>
          </div>
          <button
            onClick={dismiss}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Entries */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-5">
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

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 flex justify-end">
          <button
            onClick={dismiss}
            className="rounded-md bg-primary px-5 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 transition"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
