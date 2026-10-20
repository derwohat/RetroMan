"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "@/components/LanguageProvider";

// Codebook docs/operations.md, "Mailversand prüfbar machen": a failed
// delivery looks from the inside exactly like a successful one. Four
// properties, all four needed — any address, fixed text, a limit, and a
// history that carries the server's own wording.

interface MailState {
  configured: boolean;
  host: string | null;
  port: number;
  from: string;
  requireTls: boolean;
  authConfigured: boolean;
  authUserPresent: boolean;
  authPasswordPresent: boolean;
}

interface MailAttempt {
  id: string;
  createdAt: string;
  recipient: string;
  trigger: string;
  status: string;
  error: string | null;
}

type Feedback = { kind: "ok" | "error"; text: string } | null;

export function MailProbe() {
  const { t } = useTranslations();
  const [state, setState] = useState<MailState | null>(null);
  const [attempts, setAttempts] = useState<MailAttempt[]>([]);
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mail");
      if (!res.ok) return;
      const data = await res.json();
      setState(data.state);
      setAttempts(data.attempts ?? []);
    } catch {
      // Leaves the section empty rather than breaking the settings page.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendTest() {
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/mail/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient.trim() }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 422) {
        setFeedback({ kind: "error", text: t.settings.mailTestInvalid });
      } else if (res.status === 429) {
        setFeedback({
          kind: "error",
          text: t.settings.mailTestRateLimited.replace("{secs}", String(data?.retryAfterSecs ?? 60)),
        });
      } else if (!res.ok) {
        setFeedback({ kind: "error", text: data?.error ?? t.settings.mailTestUnreachable });
      } else if (data?.status === "sent") {
        setFeedback({ kind: "ok", text: t.settings.mailTestSent });
      } else {
        // The wording comes from the server, not from us — that is the point.
        setFeedback({ kind: "error", text: data?.error ?? t.settings.mailStatusFailed });
      }
    } catch {
      setFeedback({ kind: "error", text: t.settings.mailTestUnreachable });
    }
    setSending(false);
    void load();
  }

  const statusLabel = (status: string): string =>
    status === "sent"
      ? t.settings.mailStatusSent
      : status === "notConfigured"
        ? t.settings.mailStatusNotConfigured
        : t.settings.mailStatusFailed;

  const triggerLabel = (trigger: string): string =>
    trigger === "test" ? t.settings.mailTriggerTest : t.settings.mailTriggerPasswordReset;

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
        {t.settings.mail}
      </h3>

      <div className="rounded-lg border border-border bg-card px-4 py-4 space-y-5">
        {/* What the application tries to send with, so looking for a fault
            does not start with a climb into the env file. Never which
            credentials, only whether they are set. */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">{t.settings.mailState}</p>
          {state === null ? (
            <p className="text-xs text-muted-foreground">{t.settings.migrationLoadingStatus}</p>
          ) : state.configured ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              <dt className="text-muted-foreground">{t.settings.mailHost}</dt>
              <dd className="font-mono text-foreground break-all">{state.host}</dd>
              <dt className="text-muted-foreground">{t.settings.mailPort}</dt>
              <dd className="font-mono text-foreground">{state.port}</dd>
              <dt className="text-muted-foreground">{t.settings.mailFrom}</dt>
              <dd className="font-mono text-foreground break-all">{state.from}</dd>
              <dt className="text-muted-foreground">{t.settings.mailTls}</dt>
              <dd className="text-foreground">{state.requireTls ? t.settings.mailYes : t.settings.mailNo}</dd>
              <dt className="text-muted-foreground">{t.settings.mailAuth}</dt>
              <dd className={state.authConfigured ? "text-foreground" : "text-muted-foreground"}>
                {state.authConfigured ? t.settings.mailSet : t.settings.mailUnset}
              </dd>
            </dl>
          ) : (
            // A switch that can never work is worse than none: no button
            // here, but what is missing.
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <p className="text-xs font-medium text-amber-500">{t.settings.mailNotConfigured}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.settings.mailNotConfiguredHint}</p>
            </div>
          )}
        </div>

        {state?.configured && (
          <>
            <div className="border-t border-border" />

            <div>
              <p className="text-sm font-medium text-foreground mb-1">{t.settings.mailTest}</p>
              <p className="text-xs text-muted-foreground mb-3">{t.settings.mailTestHint}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && recipient.trim() && !sending) void sendTest();
                  }}
                  placeholder={t.settings.mailTestPlaceholder}
                  className="flex-1 min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <button
                  onClick={() => void sendTest()}
                  disabled={sending || recipient.trim().length === 0}
                  className="shrink-0 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition"
                >
                  {sending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {t.settings.mailTestSending}
                    </span>
                  ) : (
                    t.settings.mailTestSend
                  )}
                </button>
              </div>
              {feedback && (
                <p
                  className={`mt-2 font-mono text-[11px] leading-5 break-words ${
                    feedback.kind === "ok" ? "text-green-500" : "text-destructive"
                  }`}
                >
                  {feedback.kind === "ok" ? "✓ " : "✗ "}
                  {feedback.text}
                </p>
              )}
            </div>
          </>
        )}

        <div className="border-t border-border" />

        {/* Answers the question that counts while searching: has it ever
            worked, and since when not? */}
        <div>
          <p className="text-sm font-medium text-foreground mb-1">{t.settings.mailHistory}</p>
          <p className="text-xs text-muted-foreground mb-3">{t.settings.mailHistoryHint}</p>
          {attempts.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t.settings.mailHistoryEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {attempts.map((attempt) => (
                <li key={attempt.id} className="rounded-md border border-border bg-black/20 px-3 py-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]">
                    <span className="font-mono text-muted-foreground">
                      {new Date(attempt.createdAt).toLocaleString()}
                    </span>
                    <span
                      className={
                        attempt.status === "sent"
                          ? "text-green-500"
                          : attempt.status === "notConfigured"
                            ? "text-amber-500"
                            : "text-destructive"
                      }
                    >
                      {statusLabel(attempt.status)}
                    </span>
                    <span className="text-muted-foreground">· {triggerLabel(attempt.trigger)}</span>
                    <span className="font-mono text-foreground break-all">{attempt.recipient}</span>
                  </div>
                  {attempt.error && (
                    <p className="mt-1 font-mono text-[11px] leading-5 text-destructive break-words">
                      {attempt.error}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
