import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Not logged in → redirect to login
  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (req.auth) {
    const { mustChangePassword, mfaEnabled } = req.auth.user as {
      mustChangePassword?: boolean;
      mfaEnabled?: boolean;
      mfaPending?: boolean;
    };

    // Force password change on first login
    if (mustChangePassword && pathname !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }

    // MFA verification pending
    if (
      (req.auth.user as { mfaPending?: boolean }).mfaPending &&
      pathname !== "/verify-mfa"
    ) {
      return NextResponse.redirect(new URL("/verify-mfa", req.url));
    }

    // Prevent logged-in users from accessing login page
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|logo.png|public).*)"],
};
