"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { isoToDE, deToISO } from "@/lib/format";

/**
 * A German date field that does not insist on the dots.
 *
 * Two things were wrong with the two hand-rolled copies this replaces:
 *
 *  - The dots had to be typed. `24122026` stayed `24122026`, which parses to
 *    nothing, so the field silently held an unusable value.
 *  - The calendar button called `showPicker()` on a visually hidden input.
 *    iOS Safari has no `showPicker()`, and a `sr-only` input cannot be tapped
 *    either, so on an iPhone the button did nothing at all.
 *
 * The picker is now a real `<input type="date">` lying over the button at zero
 * opacity. A tap lands on the native control, which every browser opens by
 * itself — no API that might be missing.
 */

/** Formats while typing: 24122026 becomes 24.12.2026. */
function formatWhileTyping(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

interface DateFieldProps {
  /** ISO `YYYY-MM-DD`, or empty. */
  value: string;
  onChange: (iso: string) => void;
  /** Extra classes for the text input, so callers keep their own framing. */
  className?: string;
  pickerLabel: string;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Rendered inside the field's right edge, beneath the invisible picker. */
  icon?: ReactNode;
}

export function DateField({
  value,
  onChange,
  className = "retro-field w-full",
  pickerLabel,
  onFocus,
  onBlur,
  icon,
}: DateFieldProps) {
  const [draft, setDraft] = useState(isoToDE(value));
  const [focused, setFocused] = useState(false);
  const previous = useRef(draft);

  // The parent is the source of truth while nobody is typing here. Reading
  // document during render would also break the server pass, where there is
  // none.
  useEffect(() => {
    if (focused) return;
    const fromParent = isoToDE(value);
    previous.current = fromParent;
    setDraft(fromParent);
  }, [value, focused]);

  function handleType(raw: string) {
    // Only reformat while the value grows. Otherwise backspacing over a dot
    // would put it straight back and the caret would never get past it.
    const next = raw.length > previous.current.length ? formatWhileTyping(raw) : raw;
    previous.current = next;
    setDraft(next);

    const iso = deToISO(next);
    if (iso) onChange(iso);
    else if (!next.trim()) onChange("");
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={`${className} pr-10`}
        value={draft}
        placeholder="TT.MM.JJJJ"
        onFocus={() => { setFocused(true); onFocus?.(); }}
        onBlur={() => { setFocused(false); onBlur?.(); }}
        onChange={(e) => handleType(e.target.value)}
      />

      {/* The icon is decoration; the input above it takes the tap. */}
      <span className="pointer-events-none absolute right-0 inset-y-0 grid w-10 place-items-center text-muted-foreground">
        {icon ?? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </span>

      {/* The real picker, invisible but tappable — this is what works on iOS. */}
      <input
        type="date"
        aria-label={pickerLabel}
        title={pickerLabel}
        value={deToISO(draft) ?? ""}
        onFocus={() => { setFocused(true); onFocus?.(); }}
        onBlur={() => { setFocused(false); onBlur?.(); }}
        onChange={(e) => {
          const next = isoToDE(e.target.value);
          previous.current = next;
          setDraft(next);
          onChange(e.target.value);
        }}
        className="absolute right-0 inset-y-0 w-11 cursor-pointer opacity-0"
      />
    </div>
  );
}
