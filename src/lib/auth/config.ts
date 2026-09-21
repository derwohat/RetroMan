import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
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
const LOCK_THRESHOLD = 5;
const BASE_LOCK_MS = 15 * 60_000;
const MAX_LOCK_MS = 24 * 60 * 60_000;
const IP_FLOOD_LIMIT = 30;

/** Doubles per further block, capped, so repeat offenders wait progressively longer. */
function lockDurationMs(failedAttempts: number): number {
  const blocks = Math.floor(failedAttempts / LOCK_THRESHOLD) - 1;
  return Math.min(BASE_LOCK_MS * 2 ** Math.max(0, blocks), MAX_LOCK_MS);
}

// Set once when this module loads (= server/process start).
// In production: any JWT issued before this moment is rejected → forces re-login after restart.
// In dev: always 0 so HMR saves don't log the user out constantly.
const SERVER_BOOT_AT = process.env.NODE_ENV === "production"
  ? Math.floor(Date.now() / 1000)
  : 0;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 60,   // token expires after 30 minutes
    updateAge: 5 * 60, // refresh token when more than 5 minutes old (rolling window)
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
        return token;
      }
      // Reject any token issued before this server started (forces re-login after restart)
      if (SERVER_BOOT_AT > 0 && typeof token.iat === "number" && token.iat < SERVER_BOOT_AT) {
        return null;
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
      // Allow client to clear mfaPending after TOTP verification or mustChangePassword after PW change
      if (trigger === "update" && session) {
        if (typeof session.mfaPending === "boolean") token.mfaPending = session.mfaPending;
        if (typeof session.mustChangePassword === "boolean") token.mustChangePassword = session.mustChangePassword;
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

        const username = (credentials.username as string).toLowerCase();

        // Flood brake only — deliberately wide. It used to sit at 10 per
        // account and counted every attempt, so ten correct sign-ins locked
        // the account; that is exactly the failure the Codebook warns about.
        const forwardedFor = (await headers()).get("x-forwarded-for");
        const ip = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
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
              lockedUntil:
                attempts >= LOCK_THRESHOLD
                  ? new Date(Date.now() + lockDurationMs(attempts))
                  : null,
            },
          });
          return null;
        }

        // A successful sign-in clears the counter, so someone who mistypes a
        // few times and then gets it right starts fresh.
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
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
});
