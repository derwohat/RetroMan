"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { ChangelogModal } from "./ChangelogModal";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [changelogForceOpen, setChangelogForceOpen] = useState(false);

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
      <AppHeader onMenuToggle={() => setSidebarOpen((v) => !v)} />
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
