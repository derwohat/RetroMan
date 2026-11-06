"use client";

import { useLayoutEffect, useRef, useState, type ReactElement, type RefObject } from "react";

/** Space between the last digit and the unit, as in "12,99 €". */
const GAP_PX = 4;
/** Room kept free at the field's right edge when the value fills it. */
const EDGE_PX = 8;

/**
 * A unit that stands right after the typed value inside a text field —
 * "12,99 €" — instead of at the field's far edge, where it used to sit with
 * the whole field width between number and sign.
 *
 * It measures the text in the field's own font with an invisible copy and
 * moves along while typing; with nothing typed it follows the placeholder.
 * The unit takes the field's font too, so digits and sign come from the same
 * face (the old system-font workaround for a missing € glyph was obsolete:
 * the self-hosted Geist carries U+20AC, measured 06.11.2026).
 *
 * Render it inside the field's `relative` wrapper, after the input, and give
 * the input enough right padding for the unit at the clamp.
 */
export function TrailingUnit({
  inputRef,
  text,
  unit,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  /** What the field shows: its value, or the placeholder when empty. */
  text: string;
  unit: string;
}): ReactElement {
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const unitRef = useRef<HTMLSpanElement>(null);
  const [left, setLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    const unitEl = unitRef.current;
    if (!input || !mirror || !unitEl) return;
    let cancelled = false;

    function place(): void {
      if (cancelled || !input || !mirror || !unitEl) return;
      const cs = getComputedStyle(input);
      for (const el of [mirror, unitEl]) {
        el.style.fontFamily = cs.fontFamily;
        el.style.fontSize = cs.fontSize;
        el.style.fontWeight = cs.fontWeight;
        el.style.letterSpacing = cs.letterSpacing;
      }
      mirror.style.fontVariantNumeric = cs.fontVariantNumeric;
      const start = input.offsetLeft + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
      const max = input.offsetLeft + input.offsetWidth - parseFloat(cs.borderRightWidth) - unitEl.offsetWidth - EDGE_PX;
      setLeft(Math.min(start + mirror.offsetWidth + GAP_PX, max));
    }

    place();
    const observer = new ResizeObserver(place);
    observer.observe(input);
    // The first measurement may run before the web font arrived.
    document.fonts?.ready.then(place).catch((error: unknown) => {
      console.warn("[TrailingUnit] Schriften nicht bereit, Einheit bleibt an der ersten Messung:", error);
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [inputRef, text]);

  return (
    <>
      <span ref={mirrorRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre">
        {text}
      </span>
      <span
        ref={unitRef}
        className="pointer-events-none absolute inset-y-0 grid place-items-center text-muted-foreground"
        // Until the first measurement (one layout pass) the unit waits at the
        // right edge, where it always stood — never on top of the digits.
        style={left === null ? { right: "0.75rem" } : { left }}
      >
        {unit}
      </span>
    </>
  );
}
