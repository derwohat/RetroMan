"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useTranslations } from "@/components/LanguageProvider";
import { SearchBox } from "./SearchBox";
import { SidebarNavGroup, SUB_ROW, type NavGroupItem } from "./SidebarNavGroup";
import { ThemeToggle } from "./ThemeToggle";
import { VersionBanner } from "./VersionBanner";

type Profile = { name: string; email: string; role: string };

// ── SVG icons ─────────────────────────────────────────────────────────────────
function IconLogout() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18.75 15l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

/** Group header for "Einstellungen". */
function IconCog() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ── Icons for the entries inside the "Einstellungen" group ───────────────────
// They came from the admin sidebar, which this group replaces.
function IconUsers() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconStack() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}
function IconTag() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}
function IconServer() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path strokeLinecap="round" d="M7 7.5h.01M7 16.5h.01" />
    </svg>
  );
}
function IconPencilSmall() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
/** "Sammlungen" — the same shelf the 48 px rail has always shown. */
function IconCollections() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h4v10H3zM10 4h4v13h-4zM17 7h4v10h-4z" />
    </svg>
  );
}
function IconFavorites() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}
function IconStats() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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

type Collection = { id: string; name: string; icon: string | null; _count: { items: number } };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function AppSidebar({
  role,
  isOpen,
  onClose,
  onOpenChangelog,
}: {
  /** From the server, so the group is complete before /api/me answers. */
  role: "USER" | "ADMIN" | null;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenChangelog?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  // The marking check below must not count before the list is there: on a
  // collection page the marked entry is one of these links.
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [counts, setCounts] = useState({ favorites: 0 });
  const [profile, setProfile] = useState<Profile | null>(null);
  const pathname = usePathname();
  const { t } = useTranslations();

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setProfile(d))
      .catch(() => {});
  }, []);

  function refreshCollections() {
    fetch("/api/collections")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((cols: Collection[]) => setCollections(cols))
      .catch((error: unknown) => {
        // The sidebar keeps the list it has; say why it did not refresh.
        console.warn("[nav] Sammlungen konnten nicht geladen werden:", error);
      })
      .finally(() => setCollectionsLoaded(true));
  }

  useEffect(() => {
    refreshCollections();
    fetch("/api/counts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setCounts(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    window.addEventListener("collections-updated", refreshCollections);
    return () => window.removeEventListener("collections-updated", refreshCollections);
  }, []);

  // Codebook: exactly one entry may be marked. Two glowing levels leave open
  // where you are, none leaves it open too. Counting by hand per entry is
  // what let the same bug recur elsewhere, so this counts after every route
  // change and complains. Development only — stripped from the build.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    // Counting before the list has arrived reported zero markings on every
    // collection page whose request took longer than the 150 ms below.
    if (!collectionsLoaded) return;
    const timer = setTimeout(() => {
      const aside = document.querySelector("aside");
      if (!aside) return;
      // Buttons too, not only links: the "Einstellungen" group header is a
      // button, and when it is folded on one of its own routes it is the
      // element carrying the marking (as aria-current="location"). Querying
      // links alone reported zero markings for a sidebar that showed one.
      const marked = Array.from(aside.querySelectorAll("a, button")).filter(
        (el) => el.hasAttribute("aria-current") || el.className.includes("border-primary"),
      );
      if (marked.length !== 1) {
        console.warn(
          `[nav] ${marked.length} markierte Einträge auf ${pathname} (erwartet: genau 1):`,
          marked.map((a) => a.getAttribute("href")),
        );
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [pathname, collections, collectionsLoaded]);

  // Everything that is set rather than browsed. The four administration
  // entries are only built for an administrator, so a normal user's sidebar
  // holds no shields at all and the group is just their profile.
  const settingsItems: NavGroupItem[] = [
    { href: "/profile", label: t.header.profile, icon: <IconPencilSmall /> },
    // One's own collections, for everyone: they belong to the person, not
    // to the administration.
    { href: "/settings/collections", label: t.admin.collections, icon: <IconStack /> },
    ...(role === "ADMIN"
      ? ([
          { href: "/admin/users", label: t.admin.users, icon: <IconUsers />, adminOnly: true },
          { href: "/admin/tags", label: t.admin.tags, icon: <IconTag />, adminOnly: true },
          { href: "/admin/settings", label: t.admin.system, icon: <IconServer />, adminOnly: true },
        ] satisfies NavGroupItem[])
      : []),
  ];

  function navLink(href: string, icon: React.ReactNode, label: string, exact = false) {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={`flex min-h-11 w-full items-center gap-3 px-5 py-2.5 text-left transition-colors ${
          isActive
            ? "bg-primary/10 text-primary border-r-2 border-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <span className="shrink-0">{icon}</span>
        {!collapsed && <span className="flex-1 truncate text-sm">{label}</span>}
      </Link>
    );
  }

  return (
    <aside id="app-sidebar" className={`
      flex flex-col border-r border-border bg-sidebar transition-all duration-200 shrink-0
      fixed inset-y-0 left-0 z-50 ${isOpen ? "translate-x-0" : "-translate-x-full"}
      md:relative md:translate-x-0 md:z-auto
      ${collapsed ? "w-12" : "w-[248px]"}
    `}>
      {/* Collapse toggle — desktop only */}
      <div className="hidden md:flex h-10 items-center justify-end px-2 border-b border-border shrink-0">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-primary transition"
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </div>
      {/* Close button — mobile only */}
      <div className="md:hidden flex h-14 items-center justify-between px-3 border-b border-border shrink-0">
        <span className="font-heading text-[10px] text-primary neon-glow uppercase tracking-widest">{t.nav.collections}</span>
        <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-primary transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* The search used to be in the header. The header is the brand band
          now and has no room for a field — and the sidebar is where you
          already are when you go looking for something. */}
      {!collapsed && (
        <div className="px-5 pt-3 pb-1 shrink-0">
          <SearchBox />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {/* "Sammlungen" is an entry like any other: it leads to the overview
            of all collections and carries the marking there. The collections
            are its level-2 rows (Codebook "Untermenüs in der Seitenleiste").
            The group is deliberately not foldable — decided 04.11.2026. */}
        {navLink("/dashboard", <IconCollections />, t.nav.collections, true)}

        {/* Individual collections. The 48 px rail has no room for an
            indent, so there they keep the level-1 row. */}
        {collections.map((col) => {
          const href = `/collection/${col.id}`;
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={col.id}
              href={href}
              title={collapsed ? col.name : undefined}
              aria-current={isActive ? "page" : undefined}
              className={`${
                collapsed ? "flex min-h-11 w-full items-center gap-3 px-5 py-2.5 text-left transition-colors" : SUB_ROW
              } ${
                isActive
                  ? "bg-primary/10 text-primary border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="shrink-0">
                <CategoryIcon icon={col.icon} className={collapsed ? "h-5 w-5" : "h-4 w-4"} />
              </span>
              {!collapsed && (
                <span className="flex-1 truncate text-[13px]">{col.name}</span>
              )}
              {!collapsed && col._count.items > 0 && (
                <span className="shrink-0 rounded-full bg-muted border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums leading-none">{col._count.items}</span>
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-2 mx-3 border-t border-border/50" />

        {/* Other pages */}
        {/* Favorites with count */}
        {(() => {
          const href = "/favorites";
          const isActive = pathname.startsWith(href);
          return (
            <Link href={href} aria-current={isActive ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 px-5 py-2.5 text-left transition-colors ${isActive ? "bg-primary/10 text-primary border-r-2 border-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <span className="shrink-0"><IconFavorites /></span>
              {!collapsed && <span className="flex-1 truncate text-sm">{t.nav.favorites}</span>}
              {!collapsed && counts.favorites > 0 && <span className="shrink-0 rounded-full bg-muted border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums leading-none">{counts.favorites}</span>}
            </Link>
          );
        })()}

        {navLink("/stats",     <IconStats />,     t.nav.stats)}

        {/* Codebook docs/product-standards.md, "Benutzerverwaltung unter
            Einstellungen": no top-level entry of its own, and no separate
            admin area either — one expandable group holds everything that is
            set rather than browsed. The four entries with a shield are the
            former admin area; a normal user only sees their profile. */}
        <SidebarNavGroup
          id="settings"
          label={t.nav.settings}
          icon={<IconCog />}
          collapsed={collapsed}
          adminOnlyLabel={t.admin.adminOnly}
          items={settingsItems}
        />
      </nav>

      {/* Footer — Codebook docs/product-standards.md, Sidebar-Profil:
          row 1 the person, row 2 the view. Signing out sits beside the name,
          where what it acts on is. */}
      {!collapsed && (
        <div className="border-t border-border p-3 shrink-0">
          <VersionBanner />

          {profile && (
            <div className="overflow-hidden rounded-md bg-muted">
              <div className="flex items-center gap-1 p-2.5">
                <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md hover:opacity-80 transition-opacity">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-heading text-xs font-bold text-primary-foreground">
                    {initials(profile.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{profile.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {profile.role === "ADMIN" ? t.adminUsers.roleAdmin : t.adminUsers.roleUser}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title={t.header.logout}
                  aria-label={t.header.logout}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-border/50 hover:text-destructive transition-colors"
                >
                  <IconLogout />
                </button>
              </div>

              {/* Row 2, set off by a line: both are settings of the view,
                  not of the person. The toggle keeps the avatar's edge. */}
              <div className="flex items-center gap-1.5 border-t border-border px-2.5 py-2">
                <ThemeToggle compact />
                <button
                  onClick={onOpenChangelog}
                  title={t.header.changelog}
                  className="flex h-7 flex-1 items-center justify-end rounded-md px-2.5 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground hover:text-primary transition-colors"
                >
                  RetroMan v{process.env.NEXT_PUBLIC_APP_VERSION}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
