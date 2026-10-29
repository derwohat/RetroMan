"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/components/LanguageProvider";

type SearchItem = {
  id: string;
  title: string;
  year: number | null;
  collection: {
    id: string;
    name: string;
    icon: string | null;
  };
  images: Array<{ url: string | null; isPrimary: boolean }>;
};

/**
 * The search, lifted out of the header so it can sit in the sidebar.
 *
 * The header is the brand band now and has no room for a field; the sidebar
 * is where you already are when you look for something.
 */
export function SearchBox() {
  const router = useRouter();
  const { t } = useTranslations();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchItem[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDrop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // The timer outlives the component if the user navigates while typing.
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length >= 3) {
      timerRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const res = await fetch(`/api/items?search=${encodeURIComponent(value.trim())}`);
          if (res.ok) {
            const items: SearchItem[] = await res.json();
            setSuggestions(items.slice(0, 8));
            setShowDrop(true);
          }
        } catch {
          // A dropped connection is not worth an error message under a search
          // field; the next keystroke tries again.
        } finally {
          setSearching(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowDrop(false);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) { setShowDrop(false); router.push(`/search?q=${encodeURIComponent(q)}`); }
  }

  function pickSuggestion(item: SearchItem) {
    setShowDrop(false);
    setQuery("");
    router.push(`/collection/${item.collection.id}`);
  }

  return (
    <div ref={searchRef} className="relative">
      <form onSubmit={handleSearch} className="flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1.5">
        <button
          type="submit"
          className="grid h-7 w-7 shrink-0 place-items-center text-muted-foreground hover:text-primary transition"
          aria-label={t.common.search}
        >
          {searching ? (
            <span className="h-4 w-4 inline-block animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDrop(true); }}
          autoComplete="off"
          placeholder={t.common.search}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
        />
      </form>

      {showDrop && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-border bg-card shadow-2xl z-50 overflow-hidden">
          {suggestions.map((item) => {
            const img = item.images.find((i) => i.isPrimary) ?? item.images[0];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pickSuggestion(item)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted transition"
              >
                <div className="w-8 h-10 rounded border border-border bg-muted shrink-0 overflow-hidden">
                  {img?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.collection.name}{item.year ? ` · ${item.year}` : ""}</p>
                </div>
              </button>
            );
          })}
          <div className="border-t border-border px-3 py-2">
            <button
              type="button"
              onClick={() => { setShowDrop(false); router.push(`/search?q=${encodeURIComponent(query.trim())}`); }}
              className="text-xs text-primary hover:underline"
            >
              {t.header.allResultsFor} „{query.trim()}" {t.header.showAll}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
