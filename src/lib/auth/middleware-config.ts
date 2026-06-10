import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

// Lightweight config for Edge Middleware — no Prisma imports
const config: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword;
        token.mfaEnabled = (user as { mfaEnabled?: boolean }).mfaEnabled;
        token.mfaPending = (user as { mfaPending?: boolean }).mfaPending;
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
  providers: [], // Providers live in the full config (Node.js only)
};

export const { auth } = NextAuth(config);
