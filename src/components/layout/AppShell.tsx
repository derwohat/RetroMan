"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { ChangelogModal } from "./ChangelogModal";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [changelogForceOpen, setChangelogForceOpen] = useState(false);
  const pathname = usePathname();

  // Tapping a destination navigates but leaves the drawer covering it, so it
  // closes on every route change.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Escape is what people try when an overlay is in the way, and without it
  // the only way out is hitting the backdrop precisely.
  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function reset() {
      clearTimeout(timer);
      timer = setTimeout(() => signOut({ callbackUrl: "/login" }), IDLE_TIMEOUT_MS);
    }
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background grid-bg">
      <AppHeader
        onMenuToggle={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenChangelog={() => setChangelogForceOpen(true)}
        />
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <ChangelogModal
        forceOpen={changelogForceOpen}
        onClose={() => setChangelogForceOpen(false)}
      />
    </div>
  );
}
