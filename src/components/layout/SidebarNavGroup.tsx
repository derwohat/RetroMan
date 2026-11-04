"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * An expandable group of entries in the app sidebar.
 *
 * Codebook docs/product-standards.md, "Untermenüs in der Seitenleiste"
 * (reference ImmoMan AppShell.vue, TicketMan sidebar-nav-group.tsx):
 *  - Every row of every level is a full row with the same edge, so the active
 *    marking sits on the same edge on both levels. RetroMan keeps its own edge
 *    (right, 2 px — a recorded deviation), but keeps it on both levels.
 *  - Level 2 is indented through the link's own padding, never a wrapper
 *    margin and never a connecting line. The line this group used to draw made
 *    the children look like a column of their own.
 *  - The remembered state alone decides whether a group is open, also for the
 *    group holding the open page. While such a group is shut, its header
 *    carries the one marking instead, as aria-current="location", because
 *    the page itself is the hidden child ("Immer genau eine Markierung").
 *  - A collapsed sidebar (48 px) has no room to expand anything, so the header
 *    becomes a plain link to the group's first entry.
 */

export type NavGroupItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Shown with a shield, because only an administrator sees it. */
  adminOnly?: boolean;
};

/** Level-2 row, shared with the collections list in AppSidebar. */
export const SUB_ROW = "flex min-h-9 w-full items-center gap-2.5 py-2 pl-9 pr-5 text-left transition-colors";

const ROW = "flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors";
const ROW_IDLE = "text-muted-foreground hover:bg-muted hover:text-foreground";
const ROW_ACTIVE = "bg-primary/10 text-primary border-r-2 border-primary";

// ── Remembered folding ───────────────────────────────────────────────────────
// Folded groups are stored, not open ones, so a group added later starts open
// instead of appearing folded just because it is missing from the saved list.
// The raw string is the store snapshot: useSyncExternalStore compares
// snapshots by identity, and a freshly parsed array would never compare equal.
// The server snapshot is "" (everything open), so the server HTML and the
// first client render agree and hydration does not complain.
const STORAGE_KEY = "retroman.nav.collapsed";
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    // Private window or blocked site data: every group simply stays open.
    return "";
  }
}

function parseFolded(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    // A value written by hand or by an older version: treat it as "nothing
    // folded" rather than breaking the sidebar.
    return [];
  }
}

function toggleFolded(id: string): void {
  const current = parseFolded(readRaw());
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Not being able to persist is no reason to refuse folding. Without
    // storage the click has no effect, so say why in the console.
    console.warn("[nav] Klappzustand konnte nicht gespeichert werden (localStorage gesperrt).");
  }
  for (const listener of listeners) listener();
}

function IconChevron() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-aria-expanded:rotate-90"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function IconShield({ title }: { title: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-3 w-3 shrink-0 opacity-60"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5.5c0 4-3 7.3-7 8.5-4-1.2-7-4.5-7-8.5V6l7-3z" />
    </svg>
  );
}

export function SidebarNavGroup({
  id,
  label,
  icon,
  items,
  collapsed,
  adminOnlyLabel,
}: {
  /** Stable key under which this group's folded state is remembered. */
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavGroupItem[];
  /** The whole sidebar is the 48 px rail. */
  collapsed: boolean;
  /** Tooltip on the shield, e.g. "Nur für Administratoren". */
  adminOnlyLabel: string;
}) {
  const pathname = usePathname();
  const folded = parseFolded(useSyncExternalStore(subscribe, readRaw, () => ""));
  const open = !folded.includes(id);

  const activeItem = items.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  if (items.length === 0) return null;

  if (collapsed) {
    // No room for children at 48 px: the header stands in for the group and
    // leads to its first entry. It carries the marking because the child that
    // would carry it is not rendered.
    const first = items[0];
    return (
      <Link
        href={first.href}
        title={label}
        aria-current={activeItem ? "location" : undefined}
        className={`min-h-11 ${ROW} ${activeItem ? ROW_ACTIVE : ROW_IDLE}`}
      >
        <span className="shrink-0">{icon}</span>
      </Link>
    );
  }

  const headerMarked = Boolean(activeItem) && !open;

  return (
    <div>
      <button
        type="button"
        onClick={() => toggleFolded(id)}
        aria-expanded={open}
        aria-current={headerMarked ? "location" : undefined}
        className={`group min-h-11 ${ROW} ${headerMarked ? ROW_ACTIVE : ROW_IDLE}`}
      >
        <span className="shrink-0">{icon}</span>
        <span className="flex-1 truncate text-sm">{label}</span>
        <IconChevron />
      </button>

      {open &&
        items.map((item) => {
          const isActive = item === activeItem;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`${SUB_ROW} ${isActive ? ROW_ACTIVE : ROW_IDLE}`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 truncate text-[13px]">{item.label}</span>
              {item.adminOnly && <IconShield title={adminOnlyLabel} />}
            </Link>
          );
        })}
    </div>
  );
}
