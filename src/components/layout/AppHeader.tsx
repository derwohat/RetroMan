import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur">
      {/* Logo + Title */}
      <div className="flex flex-col justify-center min-w-[180px]">
        <div className="relative w-44 h-10">
          <Image src="/logo.png" alt="RetroMan" fill className="object-contain object-left" />
        </div>
        <span className="slogan-glow text-[8px] tracking-widest italic pl-0.5">
          Rewind your world!
        </span>
      </div>

      {/* Search */}
      <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 max-w-xl">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Suchen…"
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
        />
        <div className="hidden sm:flex items-center gap-1">
          <span className="rounded border border-border px-1 py-0.5 text-[9px] text-muted-foreground">Name</span>
          <span className="rounded border border-border px-1 py-0.5 text-[9px] text-muted-foreground">Typ</span>
          <span className="rounded border border-border px-1 py-0.5 text-[9px] text-muted-foreground">Jahr</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <button className="hidden sm:flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Hinzufügen
        </button>
        <ThemeToggle />
        <button className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:border-primary hover:text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
