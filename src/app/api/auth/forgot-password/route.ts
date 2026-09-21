import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { createResetToken } from "@/lib/passwordReset";
import { appBaseUrl, mailIsConfigured, sendMail } from "@/lib/mailer";
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

  const forwardedFor = (await headers()).get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
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

  // Delivery problems are logged inside sendMail and deliberately not
  // surfaced: a "mail failed" response would expose that the address exists.
  await sendMail({
    to: user.email,
    subject: t.resetMailSubject,
    text: t.resetMailBody.replace("{name}", user.name).replace("{link}", link),
  });

  return done;
}
