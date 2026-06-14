"use client";

import React from "react";

// ── SVG wrapper ────────────────────────────────────────────────────────────────
function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? "h-6 w-6"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

type IC = React.FC<{ className?: string }>;

// ── Icon definitions ──────────────────────────────────────────────────────────
const ICONS: Record<string, IC> = {
  gamepad: ({ className }) => (
    <Svg className={className}>
      <rect x="2" y="7" width="20" height="12" rx="3" />
      <path d="M8 12H6M7 11v2" />
      <circle cx="16" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="16" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  ),

  vinyl: ({ className }) => (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  ),

  cd: ({ className }) => (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </Svg>
  ),

  // Audio cassette — two reels with tape window
  cassette: ({ className }) => (
    <Svg className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M6 17a2 2 0 010-4 2 2 0 010 4z" />
      <path d="M18 17a2 2 0 010-4 2 2 0 010 4z" />
      <path d="M8 15h8" />
      <path d="M5 9h14" />
    </Svg>
  ),

  // VHS tape — wide cassette with tape window slit
  vhs: ({ className }) => (
    <Svg className={className}>
      <rect x="1" y="6" width="22" height="13" rx="2" />
      <rect x="4" y="10" width="16" height="4" rx="1" />
      <circle cx="7.5" cy="17" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="17" r="1" fill="currentColor" stroke="none" />
    </Svg>
  ),

  // DVD — disc with subtle inner ring
  dvd: ({ className }) => (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  ),

  // Blu-ray — disc with inner ring + small arc accent
  bluray: ({ className }) => (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M6 6.5a9 9 0 017 0" strokeWidth={1} />
    </Svg>
  ),

  // Open book
  book: ({ className }) => (
    <Svg className={className}>
      <path d="M4 4h6a2 2 0 012 2v13a1.5 1.5 0 00-1.5-1.5H4V4z" />
      <path d="M20 4h-6a2 2 0 00-2 2v13a1.5 1.5 0 011.5-1.5H20V4z" />
    </Svg>
  ),

  // Comic — speech bubble
  comic: ({ className }) => (
    <Svg className={className}>
      <path d="M4 3h16a1 1 0 011 1v11a1 1 0 01-1 1H8.5L4 20V4a1 1 0 011-1z" />
      <path d="M8 9h8M8 12h5" />
    </Svg>
  ),

  // Game console — box with power LED
  console: ({ className }) => (
    <Svg className={className}>
      <rect x="2" y="7" width="20" height="12" rx="2" />
      <rect x="6" y="11" width="6" height="4" rx="1" />
      <circle cx="17" cy="11" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none" />
      <path d="M2 19l1.5 2h17l1.5-2" />
    </Svg>
  ),

  // Desktop monitor
  computer: ({ className }) => (
    <Svg className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </Svg>
  ),

  // Film strip
  film: ({ className }) => (
    <Svg className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M2 9h5M17 9h5M2 15h5M17 15h5" />
    </Svg>
  ),

  // Music note (double)
  music: ({ className }) => (
    <Svg className={className}>
      <path d="M9 17v-9l12-2v9" />
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="15" r="3" />
    </Svg>
  ),

  // Headphones
  headphones: ({ className }) => (
    <Svg className={className}>
      <path d="M3 18v-6a9 9 0 0118 0v6" />
      <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5z" />
      <path d="M3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" />
    </Svg>
  ),

  // Television
  tv: ({ className }) => (
    <Svg className={className}>
      <rect x="2" y="7" width="20" height="13" rx="2" />
      <path d="M8 7L12 3l4 4M8 21h8" />
    </Svg>
  ),

  // Arcade joystick
  joystick: ({ className }) => (
    <Svg className={className}>
      <circle cx="12" cy="7" r="5" />
      <circle cx="12" cy="7" r="2" fill="currentColor" stroke="none" />
      <path d="M12 12v6" />
      <ellipse cx="12" cy="20" rx="6" ry="2" />
    </Svg>
  ),

  // Speaker
  speaker: ({ className }) => (
    <Svg className={className}>
      <rect x="4" y="6" width="8" height="12" rx="1" />
      <circle cx="8" cy="14" r="2" />
      <circle cx="8" cy="9" r="1" fill="currentColor" stroke="none" />
      <path d="M16 8a6 6 0 010 8M18.5 5.5a10 10 0 010 13" />
    </Svg>
  ),

  // Star
  star: ({ className }) => (
    <Svg className={className}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  ),

  // Heart
  heart: ({ className }) => (
    <Svg className={className}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </Svg>
  ),

  // Generic box (fallback)
  box: ({ className }) => (
    <Svg className={className}>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5M12 3v10" />
    </Svg>
  ),
};

// ── Public API ─────────────────────────────────────────────────────────────────

export const ICON_NAMES = Object.keys(ICONS);

export const ICON_LABELS: Record<string, string> = {
  gamepad: "Gamepad",
  vinyl: "Schallplatte",
  cd: "CD",
  cassette: "Kassette",
  vhs: "VHS",
  dvd: "DVD",
  bluray: "Blu-ray",
  book: "Buch",
  comic: "Comic",
  console: "Konsole",
  computer: "Computer",
  film: "Film",
  music: "Musik",
  headphones: "Kopfhörer",
  tv: "TV",
  joystick: "Joystick",
  speaker: "Lautsprecher",
  star: "Stern",
  heart: "Herz",
  box: "Box",
};

export function CategoryIcon({
  icon,
  className,
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  if (!icon) {
    const Fallback = ICONS.box;
    return <Fallback className={className} />;
  }

  const IconFn = ICONS[icon];
  if (IconFn) return <IconFn className={className} />;

  // Emoji / unknown string fallback
  return (
    <span
      role="img"
      className={`inline-flex items-center justify-center leading-none ${className ?? "h-6 w-6"}`}
    >
      {icon}
    </span>
  );
}
