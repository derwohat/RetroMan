import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";

const PUBLIC_PATHS = ["/login", "/setup", "/api/auth", "/api/upload", "/api/setup"];
const MFA_PATHS   = ["/verify-mfa", "/api/auth/mfa/verify"];

export async function proxy(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

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
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|logo\\.png).*)"],
};
