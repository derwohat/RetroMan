import nodemailer from "nodemailer";
import { prisma } from "@/lib/db/prisma";

// SMTP_* variable names follow the Man-Suite convention (Codebook
// docs/operations.md). An empty SMTP_HOST means "no mail server configured",
// which is the normal state in local development, not an error.
//
// nodemailer is pinned to ^9 via package.json overrides rather than the ^7/^8
// next-auth peer-depends on for its optional email provider
// (GHSA-p6gq-j5cr-w38f, a high-severity SSRF/file-read fix). Safe here because
// RetroMan only uses the Credentials provider. The matching `@auth/core`
// devDependency keeps npm from nesting that package under next-auth, which
// would break the ambient session types — see Codebook docs/coding-standards.md.

/** What caused a mail. Stored with the attempt so the history says why. */
export type MailTrigger = "test" | "passwordReset";

interface MailMessage {
  to: string;
  subject: string;
  text: string;
  trigger: MailTrigger;
  /** The person who triggered it, where one did. */
  userId?: string | null;
}

// Three outcomes, not two: an interface that cannot distinguish "no server
// configured" from "sent" reports success for mail that went nowhere.
export type MailStatus = "sent" | "notConfigured" | "failed";

export interface MailOutcome {
  status: MailStatus;
  /**
   * The server's own words on failure — `535 5.7.8 Authentication credentials
   * invalid` tells an admin what to change, "could not send" tells them
   * nothing (Codebook docs/operations.md).
   */
  error?: string;
}

/** Keeps the attempt history from growing without bound. */
const KEEP_ATTEMPTS = 50;

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      requireTLS: process.env.SMTP_USE_TLS !== "false",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
      // Without explicit timeouts a black-holed port leaves the request
      // hanging on nodemailer's default, which is minutes rather than seconds.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });
  }
  return transporter;
}

export function mailIsConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

export interface MailState {
  configured: boolean;
  host: string | null;
  port: number;
  from: string;
  requireTls: boolean;
  /** Whether credentials are set — never which, not even to an admin. */
  authConfigured: boolean;
  authUserPresent: boolean;
  authPasswordPresent: boolean;
}

/**
 * What the application tries to send with, so looking for a fault does not
 * start with a climb into the `.env`.
 */
export function mailState(): MailState {
  const host = process.env.SMTP_HOST ?? null;
  return {
    configured: Boolean(host),
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    from: senderAddress(),
    requireTls: process.env.SMTP_USE_TLS !== "false",
    authConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    authUserPresent: Boolean(process.env.SMTP_USER),
    authPasswordPresent: Boolean(process.env.SMTP_PASSWORD),
  };
}

function senderAddress(): string {
  return process.env.SMTP_FROM ?? "RetroMan <no-reply@retroman.localhost>";
}

/** Base URL for links inside mails — falls back to the dev server. */
export function appBaseUrl(): string {
  return process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:7002";
}

/**
 * Nodemailer puts the server's reply in `response` and its own diagnosis in
 * `message`; a DNS or socket fault only has the latter. Both are kept as they
 * came, because a rewritten sentence loses the part that identifies the fault.
 */
function failureText(error: unknown): string {
  if (!(error instanceof Error)) return String(error).slice(0, 500);
  const withFields = error as Error & { response?: string; code?: string };
  const body = withFields.response?.trim() || error.message;
  const prefix = withFields.code ? `${withFields.code}: ` : "";
  return `${prefix}${body}`.slice(0, 500);
}

/**
 * Records every attempt, including the ones nobody watched. Writing the
 * history inside the sender rather than at each call site is deliberate: a
 * caller that forgets is exactly the silence this is meant to end.
 */
async function recordAttempt(message: MailMessage, outcome: MailOutcome): Promise<void> {
  try {
    await prisma.mailAttempt.create({
      data: {
        recipient: message.to,
        trigger: message.trigger,
        status: outcome.status,
        error: outcome.error ?? null,
        userId: message.userId ?? null,
      },
    });
    const overflow = await prisma.mailAttempt.findMany({
      orderBy: { createdAt: "desc" },
      skip: KEEP_ATTEMPTS,
      take: 1,
      select: { createdAt: true },
    });
    if (overflow[0]) {
      await prisma.mailAttempt.deleteMany({ where: { createdAt: { lt: overflow[0].createdAt } } });
    }
  } catch (error) {
    // The history is a diagnostic aid, never a reason to fail a mail that
    // went out, or to break a password reset.
    console.error("[mailer] could not record attempt", error);
  }
}

export async function sendMail(message: MailMessage): Promise<MailOutcome> {
  const client = getTransporter();

  if (!client) {
    console.info(
      `[mailer] SMTP_HOST not set — logging instead of sending.\n` +
        `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`,
    );
    const outcome: MailOutcome = { status: "notConfigured" };
    await recordAttempt(message, outcome);
    return outcome;
  }

  const from = senderAddress();
  try {
    await client.sendMail({
      from,
      replyTo: from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    const outcome: MailOutcome = { status: "sent" };
    await recordAttempt(message, outcome);
    return outcome;
  } catch (error) {
    // Never rethrow: the caller must not reveal delivery problems to the
    // browser, because that would turn the reset form into an oracle for
    // which addresses exist. The test endpoint is the one place the wording
    // is shown, and there the admin asked for it.
    const outcome: MailOutcome = { status: "failed", error: failureText(error) };
    console.error(`[mailer] Failed to send mail to ${message.to}: ${outcome.error}`);
    await recordAttempt(message, outcome);
    return outcome;
  }
}
