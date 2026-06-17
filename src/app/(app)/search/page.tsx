"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ViewItem } from "@/components/views/types";

type SearchResult = ViewItem & { collectionIcon: string };

function getImageUrl(item: SearchResult) {
  const primary = item.images.find((i) => i.isPrimary) ?? item.images[0];
  return primary?.url ?? primary?.filePath ?? null;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [query]);

  if (!query) return (
    <p className="text-center text-muted-foreground text-sm py-20">Bitte Suchbegriff eingeben.</p>
  );

  if (loading) return (
    <p className="text-center text-muted-foreground text-sm py-20 animate-pulse">Suche läuft…</p>
  );

  if (results.length === 0) return (
    <p className="text-center text-muted-foreground text-sm py-20">
      Keine Ergebnisse für <span className="text-foreground font-medium">„{query}"</span>.
    </p>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {results.map((item) => {
        const imageUrl = getImageUrl(item);
        return (
          <Link
            key={item.id}
            href={`/collection/${item.collectionId}/${item.id}`}
            className="media-card group flex gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary transition"
          >
            <div className="relative w-14 h-18 shrink-0 rounded-md bg-muted overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <span className="text-xl opacity-20">{item.collectionIcon}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <p className="text-xs text-muted-foreground truncate">
                {item.collectionIcon}
              </p>
              <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">{item.title}</p>
              {item.year && <p className="text-xs text-muted-foreground">{item.year}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function SearchPage() {
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const query = searchParams.get("q") ?? "";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">Suche</h2>
        {query && <p className="mt-1 text-sm text-muted-foreground">Ergebnisse für „{query}"</p>}
      </div>
      <Suspense fallback={<p className="text-center text-muted-foreground text-sm py-20 animate-pulse">Suche läuft…</p>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
