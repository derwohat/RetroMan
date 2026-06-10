import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// AUTH BYPASS — development/UI testing only
// TODO: re-enable auth before production
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|logo.png).*)"],
};
