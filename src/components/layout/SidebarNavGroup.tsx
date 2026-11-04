"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * An expandable group of entries in the app sidebar.
 *
 * Codebook docs/product-standards.md, "Benutzerverwaltung unter Einstellungen":
 * user management is not a top-level sidebar entry but a child of
 * "Einstellungen", which becomes an expandable group. TicketMan's
 * `sidebar-nav-group.tsx` is the reference; this is the same idea in
 * RetroMan's own markup.
 *
 * Two rules from the same document shape the details:
 *  - "Immer genau eine Markierung": the group header never carries the marking
 *    while one of its children is visible and marked. Collapsed, the header
 *    takes the marking instead, because the marked child is not on screen.
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

const ROW = "flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors";
const ROW_IDLE = "text-muted-foreground hover:bg-muted hover:text-foreground";
const ROW_ACTIVE = "bg-primary/10 text-primary border-r-2 border-primary";

export function SidebarNavGroup({
  label,
  icon,
  items,
  collapsed,
  adminOnlyLabel,
}: {
  label: string;
  icon: React.ReactNode;
  items: NavGroupItem[];
  collapsed: boolean;
  /** Tooltip on the shield, e.g. "Nur für Administratoren". */
  adminOnlyLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  const activeItem = items.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  // Arriving at a child from somewhere else — a link, a search result, a
  // bookmark — must not leave the marking hidden inside a collapsed group.
  // Without this the sidebar would show no marking at all on that route.
  useEffect(() => {
    if (activeItem) setOpen(true);
  }, [activeItem]);

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
        aria-current={activeItem ? "page" : undefined}
        className={`min-h-11 ${ROW} ${activeItem ? ROW_ACTIVE : ROW_IDLE}`}
      >
        <span className="shrink-0">{icon}</span>
      </Link>
    );
  }

  // Collapsed by hand while standing on one of its entries, the header takes
  // the marking over — for the same reason as the 48px rail above. Without
  // this the sidebar shows no marking at all on that route, which breaks
  // "Immer genau eine Markierung" just as two markings would. Forcing the
  // group open instead would fight the click that just closed it.
  const headerMarked = Boolean(activeItem) && !open;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-current={headerMarked ? "page" : undefined}
        className={`group min-h-11 ${ROW} ${headerMarked ? ROW_ACTIVE : ROW_IDLE}`}
      >
        <span className="shrink-0">{icon}</span>
        <span className="flex-1 truncate text-sm">{label}</span>
        <IconChevron />
      </button>

      {open && (
        // The vertical line shows what the indented entries belong to.
        <div className="relative before:absolute before:left-[26px] before:top-0.5 before:bottom-0.5 before:w-px before:bg-border/60 before:content-['']">
          {items.map((item) => {
            const isActive = item === activeItem;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-9 w-full items-center gap-2.5 py-2 pl-[42px] pr-5 text-left transition-colors ${
                  isActive ? ROW_ACTIVE : ROW_IDLE
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1 truncate text-[13px]">{item.label}</span>
                {item.adminOnly && <IconShield title={adminOnlyLabel} />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
