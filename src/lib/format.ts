export function formatPrice(value: number | null | undefined, locale = "de-DE", currency = "EUR"): string {
  if (value == null) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(value));
}

export function formatDate(value: string | Date | null | undefined, lang: "de" | "en" | "fr" = "de"): string {
  if (!value) return "—";
  // DE and FR → European DD.MM.YYYY; EN → MM/DD/YYYY
  const intlLocale = lang === "en" ? "en-US" : "de-DE";
  return new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export function isoToDE(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}.${m}.${y}` : iso;
}

export function deToISO(de: string): string | null {
  if (!de.trim()) return null;
  const parts = de.trim().split(".");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
