"use client";

import { useEffect, useId, useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { useTranslations } from "@/components/LanguageProvider";

/**
 * A form in an overlay — Codebook docs/product-standards.md, "Benutzerverwaltung
 * unter Einstellungen", addition "Anlegen als Overlay" (after IPMan's
 * FormModal.jsx, TicketMan's create-user-dialog.tsx, CertMan's FormDialog.tsx):
 *
 *  - Title on the left, "Abbrechen" and the submit button on the right, in a
 *    header that stays put while only the body scrolls.
 *  - No ✕ beside them: "Abbrechen" says the same in words.
 *  - Every way out — Abbrechen, Escape, a click beside the dialog — passes the
 *    same check: if the form holds input, ask before throwing it away. An
 *    overlay closes with one stray click; a form on the page could not.
 *
 * Render it only while open (`{open && <FormDialog …/>}`): mounting afresh
 * each time resets the question state in the same frame. CertMan found that a
 * reset in an effect runs one frame late, and a quick Escape after reopening
 * then asked about input nobody could see any more.
 */

const BTN_SECONDARY =
  "retro-btn rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition";
const BTN_PRIMARY =
  "retro-btn rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition";
const BTN_DISCARD =
  "retro-btn rounded-md border border-destructive px-3 py-2 text-xs text-destructive hover:bg-destructive hover:text-white transition";

function DialogFrame({
  titleId,
  role,
  onBackdrop,
  children,
}: {
  titleId: string;
  role: "dialog" | "alertdialog";
  onBackdrop: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <div
      role={role}
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        // Only a click on the backdrop itself, never one that started inside
        // the panel and ended here after selecting text.
        if (event.target === event.currentTarget) onBackdrop();
      }}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function DialogHeader({
  titleId,
  title,
  bordered,
  children,
}: {
  titleId: string;
  title: string;
  bordered: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <div
      className={`flex flex-none flex-wrap items-center gap-3 border-b px-6 pb-3 pt-5 transition-colors ${
        bordered ? "border-border" : "border-transparent"
      }`}
    >
      {/* grow, not flex-1: a zero basis never lets the row wrap, and on a
          phone the buttons would run over the title. */}
      <h3 id={titleId} className="grow font-heading text-[10px] uppercase tracking-widest text-primary">
        {title}
      </h3>
      <div className="ml-auto flex flex-none items-center gap-2">{children}</div>
    </div>
  );
}

export function FormDialog({
  title,
  submitLabel,
  busyLabel,
  busy,
  dirty,
  error,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  submitLabel: string;
  busyLabel: string;
  busy: boolean;
  /** True while the form holds input that closing would lose. */
  dirty: boolean;
  error: string;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}): ReactElement {
  const { t } = useTranslations();
  const titleId = useId();
  const questionId = useId();
  const [asking, setAsking] = useState(false);
  const [bodyScrolled, setBodyScrolled] = useState(false);

  function requestClose(): void {
    // Closing mid-request would drop the server's answer.
    if (busy) return;
    if (dirty) {
      setAsking(true);
      return;
    }
    onClose();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      // Escape on the question goes back to the form, as its first button does.
      if (asking) setAsking(false);
      else requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit();
  }

  return (
    <DialogFrame titleId={titleId} role="dialog" onBackdrop={requestClose}>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <DialogHeader titleId={titleId} title={title} bordered={bodyScrolled}>
          <button type="button" disabled={busy} onClick={requestClose} className={BTN_SECONDARY}>
            {t.common.cancel}
          </button>
          <button type="submit" disabled={busy} className={BTN_PRIMARY}>
            {busy ? busyLabel : submitLabel}
          </button>
        </DialogHeader>

        <div
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6 pt-2"
          onScroll={(event) => setBodyScrolled(event.currentTarget.scrollTop > 2)}
        >
          {error && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </p>
          )}
          {children}
        </div>
      </form>

      {asking && (
        <div
          className="absolute inset-0 z-10 grid place-items-center bg-black/40 p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAsking(false);
          }}
        >
          <div role="alertdialog" aria-labelledby={questionId} className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-5 shadow-2xl">
            <h4 id={questionId} className="text-sm font-medium text-foreground">{t.common.unsavedTitle}</h4>
            <p className="text-xs text-muted-foreground">{t.common.unsavedBody}</p>
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              {/* Named rather than "Ja/Nein": what happens must be readable
                  without going back to the question. */}
              <button type="button" autoFocus onClick={() => setAsking(false)} className={BTN_SECONDARY}>
                {t.common.backToForm}
              </button>
              <button type="button" onClick={() => { setAsking(false); onClose(); }} className={BTN_DISCARD}>
                {t.common.discardChanges}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogFrame>
  );
}

/**
 * What follows a form: one message and exactly one button in the header, like
 * the changelog dialog. That button is the only way out. The message may be
 * a one-time password shown this once and stored nowhere — an Escape or a
 * stray click beside the dialog must not throw it away.
 */
export function NoticeDialog({
  title,
  buttonLabel,
  onClose,
  children,
}: {
  title: string;
  buttonLabel: string;
  onClose: () => void;
  children: ReactNode;
}): ReactElement {
  const titleId = useId();

  return (
    <DialogFrame titleId={titleId} role="dialog" onBackdrop={() => undefined}>
      <DialogHeader titleId={titleId} title={title} bordered>
        <button type="button" autoFocus onClick={onClose} className={BTN_PRIMARY}>
          {buttonLabel}
        </button>
      </DialogHeader>
      <div className="space-y-4 overflow-y-auto px-6 pb-6 pt-4">{children}</div>
    </DialogFrame>
  );
}
