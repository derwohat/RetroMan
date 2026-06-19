"use client";

import Link from "next/link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CONDITION_COLORS, CONDITION_LABELS, type ViewProps } from "./types";

function getImageUrl(item: ViewProps["items"][number]) {
  const primary = item.images.find((i) => i.isPrimary) ?? item.images[0];
  return primary?.url ?? primary?.filePath ?? null;
}

export function CdWallView({ items, categoryIcon, visibleTags, chipGroups }: ViewProps) {

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
      {items.map((item) => {
        const imageUrl = getImageUrl(item);
        const fieldChips = visibleTags
          .map((key) => item.customFields.find((f) => f.field.fieldKey === key)?.value)
          .filter(Boolean) as string[];
        const tagChips = chipGroups.flatMap(({ groupId, color, linkedField }) => {
          if (linkedField) {
            const val = item[linkedField as keyof typeof item] as string | null | undefined;
            return val ? [{ value: val, color }] : [];
          }
          return item.tags.filter((t) => t.groupId === groupId).map((t) => ({ value: t.tagValue.value, color }));
        });

        return (
          <div key={item.id} className="media-card group relative flex flex-col rounded-md border border-border bg-card overflow-hidden">
            <Link href={`/collection/${item.collectionId}/${item.id}`} className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden block">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <CategoryIcon icon={categoryIcon} className="h-8 w-8 opacity-20" />
              )}
            </Link>

            <div className="p-1.5 space-y-0.5">
              <Link href={`/collection/${item.collectionId}/${item.id}`} className="text-[11px] font-medium text-foreground line-clamp-2 leading-tight hover:text-primary transition-colors">{item.title}</Link>
              {fieldChips.length > 0 ? (
                <p className="text-[10px] text-muted-foreground truncate">{fieldChips.join(" · ")}</p>
              ) : item.year ? (
                <p className="text-[10px] text-muted-foreground">{item.year}</p>
              ) : null}
              {item.condition && (
                <span className={`rounded-full border px-1 py-0.5 text-[9px] font-medium uppercase ${CONDITION_COLORS[item.condition] ?? "border-border text-muted-foreground"}`}>
                  {CONDITION_LABELS[item.condition]?.charAt(0)}
                </span>
              )}
              {tagChips.length > 0 && (
                <div className="flex flex-wrap gap-0.5 pt-0.5">
                  {tagChips.map((chip, i) => (
                    <span key={i} className="rounded-full border px-1 py-0.5 text-[8px] font-medium" style={{ borderColor: `${chip.color}50`, backgroundColor: `${chip.color}18`, color: chip.color }}>{chip.value}</span>
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
