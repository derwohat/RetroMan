"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CONDITION_COLORS } from "@/components/views/types";
import { formatPrice } from "@/lib/format";
import { useTranslations } from "@/components/LanguageProvider";

type ItemWithCollection = {
  id: string;
  collectionId: string;
  title: string;
  year: number | null;
  condition: string | null;
  purchasePrice: number | null;
  isFavorite: boolean;
  images: Array<{ url: string | null; filePath: string | null; isPrimary: boolean }>;
  collection: { id: string; name: string; icon: string | null };
};

function getImageUrl(item: ItemWithCollection) {
  const p = item.images.find((i) => i.isPrimary) ?? item.images[0];
  return p?.url ?? p?.filePath ?? null;
}

export default function WishlistPage() {
  const { t } = useTranslations();
  const [items, setItems] = useState<ItemWithCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/items?collectionStatus=WISHLIST")
      .then((r) => r.ok ? r.json() : [])
      .then((data: ItemWithCollection[]) => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">
          {t.wishlist.title}
        </h2>
        {!loading && (
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? t.dashboard.entry : t.dashboard.entries}
          </p>
        )}
      </div>

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-muted-foreground/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-sm text-muted-foreground">{t.wishlist.emptyTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.wishlist.emptyHint}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            const imageUrl = getImageUrl(item);
            return (
              <Link
                key={item.id}
                href={`/collection/${item.collectionId}/${item.id}`}
                className="media-card group relative flex gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary transition"
              >
                <div className="relative w-16 h-20 shrink-0 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <CategoryIcon icon={item.collection.icon} className="h-8 w-8 opacity-20" />
                  )}
                  {item.condition && (
                    <span className={`absolute top-0.5 left-0.5 rounded-full border px-1 py-0.5 text-[8px] font-medium uppercase ${CONDITION_COLORS[item.condition] ?? ""}`}>
                      {t.conditions[item.condition as keyof typeof t.conditions]?.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight group-hover:text-primary transition">{item.title}</p>
                    <div className="flex items-center gap-1.5">
                      {item.year && <span className="text-[10px] text-muted-foreground">{item.year}</span>}
                      {item.isFavorite && <span className="text-xs">❤️</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      <CategoryIcon icon={item.collection.icon} className="h-2.5 w-2.5" />
                      {item.collection.name}
                    </span>
                    {item.purchasePrice && (
                      <span className="text-[10px] text-muted-foreground">{formatPrice(item.purchasePrice)}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
