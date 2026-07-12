import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import "@/lib/auth/types";

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
        token.role = (user as { role?: string }).role;
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword;
        token.mfaEnabled = (user as { mfaEnabled?: boolean }).mfaEnabled;
        // If MFA is enabled, mark as pending until TOTP is verified
        token.mfaPending = (user as { mfaEnabled?: boolean }).mfaEnabled === true;
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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "Authenticator Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const key = `login:${(credentials.email as string).toLowerCase()}`;
        const { ok, retryAfterSecs } = rateLimit(key);
        if (!ok) {
          throw new Error(`Zu viele Anmeldeversuche. Bitte in ${retryAfterSecs} Sekunden erneut versuchen.`);
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string, deletedAt: null },
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
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          mfaEnabled: user.mfaEnabled,
        };
      },
    }),
  ],
});
