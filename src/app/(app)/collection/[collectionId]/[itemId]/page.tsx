"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { CONDITION_LABELS, CONDITION_COLORS } from "@/components/views/types";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useTranslations } from "@/components/LanguageProvider";

// ── Types ─────────────────────────────────────────────────────────────────────
type Field = { id: string; name: string; fieldKey: string; fieldType: string; options: string[]; required: boolean };
type Category = {
  id: string;
  name: string;
  icon: string | null;
  mediaType: string;
  fields: Field[];
  tagGroups: Array<{ groupId: string; showInView: boolean }>;
};
type Collection = { id: string; name: string; category: Category };
type CustomField = { value: string; field: { id: string; name: string; fieldKey: string; fieldType: string; options: string[] } };
type TagValue = { id: string; value: string };
type TagGroup = { id: string; name: string; order: number; values: TagValue[] };
type ItemTagLink = {
  tagValueId: string;
  groupId: string;
  tagValue: { id: string; value: string };
  tagGroup: { id: string; name: string };
};
type ItemDetail = {
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
  purchaseDate: string | null;
  purchasePrice: number | null;
  store: string | null;
  createdAt: string;
  updatedAt: string;
  images: Array<{ url: string | null; filePath: string | null; isPrimary: boolean }>;
  tags: ItemTagLink[];
  customFields: CustomField[];
  grading: GradingInfo | null;
  collection: Collection;
};

type GradingInfo = { id: string; service: string; score: string; gradedAt: string | null };
type CoverResult = { url: string; label: string; source: string };

const STANDARD_GROUP_NAMES = ["Shops", "Lagerort"];

function getImageUrl(item: ItemDetail) {
  const primary = item.images.find((i) => i.isPrimary) ?? item.images[0];
  return primary?.url ?? primary?.filePath ?? null;
}

function toDateInput(val: string | null | undefined): string {
  if (!val) return "";
  try { return new Date(val).toISOString().split("T")[0]; } catch { return ""; }
}

// ── InlineEditableField ──────────────────────────────────────────────────────
function InlineEditableField({
  label, value, type = "text", options, placeholder, onSave,
}: {
  label: string;
  value: string | null | undefined;
  type?: "text" | "number" | "date" | "select" | "textarea";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  onSave: (value: string | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => { if (!focused) setDraft(value ?? ""); }, [value, focused]);

  const handleFocus = () => { setFocused(true); setSaved(false); };
  const handleBlur = async () => {
    setFocused(false);
    const nv = draft.trim() || null;
    const ov = (value ?? "").trim() || null;
    if (nv === ov) return;
    await onSave(nv);
    setSaved(true);
  };

  const cls = ["inline-field-idle", saved && !focused ? "inline-field-saved" : ""].filter(Boolean).join(" ");
  const labelEl = label ? (
    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
  ) : null;

  if (type === "select" && options) {
    return (
      <div className="space-y-1">
        {labelEl}
        <dd>
          <select className={cls} value={draft} onChange={(e) => { setDraft(e.target.value); setSaved(false); }} onFocus={handleFocus} onBlur={handleBlur}>
            <option value="">—</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </dd>
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div className="space-y-1">
        {labelEl}
        <dd>
          <textarea className={cls} value={draft} rows={3} placeholder={placeholder ?? ""} onChange={(e) => { setDraft(e.target.value); setSaved(false); }} onFocus={handleFocus} onBlur={handleBlur} />
        </dd>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {labelEl}
      <dd>
        <input type={type} className={cls} value={draft} placeholder={placeholder ?? ""} onChange={(e) => { setDraft(e.target.value); setSaved(false); }} onFocus={handleFocus} onBlur={handleBlur} />
      </dd>
    </div>
  );
}

// ── InlineYearField ──────────────────────────────────────────────────────────
function InlineYearField({ value, onSave }: { value: number | null; onSave: (v: string | null) => Promise<void> }) {
  const [draft, setDraft] = useState(value?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDraft(value?.toString() ?? ""); }, [value, focused]);
  async function handleBlur() {
    setFocused(false);
    const nv = draft.trim() || null;
    const ov = value?.toString() ?? null;
    if (nv === ov) return;
    await onSave(nv);
    setSaved(true);
  }
  return (
    <input type="number" value={draft} placeholder="Jahr"
      className={["text-sm text-muted-foreground bg-transparent inline-field-idle", saved && !focused ? "inline-field-saved" : ""].filter(Boolean).join(" ")}
      onChange={(e) => { setDraft(e.target.value); setSaved(false); }}
      onFocus={() => { setFocused(true); setSaved(false); }}
      onBlur={handleBlur}
    />
  );
}

// ── InlineTitleField ─────────────────────────────────────────────────────────
function InlineTitleField({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDraft(value); }, [value, focused]);
  async function handleBlur() {
    setFocused(false);
    if (draft.trim() && draft.trim() !== value) { await onSave(draft.trim()); setSaved(true); }
  }
  return (
    <input type="text" value={draft}
      className={["text-lg font-semibold bg-transparent w-full leading-tight inline-field-idle", saved && !focused ? "inline-field-saved" : ""].filter(Boolean).join(" ")}
      onChange={(e) => { setDraft(e.target.value); setSaved(false); }}
      onFocus={() => { setFocused(true); setSaved(false); }}
      onBlur={handleBlur}
    />
  );
}

// ── InlineDateField ───────────────────────────────────────────────────────────
function isoToDE(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}.${m}.${y}` : iso;
}
function deToISO(de: string): string | null {
  if (!de.trim()) return null;
  const parts = de.trim().split(".");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function InlineDateField({ label, value, onSave }: { label: string; value: string | null | undefined; onSave: (v: string | null) => Promise<void> }) {
  const dateRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(isoToDE(value ?? ""));
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDraft(isoToDE(value ?? "")); }, [value, focused]);
  const cls = ["inline-field-idle", saved && !focused ? "inline-field-saved" : ""].filter(Boolean).join(" ");
  async function commitSave() {
    const nv = deToISO(draft);
    const ov = (value ?? "") || null;
    if (nv === ov) return;
    await onSave(nv);
    setSaved(true);
  }
  return (
    <div className="space-y-1">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd>
        <div className="relative"
          onFocus={() => { setFocused(true); setSaved(false); }}
          onBlur={async (e) => { if (e.currentTarget.contains(e.relatedTarget as Node)) return; setFocused(false); await commitSave(); }}
        >
          <input type="text" className={`${cls} pr-8`} value={draft} placeholder="TT.MM.JJJJ" onChange={(e) => { setDraft(e.target.value); setSaved(false); }} />
          <input ref={dateRef} type="date" tabIndex={-1} value={deToISO(draft) ?? ""} onChange={(e) => { setDraft(isoToDE(e.target.value)); setSaved(false); }} className="sr-only" />
          <button type="button" tabIndex={-1} onClick={() => { try { dateRef.current?.showPicker(); } catch {} }} className="absolute right-2 inset-y-0 flex items-center text-muted-foreground hover:text-foreground transition-colors" aria-label="Datum auswählen">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </dd>
    </div>
  );
}

// ── TagGroupDropdown ──────────────────────────────────────────────────────────
function TagGroupDropdown({ group, selectedValueId, onSelect }: { group: TagGroup; selectedValueId: string | undefined; onSelect: (groupId: string, tagValueId: string | null) => Promise<void> }) {
  const [localValue, setLocalValue] = useState(selectedValueId ?? "");
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setLocalValue(selectedValueId ?? ""); }, [selectedValueId, focused]);
  const cls = ["inline-field-idle", saved && !focused ? "inline-field-saved" : ""].filter(Boolean).join(" ");
  if (group.values.length === 0) {
    return (
      <div className="space-y-1">
        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{group.name}</dt>
        <dd className="text-xs text-muted-foreground/60 italic">Keine Werte definiert — im Admin-Bereich hinzufügen.</dd>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{group.name}</dt>
      <dd>
        <select className={cls} value={localValue} onFocus={() => { setFocused(true); setSaved(false); }}
          onChange={(e) => { setLocalValue(e.target.value); setSaved(false); }}
          onBlur={async () => { setFocused(false); const nv = localValue || null; const ov = selectedValueId ?? null; if (nv === ov) return; await onSelect(group.id, nv); setSaved(true); }}
        >
          <option value="">—</option>
          {group.values.map((v) => <option key={v.id} value={v.id}>{v.value}</option>)}
        </select>
      </dd>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CONDITIONS = [
  { value: "MINT",      label: "Neu / Mint" },
  { value: "VERY_GOOD", label: "Sehr Gut" },
  { value: "GOOD",      label: "Gut" },
  { value: "USED",      label: "Gebraucht" },
  { value: "POOR",      label: "Schlecht" },
];
const ITEM_STATUSES = [
  { value: "OPENED", label: "Geöffnet" },
  { value: "SEALED", label: "Versiegelt" },
  { value: "GRADED", label: "Gegraded" },
];
const COLLECTION_STATUSES = [
  { value: "OWNED",    label: "Vorhanden" },
  { value: "WISHLIST", label: "Wunschliste" },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ItemDetailPage() {
  const { collectionId, itemId } = useParams<{ collectionId: string; itemId: string }>();
  const router = useRouter();
  const { locale } = useTranslations();

  const [item, setItem]             = useState<ItemDetail | null>(null);
  const [tagGroups, setTagGroups]   = useState<TagGroup[]>([]);
  const [loading, setLoading]       = useState(true);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [gradingEdit, setGradingEdit] = useState(false);
  const [gradingForm, setGradingForm] = useState({ service: "", score: "", gradedAt: "" });
  const [gradingSaving, setGradingSaving] = useState(false);
  const [coverResults, setCoverResults]   = useState<CoverResult[]>([]);
  const [coverLoading, setCoverLoading]   = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [itemRes, groupsRes] = await Promise.all([
      fetch(`/api/items/${itemId}`),
      fetch("/api/tags"),
    ]);
    if (itemRes.ok) setItem(await itemRes.json());
    if (groupsRes.ok) setTagGroups(await groupsRes.json());
    setLoading(false);
  }, [itemId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (item) setImageUrlDraft(getImageUrl(item) ?? ""); }, [item]);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowCoverPicker(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/items/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }

  function openGradingEdit() {
    const g = item?.grading;
    setGradingForm({
      service: g?.service ?? "",
      score:   g?.score ?? "",
      gradedAt: g?.gradedAt ? new Date(g.gradedAt).toISOString().split("T")[0] : "",
    });
    setGradingEdit(true);
  }

  async function saveGrading() {
    if (!gradingForm.service.trim() || !gradingForm.score.trim()) return;
    setGradingSaving(true);
    const res = await fetch(`/api/items/${itemId}/grading`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: gradingForm.service, score: gradingForm.score, gradedAt: gradingForm.gradedAt || null }),
    });
    if (res.ok) {
      const g: GradingInfo = await res.json();
      setItem((p) => p ? { ...p, grading: g } : p);
      setGradingEdit(false);
    }
    setGradingSaving(false);
  }

  async function deleteGrading() {
    await fetch(`/api/items/${itemId}/grading`, { method: "DELETE" });
    setItem((p) => p ? { ...p, grading: null } : p);
    setGradingEdit(false);
  }

  async function saveCoverUrl(url: string | null) {
    const next = url || null;
    setImageUrlDraft(next ?? "");
    setItem((p) => p ? { ...p, images: next ? [{ url: next, filePath: null, isPrimary: true }] : [] } : p);
    await patch({ imageUrl: next });
  }

  async function searchCovers() {
    if (!item?.title.trim()) return;
    setShowCoverPicker(true);
    setCoverLoading(true);
    setCoverResults([]);
    const p = new URLSearchParams({ title: item.title.trim(), mediaType: item.collection.category.mediaType ?? "CUSTOM" });
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
    if (res.ok) { const { url } = await res.json(); await saveCoverUrl(url); }
  }

  async function saveField(key: string, raw: string | null) {
    let value: unknown = raw;
    if (["year", "quantity"].includes(key)) value = raw ? parseInt(raw, 10) : null;
    if (key === "purchasePrice") value = raw ? parseFloat(raw) : null;
    setItem((p) => p ? { ...p, [key]: value } : p);
    await patch({ [key]: value });
  }

  async function saveCustomField(fieldId: string, value: string | null) {
    setItem((p) => {
      if (!p) return p;
      const customFields = p.customFields.map((cf) => cf.field.id === fieldId ? { ...cf, value: value ?? "" } : cf);
      return { ...p, customFields };
    });
    await patch({ customFields: [{ fieldId, value }] });
  }

  async function setGroupTag(groupId: string, tagValueId: string | null) {
    if (!item) return;
    const otherTags = item.tags.filter((t) => t.groupId !== groupId);
    const grp = tagGroups.find((g) => g.id === groupId);
    const tv = tagValueId ? grp?.values.find((v) => v.id === tagValueId) : null;
    const newTags: ItemTagLink[] = tagValueId && tv
      ? [...otherTags, { tagValueId, groupId, tagValue: { id: tagValueId, value: tv.value }, tagGroup: { id: groupId, name: grp?.name ?? "" } }]
      : otherTags;
    setItem((p) => (p ? { ...p, tags: newTags } : p));
    await patch({ tags: newTags.map((t) => ({ tagValueId: t.tagValueId, groupId: t.groupId })) });
  }

  async function toggleFavorite() {
    if (!item) return;
    const next = !item.isFavorite;
    setItem((p) => p ? { ...p, isFavorite: next } : p);
    await patch({ isFavorite: next });
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    router.push(`/collection/${collectionId}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!item) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-sm">Item nicht gefunden.</p>
        <Link href={`/collection/${collectionId}`} className="mt-3 text-xs text-primary hover:underline block">← Zurück</Link>
      </div>
    );
  }

  const category  = item.collection.category;
  const imageUrl  = getImageUrl(item);
  const shopsGroup    = tagGroups.find((g) => g.name === "Shops");
  const lagerortGroup = tagGroups.find((g) => g.name === "Lagerort");
  const assignedGroupIds = new Set(category.tagGroups.map((tg) => tg.groupId));
  const extraGroups = tagGroups.filter((g) => !STANDARD_GROUP_NAMES.includes(g.name) && assignedGroupIds.has(g.id));

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition">Sammlungen</Link>
        <span>/</span>
        <Link href={`/collection/${collectionId}`} className="hover:text-primary transition flex items-center gap-1">
          <CategoryIcon icon={category.icon} className="h-3.5 w-3.5" />
          {item.collection.name}
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{item.title}</span>
      </nav>

      {/* Main card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-0">
          {/* Cover */}
          <div className="sm:w-48 shrink-0 bg-muted flex items-center justify-center min-h-[200px] relative">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" style={{ maxHeight: 280 }} />
            ) : (
              <CategoryIcon icon={category.icon} className="h-16 w-16 opacity-20" />
            )}
            {item.condition && (
              <span className={`absolute top-2 left-2 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${CONDITION_COLORS[item.condition] ?? ""}`}>
                {CONDITION_LABELS[item.condition]}
              </span>
            )}
            <button onClick={toggleFavorite} className={`absolute top-2 right-2 text-lg transition ${item.isFavorite ? "opacity-100" : "opacity-30 hover:opacity-60"}`} title={item.isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}>
              ❤️
            </button>
          </div>

          {/* Title / Year / Actions */}
          <div className="flex-1 p-5 space-y-3">
            <div className="space-y-1">
              <InlineTitleField value={item.title} onSave={(v) => saveField("title", v)} />
              <InlineYearField value={item.year} onSave={(v) => saveField("year", v)} />
            </div>
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.tags.map((t) => (
                  <span key={t.tagValueId} className="rounded-full bg-muted border border-border text-muted-foreground px-2 py-0.5 text-[10px]">
                    {t.tagValue.value || "…"}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => setConfirmDel(true)} className="flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition">
                Löschen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cover management */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Cover</p>
        <div className="flex gap-3 items-start">
          <div ref={pickerRef} className="relative shrink-0">
            <button type="button" onClick={searchCovers} title="Klicken zum Cover suchen"
              className="group relative w-16 h-20 rounded border border-border bg-muted flex items-center justify-center overflow-hidden hover:border-primary transition"
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <CategoryIcon icon={category.icon} className="h-8 w-8 opacity-20" />
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
                        <button key={i} type="button" title={r.label} onClick={() => { saveCoverUrl(r.url); setShowCoverPicker(false); }}
                          className="group relative aspect-[3/4] rounded overflow-hidden border border-border hover:border-primary transition"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.url} alt={r.label} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} />
                          <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground text-right">Quelle: {[...new Set(coverResults.map((r) => r.source))].join(", ")}</p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <input type="url" value={imageUrlDraft} onChange={(e) => setImageUrlDraft(e.target.value)} onBlur={() => { if ((imageUrlDraft || null) !== (imageUrl || null)) saveCoverUrl(imageUrlDraft || null); }} className="retro-field w-full" placeholder="https://… (Cover-URL)" />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition disabled:opacity-50">
                {uploading ? "Lädt hoch…" : "↑ Datei hochladen"}
              </button>
              <button type="button" onClick={searchCovers} className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition">
                🔍 Suchen
              </button>
              {imageUrl && <button type="button" onClick={() => saveCoverUrl(null)} className="text-xs text-destructive hover:underline">Entfernen</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">Allgemein</h3>
          <dl className="space-y-3">
            <InlineEditableField label="Zustand" value={item.condition ?? ""} type="select" options={CONDITIONS} onSave={(v) => saveField("condition", v)} />
            <InlineEditableField label="Status" value={item.itemStatus ?? ""} type="select" options={ITEM_STATUSES} onSave={(v) => saveField("itemStatus", v)} />
            <InlineEditableField label="Sammlung" value={item.collectionStatus} type="select" options={COLLECTION_STATUSES} onSave={(v) => saveField("collectionStatus", v ?? "OWNED")} />
            <InlineEditableField label="Anzahl" value={item.quantity.toString()} type="number" onSave={(v) => saveField("quantity", v ?? "1")} />
            <InlineEditableField label="Barcode (EAN)" value={item.barcode} onSave={(v) => saveField("barcode", v)} />
            <InlineEditableField label="Lagerort" value={item.location ?? ""} type="select" options={lagerortGroup?.values.map((v) => ({ value: v.value, label: v.value })) ?? []} onSave={(v) => saveField("location", v)} />
            <InlineEditableField label="Beschreibung" value={item.description} type="textarea" onSave={(v) => saveField("description", v)} />
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">Kauf</h3>
          <dl className="space-y-3">
            <InlineEditableField label="Kaufpreis (€)" value={item.purchasePrice != null ? item.purchasePrice.toString().replace(".", ",") : ""} type="text" placeholder="0,00" onSave={(v) => saveField("purchasePrice", v ? v.replace(",", ".") : null)} />
            <InlineDateField label="Kaufdatum" value={toDateInput(item.purchaseDate)} onSave={(v) => saveField("purchaseDate", v)} />
            <InlineEditableField label="Gekauft bei" value={item.store ?? ""} type="select" options={shopsGroup?.values.map((v) => ({ value: v.value, label: v.value })) ?? []} onSave={(v) => saveField("store", v)} />
          </dl>
        </div>

        {category.fields.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest flex items-center gap-1.5">
              <CategoryIcon icon={category.icon} className="h-4 w-4" />
              {category.name}
            </h3>
            <dl className="space-y-3">
              {category.fields.map((f) => {
                const cf = item.customFields.find((c) => c.field.id === f.id);
                const val = cf?.value ?? "";
                if (f.fieldType === "SELECT") return <InlineEditableField key={f.id} label={f.name} value={val} type="select" options={f.options.map((o) => ({ value: o, label: o }))} onSave={(v) => saveCustomField(f.id, v)} />;
                if (f.fieldType === "TEXTAREA") return <InlineEditableField key={f.id} label={f.name} value={val} type="textarea" onSave={(v) => saveCustomField(f.id, v)} />;
                if (f.fieldType === "NUMBER") return <InlineEditableField key={f.id} label={f.name} value={val} type="number" onSave={(v) => saveCustomField(f.id, v)} />;
                if (f.fieldType === "DATE") return <InlineDateField key={f.id} label={f.name} value={val} onSave={(v) => saveCustomField(f.id, v)} />;
                return <InlineEditableField key={f.id} label={f.name} value={val} onSave={(v) => saveCustomField(f.id, v)} />;
              })}
            </dl>
          </div>
        )}

        {/* Grading */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">Grading</h3>
            {!gradingEdit && (
              <button onClick={openGradingEdit} className="text-[10px] text-muted-foreground hover:text-primary transition">
                {item.grading ? "Bearbeiten" : "+ Hinzufügen"}
              </button>
            )}
          </div>

          {!gradingEdit && !item.grading && (
            <p className="text-xs text-muted-foreground/60">Kein Grading eingetragen.</p>
          )}

          {!gradingEdit && item.grading && (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Service</dt>
                <dd className="font-medium text-foreground">{item.grading.service}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</dt>
                <dd className="font-medium text-primary neon-glow">{item.grading.score}</dd>
              </div>
              {item.grading.gradedAt && (
                <div className="flex justify-between">
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Datum</dt>
                  <dd className="text-muted-foreground">{formatDate(item.grading.gradedAt, locale)}</dd>
                </div>
              )}
            </dl>
          )}

          {gradingEdit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Service</label>
                  <input
                    type="text"
                    value={gradingForm.service}
                    onChange={(e) => setGradingForm((f) => ({ ...f, service: e.target.value }))}
                    className="retro-field w-full text-xs"
                    placeholder="VGA, WATA, CGC…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</label>
                  <input
                    type="text"
                    value={gradingForm.score}
                    onChange={(e) => setGradingForm((f) => ({ ...f, score: e.target.value }))}
                    className="retro-field w-full text-xs"
                    placeholder="85+, 9.0 A+…"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Datum (optional)</label>
                <input
                  type="date"
                  value={gradingForm.gradedAt}
                  onChange={(e) => setGradingForm((f) => ({ ...f, gradedAt: e.target.value }))}
                  className="retro-field w-full text-xs"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveGrading}
                  disabled={gradingSaving || !gradingForm.service.trim() || !gradingForm.score.trim()}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50 transition hover:opacity-90"
                >
                  {gradingSaving ? "Speichern…" : "Speichern"}
                </button>
                <button onClick={() => setGradingEdit(false)} className="text-xs text-muted-foreground hover:text-foreground transition">Abbrechen</button>
                {item.grading && (
                  <button onClick={deleteGrading} className="ml-auto text-xs text-destructive hover:underline">Entfernen</button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">Notizen</h3>
          <InlineEditableField label="" value={item.notes} type="textarea" placeholder="Notizen…" onSave={(v) => saveField("notes", v)} />
        </div>

        {extraGroups.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">Weitere Details</h3>
            <dl className="space-y-4">
              {extraGroups.map((group) => (
                <TagGroupDropdown key={group.id} group={group} selectedValueId={item.tags.find((t) => t.groupId === group.id)?.tagValueId} onSelect={setGroupTag} />
              ))}
            </dl>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground/60 flex gap-4">
        <span>Erstellt: {formatDate(item.createdAt, locale)}</span>
        <span>Aktualisiert: {formatDate(item.updatedAt, locale)}</span>
      </div>

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive text-sm">⚠</span>
              <h3 className="font-heading text-[10px] text-destructive uppercase tracking-widest">Danger Zone</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">„{item.title}"</span> wird dauerhaft und unwiderruflich gelöscht.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(false)} className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition">Abbrechen</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 rounded-md bg-destructive px-3 py-2 text-xs font-medium text-white uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition">
                {deleting ? "Lösche…" : "Dauerhaft löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
