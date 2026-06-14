"use client";

import { useState, useRef, useEffect } from "react";
import { isoToDE, deToISO } from "@/lib/format";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

type CategoryField = {
  id: string;
  name: string;
  fieldKey: string;
  fieldType: string;
  options: string[];
  required: boolean;
};

type Category = {
  id: string;
  name: string;
  icon: string | null;
  mediaType?: string;
  fields: CategoryField[];
  tagGroups?: Array<{ groupId: string; group: { id: string; name: string } }>;
};

export type FormItem = {
  id: string;
  title: string;
  year: number | null;
  condition: string | null;
  itemStatus: string | null;
  collectionStatus: string;
  isFavorite: boolean;
  location: string | null;
  quantity: number;
  barcode: string | null;
  description: string | null;
  notes: string | null;
  rating: number | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  store: string | null;
  tags: Array<{ tag: { id: string; name: string } }>;
  images: Array<{ url: string | null; isPrimary: boolean }>;
};

type CoverResult = { url: string; label: string; source: string };
type TagValue = { id: string; value: string };
type TagGroup = { id: string; name: string; values: TagValue[] };

interface Props {
  category: Category;
  item: FormItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const CONDITIONS = [
  { value: "MINT",      label: "Mint" },
  { value: "VERY_GOOD", label: "Very Good" },
  { value: "GOOD",      label: "Good" },
  { value: "USED",      label: "Used" },
  { value: "POOR",      label: "Poor" },
];

const ITEM_STATUSES = [
  { value: "OPENED", label: "Geöffnet" },
  { value: "SEALED", label: "Versiegelt" },
  { value: "GRADED", label: "Gegraded" },
];

const STANDARD_GROUP_NAMES = ["Shops", "Lagerort"];

// ── German date input (TT.MM.JJJJ) with calendar picker ──────────────────────
function GermanDateInput({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const dateRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(isoToDE(value));

  useEffect(() => { setDraft(isoToDE(value)); }, [value]);

  return (
    <div className="relative">
      <input
        type="text"
        className="retro-field w-full pr-8"
        value={draft}
        placeholder="TT.MM.JJJJ"
        onChange={(e) => {
          setDraft(e.target.value);
          const iso = deToISO(e.target.value);
          if (iso) onChange(iso);
          else if (!e.target.value.trim()) onChange("");
        }}
      />
      <input
        ref={dateRef}
        type="date"
        tabIndex={-1}
        value={deToISO(draft) ?? ""}
        onChange={(e) => {
          setDraft(isoToDE(e.target.value));
          onChange(e.target.value);
        }}
        className="sr-only"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => { try { dateRef.current?.showPicker(); } catch {} }}
        className="absolute right-2 inset-y-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Datum auswählen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
}


// ── Main form ─────────────────────────────────────────────────────────────────
export function ItemForm({ category, item, onClose, onSaved }: Props) {
  const primaryImage = item?.images.find((i) => i.isPrimary) ?? item?.images[0];

  const [form, setForm] = useState({
    title:            item?.title ?? "",
    year:             item?.year?.toString() ?? "",
    condition:        item?.condition ?? "",
    itemStatus:       item?.itemStatus ?? "",
    collectionStatus: item?.collectionStatus ?? "OWNED",
    isFavorite:       item?.isFavorite ?? false,
    location:         item?.location ?? "",
    quantity:         item?.quantity?.toString() ?? "1",
    barcode:          item?.barcode ?? "",
    description:      item?.description ?? "",
    notes:            item?.notes ?? "",
    rating:           item?.rating?.toString() ?? "",
    purchaseDate:     item?.purchaseDate ? item.purchaseDate.split("T")[0] : "",
    purchasePrice:    item?.purchasePrice?.toString() ?? "",
    store:            item?.store ?? "",
    imageUrl:         primaryImage?.url ?? "",
  });

  const [extraTagValues, setExtraTagValues] = useState<Record<string, string>>({});

  const [uploading, setUploading]         = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");
  const [coverResults, setCoverResults]   = useState<CoverResult[]>([]);
  const [coverLoading, setCoverLoading]   = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [tagGroups, setTagGroups]         = useState<TagGroup[]>([]);
  const fileRef     = useRef<HTMLInputElement>(null);
  const pickerRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowCoverPicker(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.ok ? r.json() : [])
      .then(setTagGroups)
      .catch(() => {});
  }, []);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function searchCovers() {
    if (!form.title.trim()) return;
    setShowCoverPicker(true);
    setCoverLoading(true);
    setCoverResults([]);
    const p = new URLSearchParams({ title: form.title.trim(), mediaType: category.mediaType ?? "CUSTOM" });
    if (form.year) p.set("year", form.year);
    try {
      const res = await fetch(`/api/cover-search?${p}`);
      if (res.ok) setCoverResults(await res.json());
    } finally {
      setCoverLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const { url } = await res.json();
      set("imageUrl", url);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Titel ist erforderlich."); return; }
    setSaving(true);
    setError("");

    const body = {
      categoryId:       category.id,
      title:            form.title.trim(),
      year:             form.year ? parseInt(form.year) : null,
      condition:        form.condition || null,
      itemStatus:       form.itemStatus || null,
      collectionStatus: form.collectionStatus,
      isFavorite:       form.isFavorite,
      location:         form.location || null,
      quantity:         parseInt(form.quantity) || 1,
      barcode:          form.barcode || null,
      description:      form.description || null,
      notes:            form.notes || null,
      rating:           form.rating ? parseInt(form.rating) : null,
      purchaseDate:     form.purchaseDate || null,
      purchasePrice:    form.purchasePrice ? parseFloat(form.purchasePrice) : null,
      store:            form.store || null,
      imageUrl:         form.imageUrl || null,
      tags: Object.entries(extraTagValues)
        .filter(([, v]) => v)
        .map(([groupId, tagValueId]) => ({ groupId, tagValueId })),
    };

    const url    = item ? `/api/items/${item.id}` : "/api/items";
    const method = item ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (!res.ok) { setError((await res.json()).error ?? "Fehler"); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest flex items-center gap-1.5">
            {item ? "Item bearbeiten" : (
              <>
                Neuer Eintrag —
                <CategoryIcon icon={category.icon ?? null} className="h-3.5 w-3.5" />
                {category.name}
              </>
            )}
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition text-xl leading-none">✕</button>
        </div>

        {/* Scrollable fields */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Title */}
          <Field label="Titel *">
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="retro-field w-full"
              placeholder="Titel des Items"
            />
          </Field>

          {/* Cover */}
          <Field label="Cover">
            <div className="flex gap-3 items-start">
              <div ref={pickerRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={searchCovers}
                  title="Klicken zum Cover suchen"
                  className="group relative w-16 h-20 rounded border border-border bg-muted flex items-center justify-center overflow-hidden hover:border-primary transition"
                >
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <CategoryIcon icon={category.icon ?? null} className="h-8 w-8 opacity-20" />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </button>

                {showCoverPicker && (
                  <div className="absolute left-0 top-[88px] z-30 w-72 rounded-lg border border-border bg-card shadow-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cover-Vorschläge</p>
                      <button type="button" onClick={() => setShowCoverPicker(false)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                    </div>

                    {coverLoading && (
                      <div className="flex items-center justify-center py-6">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="ml-2 text-xs text-muted-foreground">Suche…</span>
                      </div>
                    )}

                    {!coverLoading && coverResults.length === 0 && (
                      <div className="py-4 text-center space-y-1">
                        <p className="text-xs text-muted-foreground">Keine Cover gefunden.</p>
                        <button type="button" onClick={searchCovers} className="mt-1 text-[10px] text-primary hover:underline">Erneut suchen</button>
                      </div>
                    )}

                    {!coverLoading && coverResults.length > 0 && (
                      <>
                        <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                          {coverResults.map((r, i) => (
                            <button
                              key={i}
                              type="button"
                              title={r.label}
                              onClick={() => { set("imageUrl", r.url); setShowCoverPicker(false); }}
                              className="group relative aspect-[3/4] rounded overflow-hidden border border-border hover:border-primary transition"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={r.url} alt={r.label} className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition" />
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-muted-foreground text-right">
                          Quelle: {[...new Set(coverResults.map((r) => r.source))].join(", ")}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => set("imageUrl", e.target.value)}
                  className="retro-field w-full"
                  placeholder="https://… (Cover-URL)"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition disabled:opacity-50"
                  >
                    {uploading ? "Lädt hoch…" : "↑ Datei hochladen"}
                  </button>
                  <button
                    type="button"
                    onClick={searchCovers}
                    className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition"
                  >
                    🔍 Suchen
                  </button>
                  {form.imageUrl && (
                    <button type="button" onClick={() => set("imageUrl", "")} className="text-xs text-destructive hover:underline">Entfernen</button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </div>
            </div>
          </Field>

          {/* Year + Condition */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jahr">
              <input
                type="number" min="1800" max={new Date().getFullYear() + 2}
                value={form.year} onChange={(e) => set("year", e.target.value)}
                className="retro-field w-full" placeholder="1997"
              />
            </Field>
            <Field label="Zustand">
              <select value={form.condition} onChange={(e) => set("condition", e.target.value)} className="retro-field w-full">
                <option value="">—</option>
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
          </div>

          {/* Status + Collection */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Item-Status">
              <select value={form.itemStatus} onChange={(e) => set("itemStatus", e.target.value)} className="retro-field w-full">
                <option value="">—</option>
                {ITEM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Sammlung">
              <select value={form.collectionStatus} onChange={(e) => set("collectionStatus", e.target.value)} className="retro-field w-full">
                <option value="OWNED">Vorhanden</option>
                <option value="WISHLIST">Wunschliste</option>
              </select>
            </Field>
          </div>

          {/* Price + Date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kaufpreis (€)">
              <input type="number" min="0" step="0.01"
                value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)}
                className="retro-field w-full" placeholder="29.99"
              />
            </Field>
            <Field label="Kaufdatum">
              <GermanDateInput value={form.purchaseDate} onChange={(iso) => set("purchaseDate", iso)} />
            </Field>
          </div>

          {/* Store + Location */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gekauft bei">
              <select value={form.store} onChange={(e) => set("store", e.target.value)} className="retro-field w-full">
                <option value="">—</option>
                {(tagGroups.find((g) => g.name === "Shops")?.values ?? []).map((v) => (
                  <option key={v.id} value={v.value}>{v.value}</option>
                ))}
              </select>
            </Field>
            <Field label="Lagerort">
              <select value={form.location} onChange={(e) => set("location", e.target.value)} className="retro-field w-full">
                <option value="">—</option>
                {(tagGroups.find((g) => g.name === "Lagerort")?.values ?? []).map((v) => (
                  <option key={v.id} value={v.value}>{v.value}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Extra tag groups assigned to this category */}
          {(() => {
            const extraGroups = (category.tagGroups ?? [])
              .map((ctg) => tagGroups.find((g) => g.id === ctg.groupId))
              .filter((g): g is TagGroup => !!g && !STANDARD_GROUP_NAMES.includes(g.name));
            if (extraGroups.length === 0) return null;
            return (
              <div className="grid grid-cols-2 gap-3">
                {extraGroups.map((g) => (
                  <Field key={g.id} label={g.name}>
                    <select
                      value={extraTagValues[g.id] ?? ""}
                      onChange={(e) => setExtraTagValues((v) => ({ ...v, [g.id]: e.target.value }))}
                      className="retro-field w-full"
                    >
                      <option value="">—</option>
                      {g.values.map((v) => (
                        <option key={v.id} value={v.id}>{v.value}</option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
            );
          })()}

          {/* Qty + Barcode */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Anzahl">
              <input type="number" min="1"
                value={form.quantity} onChange={(e) => set("quantity", e.target.value)}
                className="retro-field w-full"
              />
            </Field>
            <Field label="Barcode (EAN)">
              <input value={form.barcode} onChange={(e) => set("barcode", e.target.value)}
                className="retro-field w-full font-mono" placeholder="4005209124270"
              />
            </Field>
          </div>



          {/* Notes */}
          <Field label="Notizen">
            <textarea
              value={form.notes} onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="retro-field w-full resize-none"
              placeholder="Zustand, Besonderheiten, Seriennummer…"
            />
          </Field>

          {/* Favorite */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.isFavorite} onChange={(e) => set("isFavorite", e.target.checked)} className="rounded" />
            <span className="text-sm text-muted-foreground">Als Favorit markieren ❤️</span>
          </label>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-5 py-4 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition">
            Abbrechen
          </button>
          <button type="submit" disabled={saving} className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition">
            {saving ? "Speichern…" : item ? "Aktualisieren" : "Hinzufügen"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
