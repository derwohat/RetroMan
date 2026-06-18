export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { FontSizeProvider } from "@/components/FontSizeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userCount = await prisma.user.count();
  if (userCount === 0) redirect("/setup");

  if (process.env.NODE_ENV === "production") {
    const session = await auth();
    if (!session?.user) redirect("/login");
    if (session.user.mustChangePassword) redirect("/change-password");
  }

  return (
    <LanguageProvider>
      <FontSizeProvider />
      <AppShell>{children}</AppShell>
    </LanguageProvider>
  );
}
