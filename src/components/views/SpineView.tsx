"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CONDITION_COLORS, type ViewProps } from "./types";

const SPINE_COLORS = [
  "from-indigo-900 to-indigo-800",
  "from-violet-900 to-violet-800",
  "from-purple-900 to-purple-800",
  "from-fuchsia-900 to-fuchsia-800",
  "from-rose-900 to-rose-800",
  "from-teal-900 to-teal-800",
  "from-cyan-900 to-cyan-800",
  "from-sky-900 to-sky-800",
  "from-emerald-900 to-emerald-800",
  "from-amber-900 to-amber-800",
];

function hashColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return SPINE_COLORS[Math.abs(h) % SPINE_COLORS.length];
}

function getImageUrl(item: ViewProps["items"][number]) {
  const primary = item.images.find((i) => i.isPrimary) ?? item.images[0];
  return primary?.url ?? primary?.filePath ?? null;
}

export function SpineView({ items, visibleTags, chipGroups: _chipGroups }: ViewProps) {
  const { categoryId } = useParams<{ categoryId: string }>();
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const imageUrl = getImageUrl(item);
        const chips = visibleTags
          .map((key) => item.customFields.find((f) => f.field.fieldKey === key)?.value)
          .filter(Boolean) as string[];
        const color = hashColor(item.id);

        return (
          <div
            key={item.id}
            className="group relative flex items-stretch rounded-md border border-border bg-card overflow-hidden h-14 hover:h-16 transition-all duration-150"
          >
            {/* Spine strip */}
            <Link href={`/collection/${categoryId}/${item.id}`} className={`relative w-10 shrink-0 bg-gradient-to-b ${color} flex items-center justify-center overflow-hidden`}>
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
              )}
              {item.condition && (
                <div className={`absolute inset-x-0 bottom-0 h-1 ${CONDITION_COLORS[item.condition]?.split(" ")[0] ?? ""}`} />
              )}
            </Link>

            {/* Title (rotated) — visible as vertical text strip concept: just show normal horizontally here since rows are horizontal */}
            <div className="flex flex-1 items-center gap-3 px-3 min-w-0">
              <div className="flex-1 min-w-0">
                <Link href={`/collection/${categoryId}/${item.id}`} className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">{item.title}</Link>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.year && <span className="text-[10px] text-muted-foreground">{item.year}</span>}
                  {chips.map((chip, i) => (
                    <span key={i} className="text-[10px] text-muted-foreground">· {chip}</span>
                  ))}
                  {item.isFavorite && <span className="text-xs">❤️</span>}
                </div>
              </div>

              {item.rating && (
                <div className="shrink-0 flex items-center gap-0.5">
                  <span className="text-yellow-400 text-xs">★</span>
                  <span className="text-[11px] text-muted-foreground">{item.rating}</span>
                </div>
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
}
