export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { FontSizeProvider } from "@/components/FontSizeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { authBypassEnabled } from "@/lib/auth/devBypass";
import { currentRole } from "@/lib/auth/currentRole";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userCount = await prisma.user.count();
  if (userCount === 0) redirect("/setup");

  if (!authBypassEnabled()) {
    const session = await auth();
    if (!session?.user) redirect("/login");
    if (session.user.mustChangePassword) redirect("/change-password");
  }

  // The sidebar decides from this which entries the "Einstellungen" group
  // holds. Handing it down from here means the first paint is already right,
  // instead of the administration entries arriving with a later request.
  const role = await currentRole();

  return (
    <LanguageProvider>
      <FontSizeProvider />
      <AppShell role={role}>{children}</AppShell>
    </LanguageProvider>
  );
}
