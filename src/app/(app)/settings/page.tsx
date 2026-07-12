"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CategoryIcon, ICON_NAMES, ICON_LABELS } from "@/components/ui/CategoryIcon";
import { useTranslations } from "@/components/LanguageProvider";
import type { Translations } from "@/lib/i18n";

// ── Types ──────────────────────────────────────────────────────────────────────
type Field = { id: string; name: string; fieldKey: string; fieldType: string; options: string[]; required: boolean; order: number };
type CollectionTagGroupEntry = { groupId: string; showInView: boolean; group: { id: string; name: string } };
type Collection = { id: string; name: string; icon: string | null; mediaType: string; gradingEnabled: boolean; customMediaTypeLabel: string | null; order: number; fields: Field[]; tagGroups: CollectionTagGroupEntry[]; _count: { items: number } };
type TagValue = { id: string; value: string; order: number };
type TagGroup = { id: string; name: string; color: string; order: number; isSystem: boolean; values: TagValue[] };
type TagGroupOption = { id: string; name: string };

const MEDIA_TYPE_VALUES = ["GAME", "MUSIC", "FILM", "SERIE", "BOOK", "COMIC", "MANGA", "CONSOLE", "CUSTOM"] as const;
type MediaTypeValue = (typeof MEDIA_TYPE_VALUES)[number];
const FIELD_TYPE_VALUES = ["TEXT", "TEXTAREA", "NUMBER", "DATE", "SELECT", "BOOLEAN"] as const;
type FieldTypeValue = (typeof FIELD_TYPE_VALUES)[number];

function mediaTypeLabel(t: Translations, value: string): string {
  return t.collections.mediaTypes[value as MediaTypeValue] ?? value;
}
function fieldTypeLabel(t: Translations, value: string): string {
  return t.collections.fieldTypes[value as FieldTypeValue] ?? value;
}

// ── Shared sub-components ──────────────────────────────────────────────────────
function DragHandleDots(props: React.HTMLAttributes<SVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 w-full retro-field text-sm justify-between ${open ? "border-primary" : ""}`}>
        <span className="flex items-center gap-2">
          <CategoryIcon icon={value || "box"} className="h-5 w-5" />
          <span className="text-xs text-muted-foreground">{ICON_LABELS[value] || value || t.collections.iconPlaceholder}</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-muted-foreground ml-auto" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-72 rounded-xl border border-border bg-card shadow-2xl p-3">
          <div className="grid grid-cols-5 gap-1.5 max-h-56 overflow-y-auto">
            {ICON_NAMES.map((name) => (
              <button key={name} type="button" onClick={() => { onChange(name); setOpen(false); }}
                title={ICON_LABELS[name] || name}
                className={`flex flex-col items-center gap-1 rounded-md p-2 hover:bg-primary/10 transition ${value === name ? "bg-primary/20 ring-1 ring-primary" : ""}`}>
                <CategoryIcon icon={name} className="h-5 w-5" />
                <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-tight">{ICON_LABELS[name] || name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLECTIONS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function SortableCollection({ col, expanded, onExpand, onDelete, onReload, onRename, allTagGroups, onAssignTagGroup, onRemoveTagGroup, onToggleTagGroupVisibility, onToggleGrading }: {
  col: Collection; expanded: boolean; onExpand: () => void; onDelete: () => void; onReload: () => void;
  onRename: (id: string, name: string) => void; allTagGroups: TagGroupOption[];
  onAssignTagGroup: (colId: string, groupId: string) => Promise<void>;
  onRemoveTagGroup: (colId: string, groupId: string) => Promise<void>;
  onToggleTagGroupVisibility: (colId: string, groupId: string) => Promise<void>;
  onToggleGrading: (colId: string) => Promise<void>;
}) {
  const { t } = useTranslations();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(col.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function startEditName(e: React.MouseEvent) { e.stopPropagation(); setNameDraft(col.name); setEditingName(true); setTimeout(() => nameInputRef.current?.select(), 0); }
  function confirmName() { if (nameDraft.trim() && nameDraft.trim() !== col.name) onRename(col.id, nameDraft.trim()); setEditingName(false); }

  const [showAdd, setShowAdd] = useState(false);
  const [fieldForm, setFieldForm] = useState({ name: "", fieldKey: "", fieldType: "TEXT", options: "", required: false });
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmitField(e: React.FormEvent) {
    e.preventDefault(); setFieldError(""); setSubmitting(true);
    const body = { name: fieldForm.name, fieldKey: fieldForm.fieldKey, fieldType: fieldForm.fieldType, required: fieldForm.required,
      options: fieldForm.fieldType === "SELECT" ? fieldForm.options.split(",").map((o) => o.trim()).filter(Boolean) : [] };
    const res = await fetch(`/api/collections/${col.id}/fields`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSubmitting(false);
    if (!res.ok) { setFieldError((await res.json()).error ?? t.collections.fieldError); return; }
    onReload(); setShowAdd(false); setFieldForm({ name: "", fieldKey: "", fieldType: "TEXT", options: "", required: false });
  }

  async function handleDeleteField(fieldId: string) {
    await fetch(`/api/collections/${col.id}/fields/${fieldId}`, { method: "DELETE" });
    onReload();
  }

  const assignedGroupIds = new Set(col.tagGroups.map((tg) => tg.groupId));
  const unassignedGroups = allTagGroups.filter((g) => !assignedGroupIds.has(g.id));

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-3 cursor-pointer hover:bg-muted/20 transition-colors select-none" onClick={() => !editingName && onExpand()}>
        <DragHandleDots {...attributes} {...listeners} className="shrink-0 cursor-grab text-muted-foreground hover:text-primary transition active:cursor-grabbing touch-none" />
        <CategoryIcon icon={col.icon} className="h-4 w-4 shrink-0 text-foreground" />
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input ref={nameInputRef} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onBlur={confirmName}
              onKeyDown={(e) => { if (e.key === "Enter") confirmName(); if (e.key === "Escape") { setEditingName(false); setNameDraft(col.name); } }}
              onClick={(e) => e.stopPropagation()} className="retro-field py-0.5 px-1.5 text-sm font-medium w-full max-w-xs" autoFocus />
          ) : (
            <div>
              <p className="text-sm font-medium text-foreground">{col.name}</p>
              <p className="text-xs text-muted-foreground">{mediaTypeLabel(t, col.mediaType)} · {col.fields.length} {t.collections.fieldsSuffix} · {col._count.items} {t.collections.entriesSuffix}</p>
            </div>
          )}
        </div>
        <button onClick={startEditName} className="text-[10px] text-muted-foreground hover:text-foreground transition px-1.5 py-0.5 rounded shrink-0" title={t.collections.rename}>✎</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[10px] text-destructive/50 hover:text-destructive transition px-1.5 py-0.5 rounded shrink-0" title={t.collections.delete}>✕</button>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 pb-4 pt-3 space-y-4">
          {/* Fields */}
          <div className="border-t border-border/50 pt-3 space-y-3">
            <p className="font-heading text-[10px] text-primary uppercase tracking-widest">{t.collections.fields}</p>
            {col.fields.length === 0 ? <p className="text-xs text-muted-foreground">{t.collections.noFields}</p> : (
              <div className="space-y-1.5">
                {col.fields.map((field) => (
                  <div key={field.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground">{field.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-mono">{field.fieldKey}</span>
                      <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{fieldTypeLabel(t, field.fieldType)}</span>
                      {field.required && <span className="ml-1 text-[10px] text-orange-400">{t.collections.required}</span>}
                    </div>
                    <button onClick={() => handleDeleteField(field.id)} className="text-[10px] text-destructive/60 hover:text-destructive transition">✕</button>
                  </div>
                ))}
              </div>
            )}
            {showAdd ? (
              <form onSubmit={handleSubmitField} className="space-y-3 pt-2 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.collections.newField}</p>
                <div className="grid grid-cols-2 gap-2">
                  <input required placeholder={t.collections.fieldNamePlaceholder} value={fieldForm.name} onChange={(e) => setFieldForm((f) => ({ ...f, name: e.target.value }))} className="retro-field col-span-2" />
                  <input required placeholder={t.collections.fieldKeyPlaceholder} value={fieldForm.fieldKey} onChange={(e) => setFieldForm((f) => ({ ...f, fieldKey: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} className="retro-field font-mono" />
                  <select value={fieldForm.fieldType} onChange={(e) => setFieldForm((f) => ({ ...f, fieldType: e.target.value }))} className="retro-field">
                    {FIELD_TYPE_VALUES.map((v) => <option key={v} value={v}>{fieldTypeLabel(t, v)}</option>)}
                  </select>
                  {fieldForm.fieldType === "SELECT" && (
                    <input placeholder={t.collections.fieldOptionsPlaceholder} value={fieldForm.options} onChange={(e) => setFieldForm((f) => ({ ...f, options: e.target.value }))} className="retro-field col-span-2" />
                  )}
                  <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={fieldForm.required} onChange={(e) => setFieldForm((f) => ({ ...f, required: e.target.checked }))} className="rounded" />
                    {t.collections.required}
                  </label>
                </div>
                {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowAdd(false); setFieldError(""); setFieldForm({ name: "", fieldKey: "", fieldType: "TEXT", options: "", required: false }); }}
                    className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition">{t.common.cancel}</button>
                  <button type="submit" disabled={submitting} className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground uppercase hover:opacity-90 disabled:opacity-50 transition">
                    {submitting ? "…" : t.collections.addField}</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition">{t.collections.addFieldShort}</button>
            )}
          </div>

          {/* Tag-Gruppen */}
          <div className="border-t border-border/50 pt-3 space-y-3">
            <p className="font-heading text-[10px] text-primary uppercase tracking-widest">{t.collections.tagGroups}</p>
            {col.tagGroups.length === 0 && <p className="text-xs text-muted-foreground">{t.collections.noTagGroups}</p>}
            {col.tagGroups.map((tg) => (
              <div key={tg.groupId} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <span className="flex-1 text-sm text-foreground">{tg.group.name}</span>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={tg.showInView} onChange={() => onToggleTagGroupVisibility(col.id, tg.groupId)} className="rounded" />
                  {t.collections.dashboard}
                </label>
                <button onClick={() => onRemoveTagGroup(col.id, tg.groupId)} className="text-[10px] text-destructive/60 hover:text-destructive transition">✕</button>
              </div>
            ))}
            {unassignedGroups.length > 0 && (
              <select value="" onChange={(e) => { if (e.target.value) onAssignTagGroup(col.id, e.target.value); }} className="retro-field text-xs">
                <option value="">{t.collections.addTagGroup}</option>
                {unassignedGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
          </div>

          {/* Grading */}
          <div className="border-t border-border/50 pt-3 space-y-3">
            <p className="font-heading text-[10px] text-primary uppercase tracking-widest">{t.collections.grading}</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={col.gradingEnabled ?? false} onChange={() => onToggleGrading(col.id)} className="rounded" />
              <span className="text-sm text-foreground">{t.collections.gradingLabel}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function CollectionsTab() {
  const { t } = useTranslations();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allTagGroups, setAllTagGroups] = useState<TagGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [colForm, setColForm] = useState({ name: "", icon: "gamepad", mediaType: "GAME", customMediaTypeLabel: "" });
  const [colError, setColError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [deleting, setDeleting] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = useCallback(async () => {
    setLoading(true);
    const [colRes, tagsRes] = await Promise.all([fetch("/api/collections"), fetch("/api/tags")]);
    if (colRes.ok) setCollections(await colRes.json());
    if (tagsRes.ok) { const groups: Array<{ id: string; name: string }> = await tagsRes.json(); setAllTagGroups(groups.map((g) => ({ id: g.id, name: g.name }))); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = collections.findIndex((c) => c.id === active.id);
    const newIndex = collections.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(collections, oldIndex, newIndex);
    setCollections(reordered);
    await fetch("/api/collections/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: reordered.map((c) => c.id) }) });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setColError(""); setSubmitting(true);
    const res = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: colForm.name, icon: colForm.icon, mediaType: colForm.mediaType, customMediaTypeLabel: colForm.mediaType === "CUSTOM" ? colForm.customMediaTypeLabel : null }) });
    setSubmitting(false);
    if (!res.ok) { setColError((await res.json()).error ?? t.collections.fieldError); return; }
    await load(); setShowCreate(false); setColForm({ name: "", icon: "gamepad", mediaType: "GAME", customMediaTypeLabel: "" });
  }

  async function handleRename(id: string, name: string) {
    const res = await fetch(`/api/collections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (res.ok) setCollections((prev) => prev.map((c) => c.id === id ? { ...c, name } : c));
  }

  async function handleDelete() {
    if (!deleteTarget) return; setDeleting(true);
    await fetch(`/api/collections/${deleteTarget.id}`, { method: "DELETE" });
    setCollections((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null); setDeleting(false);
  }

  async function handleAssignTagGroup(colId: string, groupId: string) {
    const res = await fetch(`/api/collections/${colId}/tag-groups`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId }) });
    if (!res.ok) return;
    const assignment: { groupId: string; showInView: boolean; group: { id: string; name: string } } = await res.json();
    setCollections((prev) => prev.map((c) => c.id === colId ? { ...c, tagGroups: [...c.tagGroups, { groupId: assignment.groupId, showInView: assignment.showInView, group: assignment.group }] } : c));
  }

  async function handleRemoveTagGroup(colId: string, groupId: string) {
    const res = await fetch(`/api/collections/${colId}/tag-groups/${groupId}`, { method: "DELETE" });
    if (!res.ok) return;
    setCollections((prev) => prev.map((c) => c.id === colId ? { ...c, tagGroups: c.tagGroups.filter((tg) => tg.groupId !== groupId) } : c));
  }

  async function handleToggleTagGroupVisibility(colId: string, groupId: string) {
    setCollections((prev) => prev.map((c) => c.id === colId ? { ...c, tagGroups: c.tagGroups.map((tg) => tg.groupId === groupId ? { ...tg, showInView: !tg.showInView } : tg) } : c));
    const res = await fetch(`/api/collections/${colId}/tag-groups/${groupId}`, { method: "PATCH" });
    if (!res.ok) setCollections((prev) => prev.map((c) => c.id === colId ? { ...c, tagGroups: c.tagGroups.map((tg) => tg.groupId === groupId ? { ...tg, showInView: !tg.showInView } : tg) } : c));
  }

  async function handleToggleGrading(colId: string) {
    const col = collections.find((c) => c.id === colId); if (!col) return;
    const next = !col.gradingEnabled;
    setCollections((prev) => prev.map((c) => c.id === colId ? { ...c, gradingEnabled: next } : c));
    const res = await fetch(`/api/collections/${colId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gradingEnabled: next }) });
    if (!res.ok) setCollections((prev) => prev.map((c) => c.id === colId ? { ...c, gradingEnabled: !next } : c));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t.userSettings.collectionsHint}</p>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90">
          + {t.collections.newCollection}
        </button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">{t.collections.loading}</p>
        : collections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">{t.collections.empty}</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={collections.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {collections.map((col) => (
                  <SortableCollection key={col.id} col={col} expanded={expanded === col.id} onExpand={() => setExpanded(expanded === col.id ? null : col.id)}
                    onDelete={() => setDeleteTarget(col)} onReload={load} onRename={handleRename} allTagGroups={allTagGroups}
                    onAssignTagGroup={handleAssignTagGroup} onRemoveTagGroup={handleRemoveTagGroup}
                    onToggleTagGroupVisibility={handleToggleTagGroupVisibility} onToggleGrading={handleToggleGrading} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">{t.collections.newCollection}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.collections.name}</label>
                <input required value={colForm.name} onChange={(e) => setColForm((f) => ({ ...f, name: e.target.value }))} className="retro-field w-full" placeholder={t.collections.namePlaceholder} autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.collections.icon}</label>
                <IconPicker value={colForm.icon} onChange={(v) => setColForm((f) => ({ ...f, icon: v }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.collections.mediaType}</label>
                <select value={colForm.mediaType} onChange={(e) => setColForm((f) => ({ ...f, mediaType: e.target.value }))} className="retro-field w-full">
                  {MEDIA_TYPE_VALUES.map((v) => <option key={v} value={v}>{mediaTypeLabel(t, v)}</option>)}
                </select>
              </div>
              {colForm.mediaType === "CUSTOM" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.collections.customMediaTypeLabel}</label>
                  <input required value={colForm.customMediaTypeLabel} onChange={(e) => setColForm((f) => ({ ...f, customMediaTypeLabel: e.target.value }))} className="retro-field w-full" placeholder={t.collections.customMediaTypePlaceholder} />
                  <p className="text-[10px] text-muted-foreground">{t.collections.customMediaTypeHint}</p>
                </div>
              )}
              {colError && <p className="text-xs text-destructive">{colError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowCreate(false); setColError(""); }} className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition">{t.common.cancel}</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition">
                  {submitting ? t.collections.creating : t.common.create}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive text-sm">⚠</span>
              <h3 className="font-heading text-[10px] text-destructive uppercase tracking-widest">{t.common.dangerZone}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.collections.deletePrompt} <span className="font-medium text-foreground">„{deleteTarget.name}"</span> {t.collections.deletePromptSuffix}{" "}
              {deleteTarget._count.items > 0 && <span className="text-destructive">{t.collections.deleteWarningPrefix} {deleteTarget._count.items} {deleteTarget._count.items === 1 ? t.collections.deleteWarningOne : t.collections.deleteWarningMany}</span>}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition">{t.common.cancel}</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 rounded-md bg-destructive px-3 py-2 text-xs font-medium text-white uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition">
                {deleting ? t.collections.deleting : t.common.permDelete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAGS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function SortableValue({ tagValue, groupId, onDelete, onRename, t }: {
  tagValue: TagValue; groupId: string; onDelete: (groupId: string, valueId: string) => void;
  onRename: (groupId: string, valueId: string, newValue: string) => void; t: Translations;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tagValue.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tagValue.value);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() { setDraft(tagValue.value); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); }
  function confirmEdit() { if (draft.trim() && draft.trim() !== tagValue.value) onRename(groupId, tagValue.id, draft.trim()); setEditing(false); }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 group/value py-1 px-2 rounded hover:bg-muted/30 transition-colors">
      <span {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition px-1 touch-none select-none">⣿</span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={confirmEdit}
            onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") { setEditing(false); setDraft(tagValue.value); } }}
            className="retro-field py-0.5 px-1.5 text-xs w-full" autoFocus />
        ) : (
          <span className="text-sm text-foreground cursor-pointer hover:text-primary transition-colors" onClick={startEdit}>{tagValue.value}</span>
        )}
      </div>
      <button onClick={() => onDelete(groupId, tagValue.id)} className="opacity-0 group-hover/value:opacity-100 text-[10px] text-destructive/60 hover:text-destructive transition ml-1 shrink-0">✕</button>
    </div>
  );
}

function AddValueRow({ groupId, onAdd, t }: { groupId: string; onAdd: (groupId: string, value: string) => Promise<void>; t: Translations }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!draft.trim()) return; setBusy(true);
    await onAdd(groupId, draft.trim()); setDraft(""); setBusy(false);
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-2 mt-2 px-2">
      <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.adminTags.newValuePlaceholder}
        className="retro-field flex-1 py-1 px-2 text-xs" disabled={busy} />
      <button type="submit" disabled={!draft.trim() || busy}
        className="shrink-0 rounded-md bg-primary/80 px-3 py-1 text-[11px] font-medium text-primary-foreground uppercase tracking-wider hover:bg-primary disabled:opacity-40 transition">
        {t.adminTags.addValue}
      </button>
    </form>
  );
}

function SortableTagGroup({ group, isOpen, onToggle, onAddValue, onDeleteValue, onRenameValue, onReorderValues, onRenameGroup, onDeleteGroup, onColorChange, t }: {
  group: TagGroup; isOpen: boolean; onToggle: (id: string) => void;
  onAddValue: (groupId: string, value: string) => Promise<void>;
  onDeleteValue: (groupId: string, valueId: string) => void;
  onRenameValue: (groupId: string, valueId: string, newValue: string) => void;
  onReorderValues: (groupId: string, newOrder: TagValue[]) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onColorChange: (groupId: string, color: string) => void;
  t: Translations;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(group.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function startEditName(e: React.MouseEvent) { e.stopPropagation(); setNameDraft(group.name); setEditingName(true); setTimeout(() => nameInputRef.current?.select(), 0); }
  function confirmName() { if (nameDraft.trim() && nameDraft.trim() !== group.name) onRenameGroup(group.id, nameDraft.trim()); setEditingName(false); }

  const innerSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleValueDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = group.values.findIndex((v) => v.id === active.id);
    const newIndex = group.values.findIndex((v) => v.id === over.id);
    onReorderValues(group.id, arrayMove(group.values, oldIndex, newIndex));
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-3 cursor-pointer hover:bg-muted/20 transition-colors select-none" onClick={() => !editingName && onToggle(group.id)}>
        {group.isSystem
          ? <span className="px-1 text-muted-foreground/30 shrink-0 select-none" title={t.adminTags.systemGroup}>🔒</span>
          : <span {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition px-1 touch-none select-none">⣿</span>
        }
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input ref={nameInputRef} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onBlur={confirmName}
              onKeyDown={(e) => { if (e.key === "Enter") confirmName(); if (e.key === "Escape") { setEditingName(false); setNameDraft(group.name); } }}
              onClick={(e) => e.stopPropagation()} className="retro-field py-0.5 px-1.5 text-sm font-medium w-full max-w-xs" autoFocus />
          ) : (
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
              style={{ borderColor: `${group.color}50`, backgroundColor: `${group.color}18`, color: group.color }}>
              {group.name}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground mr-1 shrink-0">{group.values.length} {group.values.length === 1 ? t.adminTags.value : t.adminTags.values}</span>
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <input type="color" value={group.color} onChange={(e) => onColorChange(group.id, e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
          <div className="h-5 w-5 rounded-full border-2 border-white/20" style={{ backgroundColor: group.color }} />
        </div>
        {!group.isSystem && <>
          <button onClick={startEditName} className="text-[10px] text-muted-foreground hover:text-foreground transition px-1.5 py-0.5 rounded shrink-0">✎</button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }} className="text-[10px] text-destructive/50 hover:text-destructive transition px-1.5 py-0.5 rounded shrink-0">✕</button>
        </>}
      </div>

      {isOpen && (
        <div className="border-t border-border bg-background/40 pb-3">
          {group.values.length === 0 ? <p className="px-4 py-3 text-xs text-muted-foreground italic">{t.adminTags.noValues}</p> : (
            <DndContext sensors={innerSensors} collisionDetection={closestCenter} onDragEnd={handleValueDragEnd}>
              <SortableContext items={group.values.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                <div className="pt-1">
                  {group.values.map((v) => <SortableValue key={v.id} tagValue={v} groupId={group.id} onDelete={onDeleteValue} onRename={onRenameValue} t={t} />)}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <AddValueRow groupId={group.id} onAdd={onAddValue} t={t} />
        </div>
      )}
    </div>
  );
}

function TagsTab() {
  const { t } = useTranslations();
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "group"; group: TagGroup } | { type: "value"; group: TagGroup; value: TagValue } | null>(null);
  const outerSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const colorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/tags");
    if (res.ok) setGroups(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleGroup(id: string) { setOpenGroups((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault(); setCreateError(""); if (!newGroupName.trim()) return; setCreating(true);
    const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newGroupName.trim() }) });
    setCreating(false);
    if (!res.ok) { setCreateError((await res.json()).error ?? t.common.error); return; }
    const newGroup: TagGroup = await res.json();
    setGroups((prev) => [...prev, newGroup]); setOpenGroups((prev) => new Set([...prev, newGroup.id]));
    setNewGroupName(""); setShowCreateGroup(false);
  }

  function handleColorChange(groupId: string, color: string) {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, color } : g));
    if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
    colorTimerRef.current = setTimeout(() => {
      fetch(`/api/tags/${groupId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ color }) });
    }, 300);
  }

  async function handleRenameGroup(groupId: string, name: string) {
    const res = await fetch(`/api/tags/${groupId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (res.ok) { const updated: TagGroup = await res.json(); setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, name: updated.name } : g)); }
  }

  async function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    const reordered = arrayMove(groups, oldIndex, newIndex);
    setGroups(reordered);
    await fetch("/api/tags", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: reordered.map((g) => g.id) }) });
  }

  async function handleAddValue(groupId: string, value: string) {
    const res = await fetch(`/api/tags/${groupId}/values`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) });
    if (res.ok) { const newValue: TagValue = await res.json(); setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, values: [...g.values, newValue] } : g)); }
  }

  async function handleRenameValue(groupId: string, valueId: string, newValue: string) {
    const res = await fetch(`/api/tags/${groupId}/values/${valueId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: newValue }) });
    if (res.ok) { const updated: TagValue = await res.json(); setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, values: g.values.map((v) => v.id === valueId ? updated : v) } : g)); }
  }

  async function handleReorderValues(groupId: string, newOrder: TagValue[]) {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, values: newOrder } : g));
    await fetch(`/api/tags/${groupId}/values`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: newOrder.map((v) => v.id) }) });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "group") {
      await fetch(`/api/tags/${deleteTarget.group.id}`, { method: "DELETE" });
      setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.group.id));
    } else {
      await fetch(`/api/tags/${deleteTarget.group.id}/values/${deleteTarget.value.id}`, { method: "DELETE" });
      setGroups((prev) => prev.map((g) => g.id === deleteTarget.group.id ? { ...g, values: g.values.filter((v) => v.id !== deleteTarget.value.id) } : g));
    }
    setDeleteTarget(null);
  }

  function requestDeleteGroup(groupId: string) { const group = groups.find((g) => g.id === groupId); if (group) setDeleteTarget({ type: "group", group }); }
  function requestDeleteValue(groupId: string, valueId: string) { const group = groups.find((g) => g.id === groupId); const value = group?.values.find((v) => v.id === valueId); if (group && value) setDeleteTarget({ type: "value", group, value }); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t.userSettings.tagsHint}</p>
        <button onClick={() => { setShowCreateGroup(true); setNewGroupName(""); setCreateError(""); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90 shrink-0">
          {t.adminTags.newGroup}
        </button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">{t.common.loading}</p>
        : groups.length === 0 ? (
          <div className="rounded-lg border border-border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">{t.adminTags.empty}</p>
          </div>
        ) : (
          <DndContext sensors={outerSensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
            <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {groups.map((group) => (
                  <SortableTagGroup key={group.id} group={group} isOpen={openGroups.has(group.id)} onToggle={toggleGroup}
                    onAddValue={handleAddValue} onDeleteValue={requestDeleteValue} onRenameValue={handleRenameValue}
                    onReorderValues={handleReorderValues} onRenameGroup={handleRenameGroup} onDeleteGroup={requestDeleteGroup}
                    onColorChange={handleColorChange} t={t} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">{t.adminTags.createTitle}</h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.adminTags.nameRequired}</label>
                <input required autoFocus value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="retro-field w-full" placeholder={t.adminTags.groupNamePlaceholder} />
              </div>
              {createError && <p className="text-xs text-destructive">{createError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowCreateGroup(false); setCreateError(""); }} className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition">{t.common.cancel}</button>
                <button type="submit" disabled={creating} className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition">
                  {creating ? "…" : t.common.create}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive text-sm">⚠</span>
              <h3 className="font-heading text-[10px] text-destructive uppercase tracking-widest">{t.common.dangerZone}</h3>
            </div>
            {deleteTarget.type === "group" ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">„{deleteTarget.group.name}"</span> {t.adminTags.deleteGroupText}{" "}
                <span className="font-medium text-foreground">{deleteTarget.group.values.length} {t.adminTags.values}</span> {t.adminTags.deleteGroupValues}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">„{deleteTarget.value.value}"</span> {t.adminTags.deleteValueRemoved}{" "}
                <span className="font-medium text-foreground">„{deleteTarget.group.name}"</span> {t.adminTags.deleteValueRemovedSuffix}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition">{t.common.cancel}</button>
              <button onClick={confirmDelete} className="flex-1 rounded-md bg-destructive px-3 py-2 text-xs font-medium text-white uppercase tracking-wider hover:opacity-90 transition">{t.common.delete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

type Tab = "collections" | "tags";

export default function SettingsPage() {
  const { t } = useTranslations();
  const [activeTab, setActiveTab] = useState<Tab>("collections");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">{t.userSettings.title}</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted p-1 w-fit">
          {(["collections", "tags"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "collections" ? t.userSettings.tabCollections : t.userSettings.tabTags}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "collections" ? <CollectionsTab /> : <TagsTab />}
      </div>
    </div>
  );
}
