"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
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

export function AppHeader({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const router = useRouter();
  const { t } = useTranslations();
  const [query, setQuery]           = useState("");
  const [suggestions, setSuggestions] = useState<SearchItem[]>([]);
  const [showDrop, setShowDrop]     = useState(false);
  const [searching, setSearching]   = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDrop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      {/* Mobile text logo row */}
      <div className="md:hidden flex items-center justify-center py-2.5 border-b border-border/50">
        <Link href="/dashboard" className="font-heading text-base uppercase tracking-widest">
          <span style={{ color: "#00b4d8" }}>RETRO</span>
          <span className="text-primary">MAN</span>
        </Link>
      </div>

      {/* Controls row */}
      <div className="flex h-14 md:h-44 items-center gap-3 md:gap-4 px-3 md:px-6">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-primary transition shrink-0"
        aria-label={t.header.menu}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logo — desktop only */}
      <div className="hidden md:flex items-center w-52 shrink-0">
        <Link href="/dashboard" className="relative block w-52 h-[168px]">
          <Image src="/logo.png" alt="RetroMan" fill className="object-contain object-left" />
        </Link>
      </div>

      {/* Search */}
      <div ref={searchRef} className="relative flex-1">
        <form onSubmit={handleSearch} className="flex items-center gap-2 rounded-md border border-border bg-muted px-4 py-2.5">
          <button type="submit" className="shrink-0 text-muted-foreground hover:text-primary transition">
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
            className="flex-1 bg-transparent text-sm text-foreground search-slogan-placeholder outline-none"
          />
          {query === "" && (
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">{t.header.chipName}</span>
              <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">{t.header.chipType}</span>
              <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">{t.header.chipYear}</span>
            </div>
          )}
        </form>

        {/* Suggestions dropdown */}
        {showDrop && suggestions.length > 0 && (
          <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-border bg-card shadow-2xl z-50 overflow-hidden">
            {suggestions.map((item) => {
              const img = item.images.find((i) => i.isPrimary) ?? item.images[0];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickSuggestion(item)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition"
                >
                  <div className="w-8 h-10 rounded border border-border bg-muted shrink-0 overflow-hidden">
                    {img?.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.collection.name}{item.year ? ` · ${item.year}` : ""}</p>
                  </div>
                </button>
              );
            })}
            <div className="border-t border-border px-4 py-2">
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
      </div>
    </header>
  );
}
