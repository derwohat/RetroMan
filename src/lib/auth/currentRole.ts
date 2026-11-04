import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { authBypassEnabled } from "@/lib/auth/devBypass";

export type AppRole = "USER" | "ADMIN";

/**
 * The signed-in account's role, read on the server.
 *
 * The sidebar needs this before the first paint. It used to learn the role
 * from `fetch("/api/me")` in the browser, which meant the administration
 * entries appeared a moment late and — worse — that an administration route
 * rendered with no marked entry at all until the request came back.
 *
 * The bypass branch mirrors /api/me on purpose: both assume the first account,
 * so a development session does not see two different roles depending on
 * which one answered.
 */
export async function currentRole(): Promise<AppRole | null> {
  if (authBypassEnabled()) {
    const first = await prisma.user.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { role: true },
    });
    return first?.role ?? null;
  }

  // The role is already in the session token, so this costs no query.
  const session = await auth();
  const role = session?.user?.role;
  return role === "ADMIN" || role === "USER" ? role : null;
}
