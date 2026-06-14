import { AppHeader } from "@/components/layout/AppHeader";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { FontSizeProvider } from "@/components/FontSizeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="flex h-screen flex-col bg-background">
        <FontSizeProvider />
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <AdminSidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </LanguageProvider>
  );
}
