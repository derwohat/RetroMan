import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { authBypassEnabled } from "@/lib/auth/devBypass";

// /api/app-settings carries only display settings (font size, language) and is
// needed by the sign-in page itself, where nobody is signed in yet.
const PUBLIC_PATHS = ["/login", "/setup", "/api/auth", "/api/upload", "/api/setup", "/api/app-settings"];
const MFA_PATHS   = ["/verify-mfa", "/api/auth/mfa/verify"];

/** A request for data, not for a page — it must not be answered with HTML. */
function wantsData(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

/**
 * Where to send someone who is not signed in. Data calls get a status they
 * can act on; pages get the sign-in form, carrying the path back with them.
 */
function refuse(req: NextRequest, target: string): NextResponse {
  const { nextUrl } = req;
  if (wantsData(nextUrl.pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(target, nextUrl);
  if (target === "/login") {
    url.searchParams.set("redirect", nextUrl.pathname + nextUrl.search);
  }
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  if (authBypassEnabled()) return NextResponse.next();

  const { nextUrl } = req;
  const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));
  const isMfaPath = MFA_PATHS.some((p) => nextUrl.pathname.startsWith(p));

  if (!isPublic) {
    const session = await auth();
    if (!session?.user) {
      return refuse(req, "/login");
    }
    // User logged in but TOTP not yet verified
    if (session.user.mfaPending && !isMfaPath) {
      return refuse(req, "/verify-mfa");
    }
    if (session.user.mustChangePassword && !nextUrl.pathname.startsWith("/change-password") && !isMfaPath) {
      return refuse(req, "/change-password");
    }
    // Admin-only pages — redirect non-admins to dashboard
    if (nextUrl.pathname.startsWith("/admin") && session.user.role !== "ADMIN") {
      // Signed in but not permitted is a 403, not an expired session — the
      // guard in the browser must not send anyone to the sign-in page for it.
      if (wantsData(nextUrl.pathname)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
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
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|apple-icon\\.png|icon\\.png|icon-32\\.png|icon-192\\.png|icon-512\\.png|icon-maskable-512\\.png|logo\\.png).*)",
  ],
};
