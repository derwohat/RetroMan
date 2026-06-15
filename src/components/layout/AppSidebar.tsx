"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useTranslations } from "@/components/LanguageProvider";

// ── SVG icons ─────────────────────────────────────────────────────────────────
function IconWishlist() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}
function IconFavorites() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}
function IconStats() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

type Collection = { id: string; name: string; category: { icon: string | null }; _count: { items: number } };

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [counts, setCounts] = useState({ favorites: 0, wishlist: 0 });
  const pathname = usePathname();
  const { t } = useTranslations();

  useEffect(() => {
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : []))
      .then((cols: Collection[]) => setCollections(cols))
      .catch(() => {});
    fetch("/api/counts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setCounts(d); })
      .catch(() => {});
  }, []);

  const totalItems = collections.reduce((s, c) => s + c._count.items, 0);

  function navLink(href: string, icon: React.ReactNode, label: string, exact = false) {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
          isActive
            ? "bg-primary/10 text-primary border-r-2 border-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <span className="shrink-0">{icon}</span>
        {!collapsed && <span className="flex-1 truncate text-xs">{label}</span>}
      </Link>
    );
  }

  return (
    <aside className={`flex flex-col border-r border-border bg-sidebar transition-all duration-200 ${collapsed ? "w-12" : "w-52"} shrink-0`}>
      {/* Collapse toggle */}
      <div className="flex h-10 items-center justify-end px-2 border-b border-border shrink-0">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-primary transition"
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {/* Sammlungen header */}
        {!collapsed && (
          <div className="px-3 pt-1 pb-1">
            <Link
              href="/dashboard"
              className={`text-[9px] uppercase tracking-widest font-medium transition-colors ${
                pathname === "/dashboard" ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              {t.nav.collections}
            </Link>
          </div>
        )}
        {collapsed && navLink("/dashboard", (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h4v10H3zM10 4h4v13h-4zM17 7h4v10h-4z" />
          </svg>
        ), t.nav.collections, true)}

        {/* Individual collections */}
        {collections.map((col) => {
          const href = `/collection/${col.id}`;
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={col.id}
              href={href}
              title={collapsed ? col.name : undefined}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="shrink-0">
                <CategoryIcon icon={col.category.icon} className="h-4 w-4" />
              </span>
              {!collapsed && (
                <span className="flex-1 truncate text-xs">{col.name}</span>
              )}
              {!collapsed && col._count.items > 0 && (
                <span className="text-[9px] text-muted-foreground tabular-nums">{col._count.items}</span>
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-2 mx-3 border-t border-border/50" />

        {/* Other pages */}
        {/* Wishlist with count */}
        {(() => {
          const href = "/wishlist";
          const isActive = pathname.startsWith(href);
          return (
            <Link href={href} className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${isActive ? "bg-primary/10 text-primary border-r-2 border-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <span className="shrink-0"><IconWishlist /></span>
              {!collapsed && <span className="flex-1 truncate text-xs">{t.nav.wishlist}</span>}
              {!collapsed && counts.wishlist > 0 && <span className="text-[9px] text-muted-foreground tabular-nums">{counts.wishlist}</span>}
            </Link>
          );
        })()}

        {/* Favorites with count */}
        {(() => {
          const href = "/favorites";
          const isActive = pathname.startsWith(href);
          return (
            <Link href={href} className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${isActive ? "bg-primary/10 text-primary border-r-2 border-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <span className="shrink-0"><IconFavorites /></span>
              {!collapsed && <span className="flex-1 truncate text-xs">{t.nav.favorites}</span>}
              {!collapsed && counts.favorites > 0 && <span className="text-[9px] text-muted-foreground tabular-nums">{counts.favorites}</span>}
            </Link>
          );
        })()}

        {navLink("/stats",     <IconStats />,     t.nav.stats)}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-border p-3 shrink-0">
          <p className="text-[9px] text-muted-foreground">
            {totalItems} {totalItems === 1 ? t.nav.item : t.nav.items} gesamt
          </p>
        </div>
      )}
    </aside>
  );
}
