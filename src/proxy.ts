import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { authBypassEnabled } from "@/lib/auth/devBypass";

const PUBLIC_PATHS = ["/login", "/setup", "/api/auth", "/api/upload", "/api/setup"];
const MFA_PATHS   = ["/verify-mfa", "/api/auth/mfa/verify"];

export async function proxy(req: NextRequest) {
  if (authBypassEnabled()) return NextResponse.next();

  const { nextUrl } = req;
  const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));
  const isMfaPath = MFA_PATHS.some((p) => nextUrl.pathname.startsWith(p));

  if (!isPublic) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    // User logged in but TOTP not yet verified
    if (session.user.mfaPending && !isMfaPath) {
      return NextResponse.redirect(new URL("/verify-mfa", nextUrl));
    }
    if (session.user.mustChangePassword && !nextUrl.pathname.startsWith("/change-password") && !isMfaPath) {
      return NextResponse.redirect(new URL("/change-password", nextUrl));
    }
    // Admin-only pages — redirect non-admins to dashboard
    if (nextUrl.pathname.startsWith("/admin") && session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Home-screen icons and the manifest must answer without a session: the
  // phone fetches them as ordinary requests, and anything behind the login
  // returns the sign-in page instead — which is exactly why an app added to
  // the home screen ends up showing a screenshot of the login form.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|apple-icon\\.png|icon\\.png|icon-192\\.png|icon-512\\.png|icon-maskable-512\\.png|logo\\.png).*)",
  ],
};
