"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "@/components/LanguageProvider";

/** Pink of the record, cyan of the cassette — the pulse travels between them. */
const RING_FROM = [0xff, 0x2d, 0x95] as const;
const RING_TO = [0x00, 0xf5, 0xd4] as const;

/**
 * The band is 150px tall and the mark is cropped to the part that has to stay
 * readable: the cassette and the wordmark sit between 28% and 72% of the
 * image. Everything outside that is groove and may run off the edge.
 */
const BAND_H = 150;
const VISIBLE = 0.44;
const VISIBLE_FROM = 0.28;
const LOGO_H = Math.round(BAND_H / VISIBLE);
const LOGO_OFFSET = -Math.round(VISIBLE_FROM * LOGO_H);

/**
 * Where the mark's outermost groove sits, in pixels from the centre. The
 * animated rings start exactly there, so the pulse looks like it leaves the
 * record rather than appearing beside it.
 */
const FIRST_RING_R = Math.round(LOGO_H / 2);
const RING_COUNT = 16;
const RING_STEP = 44;
const RING_STAGGER = 0.26;
const RING_CYCLE = 7;

function ringColor(i: number): string {
  const t = Math.min(1, i / (RING_COUNT - 3));
  const c = RING_FROM.map((from, k) => Math.round(from + (RING_TO[k] - from) * t));
  return `rgb(${c.join(",")})`;
}

/** Brighter near the record, almost gone at the edge. */
function ringPeak(i: number): number {
  return 0.6 * Math.pow(1 - i / RING_COUNT, 1.3) + 0.05;
}

export function AppHeader({
  onMenuToggle,
  sidebarOpen = false,
  // The app and the admin area each have their own drawer; the burger has to
  // point at the one that is on the page.
  sidebarId = "app-sidebar",
}: {
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
  sidebarId?: string;
}) {
  const { t } = useTranslations();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      {/* Mobile row: a 150px band would eat the screen, so the phone keeps the
          wordmark and the burger. The search lives in the drawer either way. */}
      <div className="md:hidden flex h-14 items-center gap-3 px-3">
        <button
          onClick={onMenuToggle}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:text-primary transition"
          aria-label={t.header.menu}
          aria-expanded={sidebarOpen}
          aria-controls={sidebarId}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/dashboard" className="flex min-h-11 flex-1 items-center justify-center font-heading text-base uppercase tracking-widest">
          <span style={{ color: "#00b4d8" }}>RETRO</span>
          <span className="text-primary">MAN</span>
        </Link>
        {/* Balances the burger so the wordmark sits in the middle. */}
        <span className="h-11 w-11 shrink-0" aria-hidden="true" />
      </div>

      {/* Desktop band, across the whole window */}
      <div className="groove-band hidden md:block relative overflow-hidden" style={{ height: BAND_H }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {Array.from({ length: RING_COUNT }, (_, i) => {
            const d = (FIRST_RING_R + i * RING_STEP) * 2;
            return (
              <span
                key={i}
                className="groove-ring"
                style={{
                  width: d,
                  height: d,
                  borderColor: ringColor(i),
                  ["--groove-peak" as string]: ringPeak(i).toFixed(3),
                  animationDuration: `${RING_CYCLE}s`,
                  animationDelay: `${(i * RING_STAGGER).toFixed(2)}s`,
                }}
              />
            );
          })}
        </div>

        <div className="absolute inset-0 flex items-start justify-center">
          <Link href="/dashboard" aria-label="RetroMan" style={{ marginTop: LOGO_OFFSET }}>
            <Image src="/logo.png" alt="RetroMan" width={LOGO_H} height={LOGO_H} priority />
          </Link>
        </div>
      </div>
    </header>
  );
}
