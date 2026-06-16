"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { CONDITION_COLORS, CONDITION_LABELS, type ViewProps } from "./types";

type SortKey = "title" | "year" | "condition" | "purchasePrice";

function getImageUrl(item: ViewProps["items"][number]) {
  const primary = item.images.find((i) => i.isPrimary) ?? item.images[0];
  return primary?.url ?? primary?.filePath ?? null;
}

export function TableView({ items, categoryIcon, visibleTags, fields, chipGroups: _chipGroups }: ViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortAsc, setSortAsc] = useState(true);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  const sorted = [...items].sort((a, b) => {
    let av: string | number | null = null;
    let bv: string | number | null = null;
    if (sortKey === "title")         { av = a.title;         bv = b.title; }
    else if (sortKey === "year")     { av = a.year;          bv = b.year; }
    else if (sortKey === "purchasePrice") { av = a.purchasePrice; bv = b.purchasePrice; }
    else if (sortKey === "condition") {
      const order = ["MINT", "VERY_GOOD", "GOOD", "USED", "POOR"];
      av = a.condition ? order.indexOf(a.condition) : 99;
      bv = b.condition ? order.indexOf(b.condition) : 99;
    }
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortAsc ? cmp : -cmp;
  });

  const extraFields = visibleTags
    .map((key) => fields.find((f) => f.fieldKey === key))
    .filter(Boolean) as ViewProps["fields"];

  function Th({ label, sortable, sk }: { label: string; sortable?: boolean; sk?: SortKey }) {
    const active = sortable && sk === sortKey;
    return (
      <th
        onClick={sortable && sk ? () => toggleSort(sk) : undefined}
        className={`px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap select-none ${sortable ? "cursor-pointer hover:text-foreground" : ""} ${active ? "text-primary" : ""}`}
      >
        {label}
        {active && <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>}
      </th>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="w-10 px-3 py-2" />
              <Th label="Titel"      sortable sk="title" />
              <Th label="Jahr"       sortable sk="year" />
              <Th label="Zustand"    sortable sk="condition" />
              <Th label="Preis"      sortable sk="purchasePrice" />
              {extraFields.map((f) => (
                <Th key={f.fieldKey} label={f.name} />
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => {
              const imageUrl = getImageUrl(item);
              return (
                <tr
                  key={item.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                >
                  {/* Thumbnail */}
                  <td className="px-3 py-2">
                    <Link href={`/collection/${item.collectionId}/${item.id}`}>
                      <div className="w-8 h-10 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0 hover:ring-1 hover:ring-primary transition">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs opacity-30">{categoryIcon}</span>
                        )}
                      </div>
                    </Link>
                  </td>

                  {/* Title */}
                  <td className="px-3 py-2 max-w-[220px]">
                    <Link href={`/collection/${item.collectionId}/${item.id}`} className="flex items-center gap-1.5 hover:text-primary transition">
                      {item.isFavorite && <span className="text-xs">❤️</span>}
                      <span className="font-medium text-foreground truncate">{item.title}</span>
                    </Link>
                  </td>

                  {/* Year */}
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {item.year ?? "—"}
                  </td>

                  {/* Condition */}
                  <td className="px-3 py-2">
                    {item.condition ? (
                      <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase ${CONDITION_COLORS[item.condition] ?? "border-border text-muted-foreground"}`}>
                        {CONDITION_LABELS[item.condition]}
                      </span>
                    ) : "—"}
                  </td>

                  {/* Price */}
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {formatPrice(item.purchasePrice)}
                  </td>

                  {/* Custom fields */}
                  {extraFields.map((f) => (
                    <td key={f.fieldKey} className="px-3 py-2 text-muted-foreground">
                      {item.customFields.find((cf) => cf.field.fieldKey === f.fieldKey)?.value ?? "—"}
                    </td>
                  ))}

                </tr>
              );
            })}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={6 + extraFields.length} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Keine Einträge vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
