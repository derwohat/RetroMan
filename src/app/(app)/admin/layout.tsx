export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { currentRole } from "@/lib/auth/currentRole";

/**
 * The administration pages moved under the app's own shell, so they no longer
 * bring their own sidebar — Codebook docs/product-standards.md,
 * "Benutzerverwaltung unter Einstellungen". Their routes are unchanged.
 *
 * What they never had is a gate of their own. The APIs behind them all answer
 * 403 to a non-administrator, so nothing leaked, but someone who typed
 * /admin/users got a page that only produced errors. A signed-in user who may
 * not be here belongs somewhere they may be, not on a broken page.
 *
 * The surrounding (app) layout has already established that there is a
 * session; this one only decides about the role.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if ((await currentRole()) !== "ADMIN") redirect("/dashboard");

  return <>{children}</>;
}
