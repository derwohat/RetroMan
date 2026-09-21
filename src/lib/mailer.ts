import nodemailer from "nodemailer";

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

interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

// Three outcomes, not two: an interface that cannot distinguish "no server
// configured" from "sent" reports success for mail that went nowhere.
export type MailResult = "sent" | "notConfigured" | "failed";

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

/** Base URL for links inside mails — falls back to the dev server. */
export function appBaseUrl(): string {
  return process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:7002";
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const from = process.env.SMTP_FROM ?? "RetroMan <no-reply@retroman.localhost>";
  const client = getTransporter();

  if (!client) {
    console.info(
      `[mailer] SMTP_HOST not set — logging instead of sending.\n` +
        `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`,
    );
    return "notConfigured";
  }

  try {
    await client.sendMail({ from, replyTo: from, ...message });
    return "sent";
  } catch (error) {
    // Never rethrow: the caller must not reveal delivery problems to the
    // browser, because that would turn the reset form into an oracle for
    // which addresses exist.
    const text = error instanceof Error ? error.message : String(error);
    console.error(`[mailer] Failed to send mail to ${message.to}: ${text.slice(0, 200)}`);
    return "failed";
  }
}
