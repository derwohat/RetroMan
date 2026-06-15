"use client";

import Link from "next/link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CONDITION_COLORS, CONDITION_LABELS, type ViewProps } from "./types";

function getImageUrl(item: ViewProps["items"][number]) {
  const primary = item.images.find((i) => i.isPrimary) ?? item.images[0];
  return primary?.url ?? primary?.filePath ?? null;
}

export function ShelfView({ items, categoryIcon, chipGroups }: ViewProps) {

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((item) => {
        const imageUrl = getImageUrl(item);
        const chips = chipGroups.flatMap(({ groupId }) =>
          item.tags.filter((t) => t.groupId === groupId).map((t) => t.tagValue.value)
        );

        return (
          <div key={item.id} className="media-card group relative flex flex-col rounded-lg border border-border bg-card overflow-hidden">
            {/* Cover — clickable to detail */}
            <Link href={`/collection/${item.collectionId}/${item.id}`} className="scanlines relative aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden block">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <CategoryIcon icon={categoryIcon} className="h-10 w-10 opacity-20" />
              )}

              {/* Condition — top LEFT */}
              {item.condition && (
                <span className={`absolute top-1.5 left-1.5 rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase ${CONDITION_COLORS[item.condition] ?? "border-border text-muted-foreground"}`}>
                  {CONDITION_LABELS[item.condition] ?? item.condition}
                </span>
              )}
              {item.isFavorite && (
                <span className="absolute bottom-1.5 left-1.5 text-sm leading-none">❤️</span>
              )}

            </Link>

            {/* Info */}
            <div className="p-2 flex flex-col flex-1">
              <div className="space-y-1">
                <Link href={`/collection/${item.collectionId}/${item.id}`} className="text-sm font-medium text-foreground line-clamp-2 leading-tight hover:text-primary transition-colors">{item.title}</Link>
                {item.year && <p className="text-xs text-muted-foreground">{item.year}</p>}
              </div>
              {chips.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-auto pt-1.5">
                  {chips.map((chip, i) => (
                    <span key={i} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{chip}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
