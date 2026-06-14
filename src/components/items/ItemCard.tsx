"use client";

type ItemImage = { url: string | null; filePath: string | null; isPrimary: boolean };

export type CardItem = {
  id: string;
  title: string;
  year: number | null;
  condition: string | null;
  isFavorite: boolean;
  images: ItemImage[];
};

const CONDITION_COLORS: Record<string, string> = {
  MINT:      "text-green-400 border-green-400/30 bg-green-400/10",
  VERY_GOOD: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  GOOD:      "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  USED:      "text-orange-400 border-orange-400/30 bg-orange-400/10",
  POOR:      "text-red-400 border-red-400/30 bg-red-400/10",
};

const CONDITION_LABELS: Record<string, string> = {
  MINT: "Mint", VERY_GOOD: "Very Good", GOOD: "Good", USED: "Used", POOR: "Poor",
};

interface Props {
  item: CardItem;
  categoryIcon: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function ItemCard({ item, categoryIcon, onEdit, onDelete }: Props) {
  const primaryImage = item.images.find((i) => i.isPrimary) ?? item.images[0];
  const imageUrl = primaryImage?.url ?? primaryImage?.filePath ?? null;

  return (
    <div className="media-card group relative flex flex-col rounded-lg border border-border bg-card overflow-hidden">
      {/* Cover */}
      <div className="scanlines relative aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="text-4xl opacity-20">{categoryIcon}</div>
        )}

        {item.condition && (
          <span className={`absolute top-1.5 right-1.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase ${CONDITION_COLORS[item.condition] ?? "border-border text-muted-foreground"}`}>
            {CONDITION_LABELS[item.condition] ?? item.condition}
          </span>
        )}

        {item.isFavorite && (
          <span className="absolute top-1.5 left-1.5 text-sm leading-none">❤️</span>
        )}

        {/* Hover actions */}
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-full rounded-md bg-primary/90 py-1.5 text-[10px] font-medium text-primary-foreground uppercase tracking-wider hover:bg-primary transition"
          >
            Bearbeiten
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-full rounded-md bg-destructive/80 py-1.5 text-[10px] font-medium text-white uppercase tracking-wider hover:bg-destructive transition"
          >
            Löschen
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-2 space-y-1">
        <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
          {item.title}
        </p>
        {item.year && (
          <p className="text-xs text-muted-foreground">{item.year}</p>
        )}
      </div>
    </div>
  );
}
