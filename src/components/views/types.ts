export type ViewType = "SHELF" | "SPINE" | "CDWALL" | "SIMPLE" | "TABLE";
export type MediaType = "GAME" | "MUSIC" | "VIDEO" | "BOOK" | "CONSOLE" | "CUSTOM";

export const VIEW_AVAILABILITY: Record<MediaType, ViewType[]> = {
  GAME:    ["SHELF", "SIMPLE", "TABLE"],
  MUSIC:   ["SHELF", "CDWALL", "SIMPLE", "TABLE"],
  VIDEO:   ["SHELF", "SIMPLE", "TABLE"],
  BOOK:    ["SHELF", "SPINE", "SIMPLE", "TABLE"],
  CONSOLE: ["SHELF", "SIMPLE", "TABLE"],
  CUSTOM:  ["SHELF", "SIMPLE", "TABLE"],
};

export const VIEW_LABELS: Record<ViewType, string> = {
  SHELF:  "Kacheln",
  SPINE:  "Rücken",
  CDWALL: "CD-Wand",
  SIMPLE: "Regal",
  TABLE:  "Tabelle",
};

export const VIEW_ICONS: Record<ViewType, string> = {
  SHELF:  "▦",
  SPINE:  "▥",
  CDWALL: "⊞",
  SIMPLE: "◫",
  TABLE:  "☰",
};

export type ViewItem = {
  id: string;
  collectionId: string;
  title: string;
  year: number | null;
  condition: string | null;
  isFavorite: boolean;
  collectionStatus: string;
  purchasePrice: number | null;
  store: string | null;
  location: string | null;
  quantity: number;
  barcode: string | null;
  notes: string | null;
  images: Array<{ url: string | null; filePath: string | null; isPrimary: boolean }>;
  tags: Array<{
    groupId: string;
    tagValue: { id: string; value: string };
    tagGroup: { id: string; name: string };
  }>;
  customFields: Array<{ value: string; field: { name: string; fieldKey: string } }>;
};

export type CategoryField = {
  id: string;
  name: string;
  fieldKey: string;
  fieldType: string;
  options: string[];
  required: boolean;
};

export const CONDITION_LABELS: Record<string, string> = {
  MINT: "Mint", VERY_GOOD: "Very Good", GOOD: "Good", USED: "Used", POOR: "Poor",
};

export const CONDITION_COLORS: Record<string, string> = {
  MINT:      "text-green-400 border-green-400/30 bg-green-400/10",
  VERY_GOOD: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  GOOD:      "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  USED:      "text-orange-400 border-orange-400/30 bg-orange-400/10",
  POOR:      "text-red-400 border-red-400/30 bg-red-400/10",
};

export interface ViewProps {
  items: ViewItem[];
  categoryIcon: string;
  visibleTags: string[];
  fields: CategoryField[];
  chipGroups: Array<{ groupId: string; name: string }>;
}
