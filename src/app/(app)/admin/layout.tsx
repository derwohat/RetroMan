export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { currentRole } from "@/lib/auth/currentRole";

/**
 * The administration pages moved under the app's own shell, so they no longer
 * bring their own sidebar — Codebook docs/product-standards.md,
 * "Benutzerverwaltung unter Einstellungen". Their routes are unchanged.
 *
 * This is the SECOND lock on the role, not the first. src/proxy.ts has checked
 * it before every request for a long time and redirects a non-administrator to
 * the dashboard, so nothing was open. This one sits at the pages themselves and
 * holds when the first is misconfigured: a changed `config.matcher`, or /admin
 * landing in PUBLIC_PATHS. That is not hypothetical — in v1.4.0 one entry in
 * exactly that list opened the upload route, and the one check standing behind
 * it is what decides whether such a mistake is a bug or a breach.
 *
 * It was first committed as a fix for a page that "only produced errors". That
 * was wrong: the run meant to prove it measured the proxy, because this layout
 * was never switched off for the comparison. Codebook
 * docs/product-standards.md, point 3 of "Vier Dinge, die beim Auflösen eines
 * separaten Admin-Bereichs auffallen".
 *
 * The surrounding (app) layout has already established that there is a
 * session; this one only decides about the role.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if ((await currentRole()) !== "ADMIN") redirect("/dashboard");

  return <>{children}</>;
}
