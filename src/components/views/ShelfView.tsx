"use client";

import Link from "next/link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CONDITION_COLORS, CONDITION_LABELS, type ViewProps } from "./types";

function getImageUrl(item: ViewProps["items"][number]) {
  const primary = item.images.find((i) => i.isPrimary) ?? item.images[0];
  return primary?.url ?? primary?.filePath ?? null;
}

// step 1→9 cols, 2→7 cols, 3→5 cols, 4→4 cols, 5→3 cols at ~900px
const MIN_WIDTHS = [90, 120, 155, 200, 260];

export function ShelfView({ items, categoryIcon, chipGroups, size = 3 }: ViewProps) {
  const minW = MIN_WIDTHS[(size - 1) % 5];
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minW}px, 1fr))` }}>
      {items.map((item) => {
        const imageUrl = getImageUrl(item);
        const chips = chipGroups.flatMap(({ groupId, color, linkedField }) => {
          if (linkedField) {
            const val = item[linkedField as keyof typeof item] as string | null | undefined;
            return val ? [{ value: val, color }] : [];
          }
          return item.tags.filter((t) => t.groupId === groupId).map((t) => ({ value: t.tagValue.value, color }));
        });

        return (
          <div key={item.id} className="media-card group relative flex flex-col rounded-lg border border-border bg-card overflow-hidden">
            {/* Cover — clickable to detail */}
            <Link href={`/collection/${item.collectionId}/${item.id}`} className="relative aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden block">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <CategoryIcon icon={categoryIcon} className="h-10 w-10 opacity-20" />
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
                {item.condition && (
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase ${CONDITION_COLORS[item.condition] ?? "border-border text-muted-foreground"}`}>
                    {CONDITION_LABELS[item.condition] ?? item.condition}
                  </span>
                )}
              </div>
              {chips.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-auto pt-1.5">
                  {chips.map((chip, i) => (
                    <span key={i} className="rounded-full border px-1.5 py-0.5 text-[9px] font-medium" style={{ borderColor: `${chip.color}50`, backgroundColor: `${chip.color}18`, color: chip.color }}>{chip.value}</span>
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
