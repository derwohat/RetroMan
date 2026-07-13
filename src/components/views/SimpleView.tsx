"use client";

import Link from "next/link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { formatPrice } from "@/lib/format";
import { CONDITION_COLORS, CONDITION_LABELS, type ViewProps } from "./types";

function getImageUrl(item: ViewProps["items"][number]) {
  const primary = item.images.find((i) => i.isPrimary) ?? item.images[0];
  return primary?.url ?? primary?.filePath ?? null;
}

// 3,2,2,1,1 cols at 1100px; thumbnail grows to differentiate same-col steps
const MIN_WIDTHS = [350, 415, 490, 565, 640];
const THUMB_SIZES: Array<[number, number]> = [[56,72],[72,92],[88,112],[108,136],[132,168]]; // [w, h] px

export function SimpleView({ items, categoryIcon, chipGroups, size = 3 }: ViewProps) {
  const minW = MIN_WIDTHS[(size - 1) % 5];
  const [thumbW, thumbH] = THUMB_SIZES[(size - 1) % 5];
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
          <div key={item.id} className="media-card group relative flex gap-3 rounded-lg border border-border bg-card p-3 overflow-hidden">
            {/* Thumbnail */}
            <Link href={`/collection/${item.collectionId}/${item.id}`} className="relative shrink-0 rounded-md bg-muted overflow-hidden flex items-center justify-center" style={{ width: thumbW, height: thumbH }}>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <CategoryIcon icon={categoryIcon} className="h-8 w-8 opacity-20" />
              )}
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div className="space-y-1">
                <Link href={`/collection/${item.collectionId}/${item.id}`} className="text-sm font-medium text-foreground line-clamp-2 leading-tight pr-14 hover:text-primary transition-colors">{item.title}</Link>
                <div className="flex items-center gap-1.5">
                  {item.year && <span className="text-[10px] text-muted-foreground">{item.year}</span>}
                  {item.isFavorite && <span className="text-xs">❤️</span>}
                </div>
                {item.condition && (
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase ${CONDITION_COLORS[item.condition] ?? "border-border text-muted-foreground"}`}>
                    {CONDITION_LABELS[item.condition] ?? item.condition}
                  </span>
                )}
                {chips.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {chips.map((chip, i) => (
                      <span key={i} className="rounded-full border px-1.5 py-0.5 text-[9px] font-medium" style={{ borderColor: `${chip.color}50`, backgroundColor: `${chip.color}18`, color: chip.color }}>{chip.value}</span>
                    ))}
                  </div>
                )}
              </div>
              {item.purchasePrice != null && (
                <div className="mt-2">
                  <span className="text-[10px] text-muted-foreground">{formatPrice(item.purchasePrice)}</span>
                </div>
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
}
