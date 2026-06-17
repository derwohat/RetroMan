"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CONDITION_COLORS, CONDITION_LABELS } from "@/components/views/types";
import { formatPrice } from "@/lib/format";

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

export default function FavoritesPage() {
  const [items, setItems] = useState<ItemWithCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/items?isFavorite=true")
      .then((r) => r.ok ? r.json() : [])
      .then((data: ItemWithCollection[]) => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">
          Favoriten
        </h2>
        {!loading && (
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "Eintrag" : "Einträge"}
          </p>
        )}
      </div>

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4 opacity-20">❤️</span>
          <p className="text-sm text-muted-foreground">Noch keine Favoriten.</p>
          <p className="mt-1 text-xs text-muted-foreground">Einträge mit dem Herz-Symbol markieren.</p>
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
                      {CONDITION_LABELS[item.condition]?.charAt(0)}
                    </span>
                  )}
                  <span className="absolute bottom-0.5 right-0.5 text-xs">❤️</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight group-hover:text-primary transition">{item.title}</p>
                    <div className="flex items-center gap-1.5">
                      {item.year && <span className="text-[10px] text-muted-foreground">{item.year}</span>}
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
