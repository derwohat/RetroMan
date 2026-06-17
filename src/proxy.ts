import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";

const PUBLIC_PATHS = ["/login", "/setup", "/api/auth", "/api/upload"];

export async function proxy(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const { nextUrl } = req;
  const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));

  if (!isPublic) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    if (session.user.mustChangePassword && !nextUrl.pathname.startsWith("/change-password")) {
      return NextResponse.redirect(new URL("/change-password", nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|logo\\.png).*)"],
};
