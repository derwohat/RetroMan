"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";

type Profile = { name: string; email: string; role: string };

export function AppHeader() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setProfile(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-50 flex h-44 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur">
      {/* Logo */}
      <div className="flex items-center w-52 shrink-0">
        <Link href="/dashboard" className="relative block w-52 h-[168px]">
          <Image src="/logo.png" alt="RetroMan" fill className="object-contain object-left" />
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2 rounded-md border border-border bg-muted px-4 py-2.5">
        <button type="submit" className="shrink-0 text-muted-foreground hover:text-primary transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rewind your world!"
          className="flex-1 bg-transparent text-sm text-foreground search-slogan-placeholder outline-none"
        />
        {query === "" && (
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">Name</span>
            <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">Typ</span>
            <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">Jahr</span>
          </div>
        )}
      </form>

      {/* Actions */}
      <div className="flex items-center gap-3 ml-auto">
        <ThemeToggle />

        {/* Profile dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:border-primary hover:text-primary"
            title="Profil"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* User info */}
              {profile && (
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                  {profile.role === "ADMIN" && (
                    <span className="mt-1 inline-block rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary uppercase tracking-wider">Admin</span>
                  )}
                </div>
              )}

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Profil & Einstellungen
                </Link>

                {profile?.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Admin-Bereich
                  </Link>
                )}
              </div>

              {/* Logout */}
              <div className="border-t border-border py-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Abmelden
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
