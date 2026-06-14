import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { FontSizeProvider } from "@/components/FontSizeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
