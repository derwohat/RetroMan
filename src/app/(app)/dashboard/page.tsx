"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useTranslations } from "@/components/LanguageProvider";

type Collection = {
  id: string;
  name: string;
  icon: string | null;
  _count: { items: number };
};

// Card size, five steps like the slider in a collection. Step 3 is the size
// the overview always had, so nobody's view changes until they move it.
const SIZE_MIN = 1;
const SIZE_MAX = 5;
const SIZE_DEFAULT = 3;
const SIZE_STORAGE_KEY = "view_size_dashboard";
// Minimum card width per step; the grid fills the row with as many as fit.
const MIN_WIDTHS = [120, 155, 200, 260, 340];
// Per step, the share of the viewport a card may demand at most — keeps two
// columns on a phone instead of one huge card per row.
const MAX_SHARE_VW = [28, 36, 42, 60, 92];
// Full class names, not built strings: Tailwind only ships classes it can
// find written out in the source.
const ICON_CLASSES = ["h-8 w-8", "h-12 w-12", "h-16 w-16", "h-20 w-20", "h-24 w-24"];
const CARD_PADDING = ["p-3 gap-2", "p-5 gap-3", "p-8 gap-4", "p-10 gap-4", "p-12 gap-5"];

function readStoredSize(): number {
  try {
    const stored = Number(localStorage.getItem(SIZE_STORAGE_KEY));
    return Number.isInteger(stored) && stored >= SIZE_MIN && stored <= SIZE_MAX ? stored : SIZE_DEFAULT;
  } catch {
    // Private window or blocked site data: the default size it is.
    return SIZE_DEFAULT;
  }
}

export default function DashboardPage() {
  const { t } = useTranslations();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sizeLevel, setSizeLevel] = useState(SIZE_DEFAULT);

  useEffect(() => {
    setSizeLevel(readStoredSize());
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : []))
      .then((cols: Collection[]) => { setCollections(cols); setLoading(false); })
      .catch((error: unknown) => {
        console.error("[dashboard] Sammlungen nicht geladen:", error);
        setLoading(false);
      });
  }, []);

  function handleSizeChange(value: number) {
    const next = Math.min(SIZE_MAX, Math.max(SIZE_MIN, value));
    setSizeLevel(next);
    try {
      localStorage.setItem(SIZE_STORAGE_KEY, String(next));
    } catch {
      // Not remembered across visits, but the size still applies now.
      console.warn("[dashboard] Kartengröße konnte nicht gespeichert werden.");
    }
  }

  const totalItems = collections.reduce((sum, c) => sum + c._count.items, 0);
  const step = sizeLevel - 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">
            {t.dashboard.title}
          </h2>
          {!loading && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t.dashboard.summary
                .replace("{items}", String(totalItems))
                .replace("{itemWord}", totalItems === 1 ? t.dashboard.entry : t.dashboard.entries)
                .replace("{count}", String(collections.length))
                .replace("{colWord}", collections.length === 1 ? t.dashboard.collection : t.dashboard.collections)}
            </p>
          )}
        </div>

        {/* Same control as the size slider in a collection. */}
        {!loading && collections.length > 0 && (
          <div className="flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-muted px-2">
            <button
              onClick={() => handleSizeChange(sizeLevel - 1)}
              className="grid h-9 w-9 shrink-0 place-items-center text-muted-foreground hover:text-foreground transition"
              title={t.common.smaller}
              aria-label={t.common.smaller}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
            <input
              type="range"
              min={SIZE_MIN}
              max={SIZE_MAX}
              step={1}
              value={sizeLevel}
              onChange={(e) => handleSizeChange(Number(e.target.value))}
              aria-label={t.common.cardSize}
              className="w-16 h-1 accent-primary cursor-pointer"
            />
            <button
              onClick={() => handleSizeChange(sizeLevel + 1)}
              className="grid h-9 w-9 shrink-0 place-items-center text-muted-foreground hover:text-foreground transition"
              title={t.common.larger}
              aria-label={t.common.larger}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <rect x="2" y="2" width="9" height="9" rx="1"/><rect x="13" y="2" width="9" height="9" rx="1"/><rect x="2" y="13" width="9" height="9" rx="1"/><rect x="13" y="13" width="9" height="9" rx="1"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {!loading && (
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${MIN_WIDTHS[step]}px, ${MAX_SHARE_VW[step]}vw), 1fr))` }}
        >
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/collection/${col.id}`}
              className={`media-card group flex flex-col items-center justify-center rounded-xl border border-border bg-card transition hover:border-primary hover:bg-primary/5 ${CARD_PADDING[step]}`}
            >
              <CategoryIcon icon={col.icon} className={ICON_CLASSES[step]} />
              <div className="min-w-0 max-w-full text-center">
                <p className="break-words text-sm font-medium text-foreground group-hover:text-primary transition">{col.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {col._count.items} {col._count.items === 1 ? t.dashboard.entry : t.dashboard.entries}
                </p>
              </div>
            </Link>
          ))}

          {collections.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <CategoryIcon icon={null} className="h-16 w-16 opacity-20 mb-4" />
              <p className="text-sm text-muted-foreground">{t.dashboard.emptyTitle}</p>
              <Link href="/settings/collections" className="mt-3 text-xs text-primary hover:underline">
                {t.dashboard.emptyLink}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
