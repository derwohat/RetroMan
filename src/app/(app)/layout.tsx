export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
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
      <div className="flex h-screen flex-col bg-background grid-bg">
        <FontSizeProvider />
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </LanguageProvider>
  );
}
