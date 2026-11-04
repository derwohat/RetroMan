import localFont from "next/font/local";

/**
 * The three families, shipped with the app instead of fetched from Google.
 *
 * `next/font/google` sends nothing to Google at runtime - it self-hosts what it
 * downloads - but it downloads on every `next build`, which makes the build
 * depend on fonts.gstatic.com answering in time. That is a dependency a build
 * should not have, and it is the only reason these files now live here. The
 * bytes are the ones the css2 API serves, so nothing about the rendering
 * changes. The OFL licence of each family sits next to its files, as the
 * licence requires.
 *
 * Each family comes in two cuts with their own `unicode-range`: `latin` for
 * everyday text and `latin-ext` for names like Łukasz or Şahin.
 *
 * **The ranges are written out in every call on purpose.** Pulling them into a
 * shared constant is the obvious tidy-up and it does not work: next/font reads
 * its options statically while building, so a referenced variable arrives as
 * nothing. The build then fails with `missing field 'value' at
 * arguments[0].declarations[0]`, which says little about the cause.
 *
 * The second trap, and the reason the stack in globals.css puts the ext family
 * FIRST: a CSS variable from next/font points at the family name next/font
 * generated, not at any name declared here, and two cuts cannot share one
 * family name. With `latin` in front, its size-adjusted Arial fallback would
 * catch the "ł" before `latin-ext` was ever consulted - the page looks right at
 * a glance and is wrong exactly where it matters. The ext cut therefore also
 * carries `adjustFontFallback: false` (no fallback of its own to get in the
 * way) and `preload: false` (needed rarely; preloading would cost every visitor
 * a download for characters most pages never show).
 */

export const sans = localFont({
  src: "./files/geist-latin.woff2",
  variable: "--font-sans-nf",
  weight: "100 900",
  style: "normal",
  display: "swap",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const sansExt = localFont({
  src: "./files/geist-latin-ext.woff2",
  variable: "--font-sans-ext-nf",
  weight: "100 900",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
});

export const mono = localFont({
  src: "./files/geist-mono-latin.woff2",
  variable: "--font-mono-nf",
  weight: "100 900",
  style: "normal",
  display: "swap",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const monoExt = localFont({
  src: "./files/geist-mono-latin-ext.woff2",
  variable: "--font-mono-ext-nf",
  weight: "100 900",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
});

export const heading = localFont({
  src: "./files/press-start-2p-latin.woff2",
  variable: "--font-heading-nf",
  weight: "400",
  style: "normal",
  display: "swap",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});

export const headingExt = localFont({
  src: "./files/press-start-2p-latin-ext.woff2",
  variable: "--font-heading-ext-nf",
  weight: "400",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
});

/** All six variables, for the element that should carry them. */
export const fontVariables = [
  sans.variable,
  sansExt.variable,
  mono.variable,
  monoExt.variable,
  heading.variable,
  headingExt.variable,
].join(" ");
