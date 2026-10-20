"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "@/components/LanguageProvider";

// Codebook docs/product-standards.md, "Danger-Zone-Bestätigung". One
// component rather than six copies: the standard itself notes that three
// projects built three versions of the same rule, and the differences were
// exactly where the rule got lost.

/**
 * The consequences, in three states rather than two. A two-state version
 * shows "working it out" forever when the request fails, and a dialog that
 * counts forever looks like one that found nothing.
 */
export type ImpactState =
  | { state: "none" }
  | { state: "loading" }
  | { state: "ready"; lines: string[] }
  | { state: "unavailable" };

interface DangerZoneProps {
  open: boolean;
  /** What is being acted on — shown, never typed. */
  subject: string;
  /** The sentence describing what is about to happen. */
  description: ReactNode;
  impact?: ImpactState;
  /**
   * The word to type. Defaults to `del` — three characters rather than
   * seven, which matters most on a phone. Never the name of the thing:
   * typing a name tests the clipboard, not the intent.
   */
  confirmWord?: string;
  /** Own label for actions that destroy nothing, so "Delete" never sits over them. */
  confirmLabel?: string;
  /** Throwing from here puts the message in the dialog, which stays open. */
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function DangerZone({
  open,
  subject,
  description,
  impact = { state: "none" },
  confirmWord,
  confirmLabel,
  onConfirm,
  onCancel,
}: DangerZoneProps) {
  const { t } = useTranslations();
  const word = confirmWord ?? t.common.deleteConfirmWord;
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTyped("");
      setError(null);
      setRunning(false);
      // A dialog that needs typing should not need a click first.
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const cancel = useCallback(() => {
    if (running) return;
    onCancel();
  }, [running, onCancel]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") cancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, cancel]);

  if (!open) return null;

  // Trimmed and case-insensitive: a phone keyboard capitalises the first
  // letter by itself, and intent should not fail on that.
  const wordMatches = typed.trim().toLowerCase() === word.toLowerCase();
  // Locked until the numbers are there — whoever types the word while the
  // consequences are still missing confirms exactly the invisible thing the
  // standard exists to prevent. Cancel is never locked, or a failed request
  // would trap them in the dialog.
  const waitingForImpact = impact.state === "loading";
  const canConfirm = wordMatches && !running && !waitingForImpact;

  async function confirm() {
    if (!canConfirm) return;
    setRunning(true);
    setError(null);
    try {
      await onConfirm();
    } catch (caught) {
      // The server's own text, not a sentence of ours replacing it.
      setError(caught instanceof Error ? caught.message : String(caught));
      setRunning(false);
      return;
    }
    setRunning(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.common.dangerZone}
      onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}
    >
      <div className="w-full max-w-sm rounded-xl border border-destructive/50 bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive text-sm">⚠</span>
          <h3 className="font-heading text-[10px] text-destructive uppercase tracking-widest">
            {t.common.dangerZone}
          </h3>
        </div>

        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">„{subject}"</span> {description}
        </p>

        {impact.state !== "none" && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            {impact.state === "loading" && (
              <p className="text-xs text-muted-foreground">{t.common.impactLoading}</p>
            )}
            {impact.state === "unavailable" && (
              <p className="text-xs text-amber-500">{t.common.impactUnavailable}</p>
            )}
            {impact.state === "ready" && (
              impact.lines.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t.common.impactNone}</p>
              ) : (
                <>
                  <p className="text-xs font-medium text-destructive">{t.common.impactTitle}</p>
                  <ul className="mt-1 space-y-0.5">
                    {impact.lines.map((line) => (
                      <li key={line} className="text-xs text-muted-foreground">• {line}</li>
                    ))}
                  </ul>
                </>
              )
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="danger-zone-word" className="block text-[10px] uppercase tracking-wider text-muted-foreground">
            {t.common.confirmWordLabel.replace("{word}", word)}
          </label>
          <input
            id="danger-zone-word"
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void confirm(); }}
            placeholder={word}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-destructive focus:outline-none"
          />
        </div>

        {/* The message belongs in the dialog, and the dialog stays open:
            behind it, it is covered, and from the outside it looks as though
            pressing the button did nothing at all. */}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
            <p className="font-mono text-[11px] leading-5 text-destructive break-words">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={cancel}
            className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={!canConfirm}
            className="flex-1 rounded-md bg-destructive px-3 py-2 text-xs font-medium text-white uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition"
          >
            {running ? t.common.working : (confirmLabel ?? t.common.permDelete)}
          </button>
        </div>
      </div>
    </div>
  );
}
