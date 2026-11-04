import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { appBaseUrl, mailIsConfigured, sendMail } from "@/lib/mailer";
import { createResetToken, INVITE_TTL_MS } from "@/lib/passwordReset";
import {
  htmlText,
  renderMailHtml,
  renderMailText,
  type MailContent,
} from "@/lib/mail/layout";
import { translations } from "@/lib/i18n";
import { randomBytes } from "crypto";
import { authBypassEnabled } from "@/lib/auth/devBypass";

function genPassword() {
  return randomBytes(8).toString("base64url").slice(0, 12);
}

async function checkAdmin(): Promise<NextResponse | null> {
  if (authBypassEnabled()) return null;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Signed in but not permitted is 403, never 401 — a 401 reads as an
  // expired session and sends the browser to the sign-in page.
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await checkAdmin();
  if (denied) return denied;

  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, name: true, email: true, role: true,
      mustChangePassword: true, mfaEnabled: true,
      deletedAt: true, createdAt: true, lastLoginAt: true,
      // The list decides from this whether to offer "Entsperren" at all. A
      // button that does nothing on most rows teaches people to ignore it.
      lockedUntil: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const denied = await checkAdmin();
  if (denied) return denied;

  const { username, name, email, role } = await req.json();
  if (!username || !name || !email) {
    return NextResponse.json({ error: "Benutzername, Name und E-Mail erforderlich." }, { status: 400 });
  }
  const normalizedUsername = String(username).trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,32}$/.test(normalizedUsername)) {
    return NextResponse.json({
      error: "Benutzername muss 3-32 Zeichen lang sein und darf nur Kleinbuchstaben, Ziffern, '_', '.' und '-' enthalten.",
    }, { status: 400 });
  }

  const existingUsername = await prisma.user.findFirst({ where: { username: normalizedUsername } });
  if (existingUsername) {
    return NextResponse.json({ error: "Benutzername bereits vergeben." }, { status: 409 });
  }
  const existingEmail = await prisma.user.findFirst({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "E-Mail bereits vergeben." }, { status: 409 });
  }

  // Codebook docs/user-management.md, point 4: where a mail server exists,
  // the invitation link is the preferred way in — the admin never sees a
  // password, and the invited person chooses their own. Where there is none,
  // the admin-set one-time password stays the only way; no product may depend
  // on a mail server existing.
  const perMail = mailIsConfigured();

  // Either way the account is created with a password nobody knows. In the
  // mail case that is the point: the only way in is the link. In the fallback
  // case it is replaced right below by one the admin is shown.
  const tempPassword = genPassword();
  const user = await prisma.user.create({
    data: {
      username: normalizedUsername,
      name,
      email,
      passwordHash: await hashPassword(perMail ? genPassword() + genPassword() : tempPassword),
      role: role === "ADMIN" ? "ADMIN" : "USER",
      mustChangePassword: true,
    },
    select: {
      id: true, username: true, name: true, email: true, role: true,
      mustChangePassword: true, createdAt: true,
    },
  });

  if (!perMail) {
    return NextResponse.json({ user, tempPassword }, { status: 201 });
  }

  const token = await createResetToken(user.id, INVITE_TTL_MS);
  const link = `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const t = translations.de.auth;
  const content: MailContent = {
    preview: t.inviteMailPreview,
    heading: t.inviteMailHeading,
    paragraphs: [
      htmlText("<strong>{greeting}</strong>", {
        greeting: t.inviteMailGreeting.replace("{name}", user.name),
      }),
      t.inviteMailIntro,
    ],
    facts: [
      { label: t.inviteMailUsernameLabel, value: user.username, mono: true },
      { label: t.inviteMailValidityLabel, value: t.inviteMailValidityValue },
    ],
    button: { label: t.inviteMailButton, url: link },
    note: t.inviteMailNote,
  };

  const outcome = await sendMail({
    to: user.email,
    subject: t.inviteMailSubject,
    text: renderMailText(content),
    html: renderMailHtml(content),
    trigger: "invitation",
    userId: user.id,
  });

  if (outcome.status !== "sent") {
    // The mail did not go out, so the invitation link is in nobody's hands.
    // Leaving the admin with neither a password nor a link would mean an
    // account that cannot be used and cannot be explained — so the fallback
    // takes over and the reason is passed along.
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(tempPassword) },
    });
    return NextResponse.json(
      { user, tempPassword, mailFailed: true, mailError: outcome.error },
      { status: 201 },
    );
  }

  return NextResponse.json({ user, invitedByMail: true }, { status: 201 });
}
