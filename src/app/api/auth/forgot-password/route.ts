import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { clientAddress } from "@/lib/clientAddress";
import { createResetToken } from "@/lib/passwordReset";
import { appBaseUrl, mailIsConfigured, sendMail } from "@/lib/mailer";
import {
  htmlText,
  renderMailHtml,
  renderMailText,
  type MailContent,
} from "@/lib/mail/layout";
import { translations, type Locale } from "@/lib/i18n";

// Codebook docs/security.md: 5 requests per 15 minutes per IP.
const REQUEST_LIMIT = 5;

function isLocale(value: string): value is Locale {
  return value === "de" || value === "en" || value === "fr";
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const rawLocale = typeof body?.locale === "string" ? body.locale : "de";
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "de";

  const ip = await clientAddress();
  const { ok } = rateLimit(`pwreset:request:${ip}`, REQUEST_LIMIT);
  if (!ok) {
    return NextResponse.json({ error: "RateLimited" }, { status: 429 });
  }

  // Everything below answers identically. The form must never reveal whether
  // an address belongs to an account — that would turn it into a directory of
  // registered users. Man-Suite Codebook docs/security.md, Baustein 1.
  const done = NextResponse.json({ done: true });

  if (!email || !mailIsConfigured()) return done;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    select: { id: true, email: true, name: true },
  });
  if (!user) return done;

  const token = await createResetToken(user.id);
  const link = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const t = translations[locale].auth;

  // Brandbook §13 / Codebook "Gestaltete Mails": the mail supplies only its
  // content, the layout builds both versions from it. The address in the
  // button comes from the configured base address (appBaseUrl), never from a
  // Host header — otherwise a forged header would send the reset link to
  // somebody else's server.
  const content: MailContent = {
    preview: t.resetMailPreview,
    heading: t.resetMailHeading,
    paragraphs: [
      htmlText("<strong>{greeting}</strong>", {
        greeting: t.resetMailGreeting.replace("{name}", user.name),
      }),
      t.resetMailIntro,
    ],
    facts: [{ label: t.resetMailValidityLabel, value: t.resetMailValidityValue }],
    button: { label: t.resetMailButton, url: link },
    note: t.resetMailIgnore,
  };

  // Delivery problems are logged inside sendMail and deliberately not
  // surfaced: a "mail failed" response would expose that the address exists.
  await sendMail({
    to: user.email,
    subject: t.resetMailSubject,
    text: renderMailText(content),
    html: renderMailHtml(content),
    trigger: "passwordReset",
    userId: user.id,
  });

  return done;
}
