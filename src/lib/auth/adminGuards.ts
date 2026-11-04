import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { authBypassEnabled } from "@/lib/auth/devBypass";

/**
 * The two guards every change to a role or an active status runs through.
 *
 * Codebook docs/user-management.md, "Vier Erweiterungen aus TransportMans
 * Benutzerverwaltung", point 1:
 *
 *  - SELF-PROTECTION. Nobody may change their own role or their own active
 *    status; that needs another administrator. The last-admin rule alone does
 *    not cover this — it only stops the LAST admin disappearing, and happily
 *    lets the second-to-last one demote themselves while a colleague remains.
 *    Whoever strips their own rights by accident cannot put them back.
 *  - LAST ADMIN. No change may leave the installation without an active
 *    administrator. This stays as the second lock even though self-protection
 *    makes it nearly unreachable through the API: an active admin demoting
 *    another active admin leaves themselves behind.
 *
 * What this REPLACES is stricter in one direction and looser in another, and
 * the loosening is deliberate: RetroMan used to refuse every change to any
 * admin account at all ("Admin-Accounts können nicht deaktiviert werden"),
 * which also meant an administrator who left the company could never be
 * switched off. Now another administrator can do it, and only the two cases
 * above are refused.
 */

export type GuardFailure = { error: string; status: number };

/** Who is acting. null means the development bypass is on. */
export async function actingUserId(): Promise<string | null> {
  if (authBypassEnabled()) return null;
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * @param targetId the account being changed
 * @param change   what the request wants to do to it
 */
export async function guardRoleOrStatusChange(
  targetId: string,
  change: { nextRole?: "USER" | "ADMIN"; nextActive?: boolean; removing?: boolean },
): Promise<GuardFailure | null> {
  const actorId = await actingUserId();

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { role: true, deletedAt: true },
  });
  if (!target) return { error: "Nicht gefunden", status: 404 };

  const touchesRole = change.nextRole !== undefined && change.nextRole !== target.role;
  const wasActive = target.deletedAt === null;
  const touchesStatus =
    change.removing === true ||
    (change.nextActive !== undefined && change.nextActive !== wasActive);

  // Self-protection. 409 rather than 403: the request is well-formed and the
  // caller is permitted in general — it conflicts with the state of the
  // installation, and the message says who can do it instead.
  if (actorId && actorId === targetId && (touchesRole || touchesStatus)) {
    return {
      error:
        "Die eigene Rolle und der eigene Aktiv-Status lassen sich nur von " +
        "einem anderen Administrator ändern.",
      status: 409,
    };
  }

  // Would this leave no active administrator?
  const losesAdmin =
    target.role === "ADMIN" &&
    wasActive &&
    (change.removing === true || change.nextRole === "USER" || change.nextActive === false);

  if (losesAdmin) {
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", deletedAt: null },
    });
    if (activeAdmins <= 1) {
      return {
        error: "Es muss mindestens ein aktiver Administrator bleiben.",
        status: 409,
      };
    }
  }

  return null;
}
