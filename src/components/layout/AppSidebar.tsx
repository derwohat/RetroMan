"use client";

import { useState } from "react";

const COLLECTIONS = [
  { id: "games",   label: "Konsolenspiele", icon: "🎮", count: 0 },
  { id: "vinyl",   label: "Schallplatten",  icon: "💿", count: 0 },
  { id: "cd",      label: "CDs",            icon: "📀", count: 0 },
  { id: "mc",      label: "Kassetten",      icon: "📼", count: 0 },
  { id: "video",   label: "VHS/DVD/Bluray", icon: "🎬", count: 0 },
  { id: "books",   label: "Bücher/Comics",  icon: "📚", count: 0 },
  { id: "console", label: "Konsolen",       icon: "🕹️", count: 0 },
  { id: "pc",      label: "PC-Spiele",      icon: "🖥️", count: 0 },
];

export function AppSidebar() {
  const [active, setActive] = useState("games");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`flex flex-col border-r border-border bg-sidebar transition-all duration-200 ${collapsed ? "w-12" : "w-56"} shrink-0`}>
      {/* Collapse toggle */}
      <div className="flex h-10 items-center justify-end px-2 border-b border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-primary transition"
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {!collapsed && (
          <p className="px-3 pb-1 text-[9px] uppercase tracking-widest text-muted-foreground">
            Sammlungen
          </p>
        )}
        {COLLECTIONS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
              active === c.id
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span className="text-base shrink-0">{c.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-xs">{c.label}</span>
                <span className="text-[9px] text-muted-foreground">{c.count}</span>
              </>
            )}
          </button>
        ))}

        {/* Divider */}
        <div className="my-2 border-t border-border" />

        {/* Special collections */}
        {[
          { id: "wishlist",   label: "Wunschliste",  icon: "⭐" },
          { id: "favorites",  label: "Favoriten",    icon: "❤️" },
          { id: "stats",      label: "Statistiken",  icon: "📊" },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
              active === c.id
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <span className="text-base shrink-0">{c.icon}</span>
            {!collapsed && (
              <span className="flex-1 truncate text-xs">{c.label}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-border p-3">
          <p className="text-[9px] text-muted-foreground">0 Items gesamt</p>
        </div>
      )}
    </aside>
  );
}
