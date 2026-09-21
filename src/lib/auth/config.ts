import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import "@/lib/auth/types";

class RateLimitedError extends CredentialsSignin {
  code = "RateLimited";
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
        const key = `login:${username}`;
        const { ok } = rateLimit(key);
        if (!ok) {
          throw new RateLimitedError();
        }

        const user = await prisma.user.findUnique({
          where: { username, deletedAt: null },
        });

        if (!user) return null;

        const passwordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!passwordValid) return null;

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
