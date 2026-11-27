import { randomUUID } from "node:crypto";
import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import type { NextRequest } from "next/server";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
import { isSecureConnection } from "@/lib/auth/cookieBinding";
import { prisma } from "@/lib/db/prisma";
import { getSessionLimits } from "@/lib/auth/sessionLimits";
import { verifyMfaProof } from "@/lib/auth/mfaProof";
import { lockAfterFailure } from "@/lib/auth/lockout";
import { rateLimit } from "@/lib/rateLimit";
import { clientAddress } from "@/lib/clientAddress";
import "@/lib/auth/types";

class RateLimitedError extends CredentialsSignin {
  code = "RateLimited";
}

class AccountLockedError extends CredentialsSignin {
  code = "AccountLocked";
}

// Codebook docs/security.md: the account lockout is the actual protection
// against password guessing — it counts failed attempts per account and
// resets on success. The IP limiter below is only a flood brake and must sit
// far enough out that normal use never reaches it; an IP limit counting every
// request (successes included) means five correct sign-ins lock you out, and
// everyone behind one address shares the budget.
// The lock rules themselves live in lockout.ts, shared with the code step.
const IP_FLOOD_LIMIT = 30;

// In production: any JWT issued before this server process started is
// rejected → forces re-login after a restart. In dev: always 0 so HMR saves
// don't log the user out constantly.
//
// The stamp lives on globalThis, once per process, not in a module constant.
// The production build bundles this module once per layer — proxy, route
// handlers, server components — and each copy loads on its first use. The
// server-component copy loaded only on the first page request after sign-in,
// stamped a later second than the token just issued, and refused it: the
// first sign-in after every restart could bounce back to /login. The layers
// share one process and one globalThis, so the first copy to load fixes the
// moment for all of them — still after every token of the previous process.
const BOOT_KEY = "__retromanAuthBootAt";

function serverBootAt(): number {
  if (process.env.NODE_ENV !== "production") return 0;
  const shared = globalThis as typeof globalThis & { [BOOT_KEY]?: number };
  const stamp = shared[BOOT_KEY] ?? Math.floor(Date.now() / 1000);
  shared[BOOT_KEY] = stamp;
  return stamp;
}

const SERVER_BOOT_AT = serverBootAt();

/**
 * next-auth hands the real request to the HTTP handlers — the place where
 * the cookie is actually set — and `undefined` to server-side
 * `signIn`/`signOut` and to React Server Components (its lib/index.js calls
 * `config(undefined)` there). Those still run inside a request, so the
 * headers are available to read directly.
 */
async function secureCookies(req: NextRequest | undefined): Promise<boolean> {
  if (req) {
    return isSecureConnection(
      req.headers.get("x-forwarded-proto"),
      req.headers.get("x-forwarded-host"),
      req.headers.get("host"),
    );
  }
  try {
    const incoming = await headers();
    return isSecureConnection(
      incoming.get("x-forwarded-proto"),
      incoming.get("x-forwarded-host"),
      incoming.get("host"),
    );
  } catch {
    // Outside a request there is nothing to judge by; fall back to the
    // configured address, which is what Auth.js would have used anyway.
    return isSecureConnection(null, null, null);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(async (req) => ({
  useSecureCookies: await secureCookies(req),
  session: {
    strategy: "jwt",
    // The real deadlines live in the jwt callback, because both are
    // configurable and a change has to reach sessions that are already open —
    // a static maxAge is fixed when the process starts. This is only the
    // outer bound, matching the largest absolute limit the settings allow.
    maxAge: 168 * 3600,
    updateAge: 5 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username;
        token.role = (user as { role?: string }).role;
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword;
        token.mfaEnabled = (user as { mfaEnabled?: boolean }).mfaEnabled;
        // If MFA is enabled, mark as pending until TOTP is verified
        token.mfaPending = (user as { mfaEnabled?: boolean }).mfaEnabled === true;
        token.passwordChangedAt = (user as { passwordChangedAt?: number }).passwordChangedAt;
        // Session start travels with the token. Without it the absolute cap
        // would restart on every refresh and never bite.
        token.sessionStart = Math.floor(Date.now() / 1000);
        token.lastSeen = token.sessionStart;
        // Random per sign-in; the MFA proof is bound to it so a proof from one
        // session is worthless in any other.
        token.sid = randomUUID();
        return token;
      }
      // Reject any token issued before this server started (forces re-login after restart)
      if (SERVER_BOOT_AT > 0 && typeof token.iat === "number" && token.iat < SERVER_BOOT_AT) {
        return null;
      }

      // Two deadlines, the earlier one wins (Codebook docs/security.md).
      // Idle alone never ends a session in use: a stolen cookie that someone
      // keeps using would stay valid indefinitely. The absolute cap closes
      // that; the idle window handles the forgotten open tab.
      {
        const now = Math.floor(Date.now() / 1000);
        const { idleSeconds, absoluteSeconds } = await getSessionLimits();

        if (typeof token.sessionStart === "number" && now - token.sessionStart > absoluteSeconds) {
          return null;
        }
        if (typeof token.lastSeen === "number" && now - token.lastSeen > idleSeconds) {
          return null;
        }
        // Tokens minted before this field existed get a start time now rather
        // than being treated as infinitely old.
        if (typeof token.sessionStart !== "number") token.sessionStart = now;
        token.lastSeen = now;
      }
      // Sessions are JWTs, so a password reset cannot delete them server-side.
      // Instead every request re-checks the account: a token whose stamp no
      // longer matches the stored value was minted before the password
      // changed, and dies here. This also drops tokens for deleted accounts.
      if (typeof token.id === "string") {
        const current = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            deletedAt: true,
            passwordChangedAt: true,
            role: true,
            mustChangePassword: true,
          },
        });
        if (!current || current.deletedAt) return null;
        if (current.passwordChangedAt.getTime() !== token.passwordChangedAt) return null;
        // Picked up without a re-login when an admin changes them.
        token.role = current.role;
        token.mustChangePassword = current.mustChangePassword;
      }
      // SECURITY: `session` here is whatever the browser sent to update its
      // own token, so nothing in it is believed. The pending second factor is
      // lifted only by the proof /api/auth/mfa/verify issues after checking a
      // code, bound to this user and this session. The earlier version took
      // `mfaPending` straight from the browser, which let the password alone
      // skip the code. mustChangePassword is not taken from it either: the
      // database value above is the only source (and is re-applied on every
      // request, so a value from the browser could not have stuck anyway).
      if (trigger === "update" && token.mfaPending === true) {
        const proof = (session as { mfaProof?: unknown } | null | undefined)?.mfaProof;
        if (
          typeof token.id === "string" &&
          typeof token.sid === "string" &&
          verifyMfaProof(proof, token.id, token.sid)
        ) {
          token.mfaPending = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.mfaEnabled = token.mfaEnabled as boolean;
        session.user.mfaPending = token.mfaPending as boolean;
        // Not a secret: the proof it is bound to needs the server key as well.
        session.user.sid = token.sid as string | undefined;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        totp: { label: "Authenticator Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Trimmed as well as lowercased, the same way the account was created.
        // Without the trim a trailing space — which phone keyboards add after
        // an autocomplete pick — looked like a wrong password.
        const username = (credentials.username as string).trim().toLowerCase();

        // Flood brake only — deliberately wide. It used to sit at 10 per
        // account and counted every attempt, so ten correct sign-ins locked
        // the account; that is exactly the failure the Codebook warns about.
        const ip = await clientAddress();
        if (!rateLimit(`login:ip:${ip}`, IP_FLOOD_LIMIT).ok) {
          throw new RateLimitedError();
        }

        const user = await prisma.user.findUnique({
          where: { username, deletedAt: null },
        });

        if (!user) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new AccountLockedError();
        }

        const plainPassword = credentials.password as string;
        const passwordValid = await verifyPassword(user.passwordHash, plainPassword);

        if (!passwordValid) {
          const attempts = user.failedLoginAttempts + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil: lockAfterFailure(attempts, Date.now()),
            },
          });
          return null;
        }

        // A successful sign-in clears the counter, so someone who mistypes a
        // few times and then gets it right starts fresh. Not yet for an account
        // with a second factor: the password alone is not a finished sign-in,
        // and clearing here would hand a password holder a fresh budget of code
        // guesses on every login. The code step clears it instead.
        if (!user.mfaEnabled && (user.failedLoginAttempts > 0 || user.lockedUntil)) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        // Lazy rehash: an account still on bcrypt is upgraded to Argon2id the
        // first time its owner signs in, so no one has to reset anything.
        // Awaited rather than fire-and-forget — a lost upgrade would silently
        // keep the weaker hash around forever.
        if (needsRehash(user.passwordHash)) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: await hashPassword(plainPassword) },
            });
          } catch (error) {
            // Never block a valid sign-in over this; it retries next time.
            console.error("[auth] rehash failed", error);
          }
        }

        // Track login timestamp (fire-and-forget, non-blocking)
        prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          mfaEnabled: user.mfaEnabled,
          passwordChangedAt: user.passwordChangedAt.getTime(),
        };
      },
    }),
  ],
}));
