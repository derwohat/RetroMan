"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CONDITION_COLORS, CONDITION_LABELS, type ViewProps } from "./types";

function getImageUrl(item: ViewProps["items"][number]) {
  const primary = item.images.find((i) => i.isPrimary) ?? item.images[0];
  return primary?.url ?? primary?.filePath ?? null;
}

export function CdWallView({ items, categoryIcon, visibleTags, chipGroups: _chipGroups }: ViewProps) {
  const { categoryId } = useParams<{ categoryId: string }>();

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
      {items.map((item) => {
        const imageUrl = getImageUrl(item);
        const chips = visibleTags
          .map((key) => item.customFields.find((f) => f.field.fieldKey === key)?.value)
          .filter(Boolean) as string[];

        return (
          <div key={item.id} className="media-card group relative flex flex-col rounded-md border border-border bg-card overflow-hidden">
            <Link href={`/collection/${categoryId}/${item.id}`} className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden block">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <CategoryIcon icon={categoryIcon} className="h-8 w-8 opacity-20" />
              )}

              {/* Condition — top LEFT */}
              {item.condition && (
                <span className={`absolute top-1 left-1 rounded-full border px-1 py-0.5 text-[9px] font-medium uppercase ${CONDITION_COLORS[item.condition] ?? "border-border text-muted-foreground"}`}>
                  {CONDITION_LABELS[item.condition]?.charAt(0)}
                </span>
              )}

            </Link>

            <div className="p-1.5 space-y-0.5">
              <Link href={`/collection/${categoryId}/${item.id}`} className="text-[11px] font-medium text-foreground line-clamp-2 leading-tight hover:text-primary transition-colors">{item.title}</Link>
              {chips.length > 0 ? (
                <p className="text-[10px] text-muted-foreground truncate">{chips.join(" · ")}</p>
              ) : item.year ? (
                <p className="text-[10px] text-muted-foreground">{item.year}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
