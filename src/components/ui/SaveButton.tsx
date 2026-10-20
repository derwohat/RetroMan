"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "@/components/LanguageProvider";

// Brandbook §8.3: a form with an explicit save button acknowledges at the
// button. A line "Saved." above the fields appears somewhere other than the
// button that was just pressed and pushes everything below it down.

const ACKNOWLEDGEMENT_MS = 1500;

type SaveState = "idle" | "saving" | "saved";

export function useSaveState(): {
  state: SaveState;
  /** Wrap the save so the button acknowledges it; errors stay with the caller. */
  run: (action: () => Promise<void>) => Promise<void>;
} {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const run = useCallback(async (action: () => Promise<void>) => {
    setState("saving");
    try {
      await action();
    } catch (error) {
      // The failure case is not animated — it belongs where a whole sentence
      // fits, not on the button. Rethrown so the form can show it.
      setState("idle");
      throw error;
    }
    setState("saved");
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), ACKNOWLEDGEMENT_MS);
  }, []);

  return { state, run };
}

interface SaveButtonProps {
  state: SaveState;
  disabled?: boolean;
  /** Defaults to the usual "Save"; a form may need its own wording. */
  label?: string;
  className?: string;
}

/**
 * The button does not save by itself: it is `type="submit"` in a real form.
 * A button that saves on click bypasses the browser's own validation
 * (`required`, `min`, `max`) entirely, and the first to notice a bad value
 * would be the server with a 422.
 */
export function SaveButton({ state, disabled, label, className }: SaveButtonProps) {
  const { t } = useTranslations();

  return (
    <>
      <button
        type="submit"
        disabled={disabled || state === "saving"}
        className={`quittung ${state === "saved" ? "quittung--fertig" : ""} min-h-11 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition ${className ?? ""}`}
      >
        <span>{state === "saving" ? t.common.saving : (label ?? t.common.save)}</span>
      </button>
      {/* A screen reader hears no colour. */}
      <span aria-live="polite" className="sr-only">
        {state === "saved" ? t.common.saved : ""}
      </span>
    </>
  );
}
