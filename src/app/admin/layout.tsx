import { AdminShell } from "@/components/layout/AdminShell";
import { FontSizeProvider } from "@/components/FontSizeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <FontSizeProvider />
      <AdminShell>{children}</AdminShell>
    </LanguageProvider>
  );
}
