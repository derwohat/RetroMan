import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { authBypassEnabled } from "@/lib/auth/devBypass";
import { mailIsConfigured, sendMail } from "@/lib/mailer";
import { renderMailHtml, renderMailText, type MailContent } from "@/lib/mail/layout";
import { rateLimit } from "@/lib/rateLimit";

// Codebook docs/operations.md: five attempts per minute and admin. Setting a
// mail server up means trying a few times in a row, which this covers
// comfortably; as a pump it is useless.
const TEST_LIMIT = 5;
const TEST_WINDOW_MS = 60_000;

// Subject and body are constants on purpose. If they came from the request,
// the button would be a way to send arbitrary content through the company's
// mail server, and a stolen admin account would suddenly be worth something.
const TEST_SUBJECT = "RetroMan — Testnachricht";

// Brandbook §13 / Codebook "Gestaltete Mails": the mail supplies content, the
// layout builds both versions. The test message carries no link on purpose —
// the content is fixed here and never comes from the request, because a free
// text field would turn the button into a way to send arbitrary mail through
// the company's server.
const TEST_CONTENT: MailContent = {
  preview: "Prüfnachricht aus RetroMan — der Versand funktioniert.",
  heading: "Der Mailversand funktioniert",
  paragraphs: [
    "Diese Nachricht wurde aus RetroMan heraus verschickt, um den Mailversand zu prüfen.",
    "Kommt sie an, funktioniert der Versand an diese Adresse — damit auch Einladungen und Links zum Zurücksetzen von Passwörtern.",
  ],
  note: "Eine Antwort ist nicht nötig.",
};

/** Deliberately narrow: one @, something either side, a dot in the domain. */
function looksLikeAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!authBypassEnabled()) {
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Signed in but not permitted is 403, never 401 — a 401 reads as an
    // expired session and sends the browser to the sign-in page.
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  // Per admin, so one person cannot spend everyone else's budget.
  const adminId = session?.user?.id ?? "dev-bypass";

  // A switch that can never work is worse than none, so the UI hides the
  // button; this is the same answer for anyone calling the endpoint directly.
  if (!mailIsConfigured()) {
    return NextResponse.json({ error: "NotConfigured" }, { status: 409 });
  }

  const limit = rateLimit(`mail:test:${adminId}`, TEST_LIMIT, TEST_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "RateLimited", retryAfterSecs: limit.retryAfterSecs },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSecs) } },
    );
  }

  const body = await request.json().catch(() => null);
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  if (!looksLikeAddress(to)) {
    return NextResponse.json({ error: "InvalidAddress" }, { status: 422 });
  }

  const outcome = await sendMail({
    to,
    subject: TEST_SUBJECT,
    text: renderMailText(TEST_CONTENT),
    html: renderMailHtml(TEST_CONTENT),
    trigger: "test",
    userId: session?.user?.id ?? null,
  });

  // The admin asked for this one, so the server's wording goes back as it
  // came — unlike the password-reset path, there is nothing to leak here.
  return NextResponse.json(outcome);
}
