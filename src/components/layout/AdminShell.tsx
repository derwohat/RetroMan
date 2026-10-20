"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "./AppHeader";
import { AdminSidebar } from "./AdminSidebar";

// Codebook docs/product-standards.md, "Mobile Ansicht: Schublade und Karten".
// The app side had this; the admin side did not, so its 208px sidebar sat
// permanently on a 390px screen and left the content about 134px wide. Same
// drawer, same three details — close on route change, on Escape, and the
// burger carries aria-expanded/aria-controls.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  return (
    // 100dvh rather than 100vh: on a phone the browser bars come and go, and
    // 100vh counts them as absent, so the bottom of the shell sits under them.
    <div className="flex h-viewport flex-col bg-background">
      <AppHeader
        onMenuToggle={() => setSidebarOpen((open) => !open)}
        sidebarOpen={sidebarOpen}
        sidebarId="admin-sidebar"
      />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
