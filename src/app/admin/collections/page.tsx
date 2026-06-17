"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CategoryIcon, ICON_NAMES, ICON_LABELS } from "@/components/ui/CategoryIcon";

type Field = {
  id: string;
  name: string;
  fieldKey: string;
  fieldType: string;
  options: string[];
  required: boolean;
  order: number;
};

type CollectionTagGroupAdmin = {
  groupId: string;
  showInView: boolean;
  group: { id: string; name: string };
};

type Collection = {
  id: string;
  name: string;
  icon: string | null;
  mediaType: string;
  gradingEnabled: boolean;
  customMediaTypeLabel: string | null;
  order: number;
  fields: Field[];
  tagGroups: CollectionTagGroupAdmin[];
  _count: { items: number };
};

type TagGroupOption = { id: string; name: string };

const MEDIA_TYPES = [
  { value: "GAME",    label: "Spiele" },
  { value: "MUSIC",   label: "Musik" },
  { value: "FILM",    label: "Filme" },
  { value: "SERIE",   label: "Serien" },
  { value: "BOOK",    label: "Bücher" },
  { value: "COMIC",   label: "Comics" },
  { value: "MANGA",   label: "Manga" },
  { value: "CONSOLE", label: "Konsolen" },
];

const FIELD_TYPES = [
  { value: "TEXT",     label: "Text" },
  { value: "TEXTAREA", label: "Textbereich" },
  { value: "NUMBER",   label: "Zahl" },
  { value: "DATE",     label: "Datum" },
  { value: "SELECT",   label: "Auswahl" },
  { value: "BOOLEAN",  label: "Ja/Nein" },
];

// ── SVG Icon Picker ────────────────────────────────────────────────────────────
function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 w-full retro-field text-sm justify-between ${open ? "border-primary" : ""}`}
      >
        <span className="flex items-center gap-2">
          <CategoryIcon icon={value || "box"} className="h-5 w-5" />
          <span className="text-xs text-muted-foreground">{ICON_LABELS[value] || value || "Icon wählen"}</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-muted-foreground ml-auto" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-72 rounded-xl border border-border bg-card shadow-2xl p-3">
          <div className="grid grid-cols-5 gap-1.5 max-h-56 overflow-y-auto">
            {ICON_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => { onChange(name); setOpen(false); }}
                title={ICON_LABELS[name] || name}
                className={`flex flex-col items-center gap-1 rounded-md p-2 hover:bg-primary/10 transition ${
                  value === name ? "bg-primary/20 ring-1 ring-primary" : ""
                }`}
              >
                <CategoryIcon icon={name} className="h-5 w-5" />
                <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-tight">
                  {ICON_LABELS[name] || name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Drag handle ────────────────────────────────────────────────────────────────
function DragHandle(props: React.HTMLAttributes<SVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

// ── Sortable collection row ────────────────────────────────────────────────────
function SortableCollection({
  col,
  expanded,
  onExpand,
  onDelete,
  onReload,
  onRename,
  allTagGroups,
  onAssignTagGroup,
  onRemoveTagGroup,
  onToggleTagGroupVisibility,
  onToggleGrading,
}: {
  col: Collection;
  expanded: boolean;
  onExpand: () => void;
  onDelete: () => void;
  onReload: () => void;
  onRename: (id: string, name: string) => void;
  allTagGroups: TagGroupOption[];
  onAssignTagGroup: (colId: string, groupId: string) => Promise<void>;
  onRemoveTagGroup: (colId: string, groupId: string) => Promise<void>;
  onToggleTagGroupVisibility: (colId: string, groupId: string) => Promise<void>;
  onToggleGrading: (colId: string) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: col.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(col.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function startEditName(e: React.MouseEvent) {
    e.stopPropagation();
    setNameDraft(col.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  function confirmName() {
    if (nameDraft.trim() && nameDraft.trim() !== col.name) {
      onRename(col.id, nameDraft.trim());
    }
    setEditingName(false);
  }

  const [showAdd, setShowAdd] = useState(false);
  const [fieldForm, setFieldForm] = useState({ name: "", fieldKey: "", fieldType: "TEXT", options: "", required: false });
  const [fieldError, setFieldError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmitField(e: React.FormEvent) {
    e.preventDefault();
    setFieldError("");
    setSubmitting(true);
    const body = {
      name: fieldForm.name,
      fieldKey: fieldForm.fieldKey,
      fieldType: fieldForm.fieldType,
      required: fieldForm.required,
      options: fieldForm.fieldType === "SELECT"
        ? fieldForm.options.split(",").map((o) => o.trim()).filter(Boolean)
        : [],
    };
    const res = await fetch(`/api/admin/collections/${col.id}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) { setFieldError((await res.json()).error ?? "Fehler"); return; }
    onReload();
    setShowAdd(false);
    setFieldForm({ name: "", fieldKey: "", fieldType: "TEXT", options: "", required: false });
  }

  async function handleDeleteField(fieldId: string) {
    await fetch(`/api/admin/collections/${col.id}/fields/${fieldId}`, { method: "DELETE" });
    onReload();
  }

  const assignedGroupIds = new Set(col.tagGroups.map((tg) => tg.groupId));
  const unassignedGroups = allTagGroups.filter((g) => !assignedGroupIds.has(g.id));

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-3 cursor-pointer hover:bg-muted/20 transition-colors select-none"
        onClick={() => !editingName && onExpand()}
      >
        <DragHandle
          {...attributes} {...listeners}
          className="shrink-0 cursor-grab text-muted-foreground hover:text-primary transition active:cursor-grabbing touch-none"
        />

        <CategoryIcon icon={col.icon} className="h-4 w-4 shrink-0 text-foreground" />

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={confirmName}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmName();
                if (e.key === "Escape") { setEditingName(false); setNameDraft(col.name); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="retro-field py-0.5 px-1.5 text-sm font-medium w-full max-w-xs"
              autoFocus
            />
          ) : (
            <div>
              <p className="text-sm font-medium text-foreground">{col.name}</p>
              <p className="text-xs text-muted-foreground">
                {MEDIA_TYPES.find((m) => m.value === col.mediaType)?.label} · {col.fields.length} Felder · {col._count.items} Einträge
              </p>
            </div>
          )}
        </div>

        {/* Rename button */}
        <button
          onClick={startEditName}
          className="text-[10px] text-muted-foreground hover:text-foreground transition px-1.5 py-0.5 rounded shrink-0"
          title="Umbenennen"
        >
          ✎
        </button>

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-[10px] text-destructive/50 hover:text-destructive transition px-1.5 py-0.5 rounded shrink-0"
          title="Löschen"
        >
          ✕
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 pb-4 pt-3 space-y-4">
          {/* Fields list */}
          <div className="border-t border-border/50 pt-3 space-y-3">
            <p className="font-heading text-[10px] text-primary uppercase tracking-widest">Felder</p>
            {col.fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine Felder vorhanden.</p>
            ) : (
              <div className="space-y-1.5">
                {col.fields.map((field) => (
                  <div key={field.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground">{field.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-mono">{field.fieldKey}</span>
                      <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {FIELD_TYPES.find((t) => t.value === field.fieldType)?.label}
                      </span>
                      {field.required && <span className="ml-1 text-[10px] text-orange-400">Pflichtfeld</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteField(field.id)}
                      className="text-[10px] text-destructive/60 hover:text-destructive transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showAdd ? (
              <form onSubmit={handleSubmitField} className="space-y-3 pt-2 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Neues Feld</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    placeholder="Feldname (z.B. Plattform)"
                    value={fieldForm.name}
                    onChange={(e) => setFieldForm((f) => ({ ...f, name: e.target.value }))}
                    className="retro-field col-span-2"
                  />
                  <input
                    required
                    placeholder="Key (z.B. platform)"
                    value={fieldForm.fieldKey}
                    onChange={(e) => setFieldForm((f) => ({ ...f, fieldKey: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                    className="retro-field font-mono"
                  />
                  <select
                    value={fieldForm.fieldType}
                    onChange={(e) => setFieldForm((f) => ({ ...f, fieldType: e.target.value }))}
                    className="retro-field"
                  >
                    {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {fieldForm.fieldType === "SELECT" && (
                    <input
                      placeholder="Optionen kommagetrennt"
                      value={fieldForm.options}
                      onChange={(e) => setFieldForm((f) => ({ ...f, options: e.target.value }))}
                      className="retro-field col-span-2"
                    />
                  )}
                  <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldForm.required}
                      onChange={(e) => setFieldForm((f) => ({ ...f, required: e.target.checked }))}
                      className="rounded"
                    />
                    Pflichtfeld
                  </label>
                </div>
                {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setFieldError(""); setFieldForm({ name: "", fieldKey: "", fieldType: "TEXT", options: "", required: false }); }}
                    className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground uppercase hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {submitting ? "…" : "Feld hinzufügen"}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
              >
                + Feld hinzufügen
              </button>
            )}
          </div>

          {/* Tag-Gruppen */}
          <div className="border-t border-border/50 pt-3 space-y-3">
            <p className="font-heading text-[10px] text-primary uppercase tracking-widest">Tag-Gruppen</p>

            {col.tagGroups.length === 0 && (
              <p className="text-xs text-muted-foreground">Keine Tag-Gruppen zugewiesen.</p>
            )}

            {/* Assigned groups */}
            {col.tagGroups.map((tg) => (
              <div key={tg.groupId} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <span className="flex-1 text-sm text-foreground">{tg.group.name}</span>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tg.showInView}
                    onChange={() => onToggleTagGroupVisibility(col.id, tg.groupId)}
                    className="rounded"
                  />
                  Dashboard
                </label>
                <button
                  onClick={() => onRemoveTagGroup(col.id, tg.groupId)}
                  className="text-[10px] text-destructive/60 hover:text-destructive transition"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Add group dropdown — only when unassigned groups exist */}
            {unassignedGroups.length > 0 && (
              <select
                value=""
                onChange={(e) => { if (e.target.value) onAssignTagGroup(col.id, e.target.value); }}
                className="retro-field text-xs"
              >
                <option value="">+ Tag-Gruppe hinzufügen…</option>
                {unassignedGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Grading */}
          <div className="border-t border-border/50 pt-3 space-y-3">
            <p className="font-heading text-[10px] text-primary uppercase tracking-widest">Grading</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={col.gradingEnabled ?? false}
                onChange={() => onToggleGrading(col.id)}
                className="rounded"
              />
              <span className="text-sm text-foreground">Grading im Item-Detailbereich anzeigen</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allTagGroups, setAllTagGroups] = useState<TagGroupOption[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [colForm,     setColForm]     = useState({ name: "", icon: "gamepad", mediaType: "GAME", customMediaTypeLabel: "" });
  const [colError,    setColError]    = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [deleting,    setDeleting]    = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = useCallback(async () => {
    setLoading(true);
    const [colRes, tagsRes] = await Promise.all([
      fetch("/api/admin/collections"),
      fetch("/api/tags"),
    ]);
    if (colRes.ok) setCollections(await colRes.json());
    if (tagsRes.ok) {
      const groups: Array<{ id: string; name: string }> = await tagsRes.json();
      setAllTagGroups(groups.map((g) => ({ id: g.id, name: g.name })));
    }
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
    await fetch("/api/admin/collections/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((c) => c.id) }),
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setColError("");
    setSubmitting(true);
    const res = await fetch("/api/admin/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: colForm.name,
        icon: colForm.icon,
        mediaType: colForm.mediaType,
        customMediaTypeLabel: colForm.mediaType === "CUSTOM" ? colForm.customMediaTypeLabel : null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) { setColError((await res.json()).error ?? "Fehler"); return; }
    await load();
    setShowCreate(false);
    setColForm({ name: "", icon: "gamepad", mediaType: "GAME", customMediaTypeLabel: "" });
  }

  async function handleRename(id: string, name: string) {
    const res = await fetch(`/api/admin/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setCollections((prev) => prev.map((c) => c.id === id ? { ...c, name } : c));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/admin/collections/${deleteTarget.id}`, { method: "DELETE" });
    setCollections((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  }

  async function handleAssignTagGroup(colId: string, groupId: string) {
    const res = await fetch(`/api/admin/collections/${colId}/tag-groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    if (!res.ok) return;
    const assignment: { groupId: string; showInView: boolean; group: { id: string; name: string } } = await res.json();
    setCollections((prev) =>
      prev.map((c) =>
        c.id === colId
          ? { ...c, tagGroups: [...c.tagGroups, { groupId: assignment.groupId, showInView: assignment.showInView, group: assignment.group }] }
          : c
      )
    );
  }

  async function handleRemoveTagGroup(colId: string, groupId: string) {
    const res = await fetch(`/api/admin/collections/${colId}/tag-groups/${groupId}`, { method: "DELETE" });
    if (!res.ok) return;
    setCollections((prev) =>
      prev.map((c) =>
        c.id === colId
          ? { ...c, tagGroups: c.tagGroups.filter((tg) => tg.groupId !== groupId) }
          : c
      )
    );
  }

  async function handleToggleTagGroupVisibility(colId: string, groupId: string) {
    // Optimistic update
    setCollections((prev) =>
      prev.map((c) =>
        c.id === colId
          ? { ...c, tagGroups: c.tagGroups.map((tg) => tg.groupId === groupId ? { ...tg, showInView: !tg.showInView } : tg) }
          : c
      )
    );
    const res = await fetch(`/api/admin/collections/${colId}/tag-groups/${groupId}`, { method: "PATCH" });
    if (!res.ok) {
      // Revert on failure
      setCollections((prev) =>
        prev.map((c) =>
          c.id === colId
            ? { ...c, tagGroups: c.tagGroups.map((tg) => tg.groupId === groupId ? { ...tg, showInView: !tg.showInView } : tg) }
            : c
        )
      );
    }
  }

  async function handleToggleGrading(colId: string) {
    const col = collections.find((c) => c.id === colId);
    if (!col) return;
    const next = !col.gradingEnabled;
    setCollections((prev) => prev.map((c) => c.id === colId ? { ...c, gradingEnabled: next } : c));
    const res = await fetch(`/api/admin/collections/${colId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gradingEnabled: next }),
    });
    if (!res.ok) {
      setCollections((prev) => prev.map((c) => c.id === colId ? { ...c, gradingEnabled: !next } : c));
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">Sammlungen</h2>
          <p className="mt-1 text-sm text-muted-foreground">{collections.length} Sammlungen · Reihenfolge per Drag &amp; Drop ändern</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90"
        >
          + Neue Sammlung
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Lade…</p>
      ) : collections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Noch keine Sammlungen angelegt.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={collections.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {collections.map((col) => (
                <SortableCollection
                  key={col.id}
                  col={col}
                  expanded={expanded === col.id}
                  onExpand={() => setExpanded(expanded === col.id ? null : col.id)}
                  onDelete={() => setDeleteTarget(col)}
                  onReload={load}
                  onRename={handleRename}
                  allTagGroups={allTagGroups}
                  onAssignTagGroup={handleAssignTagGroup}
                  onRemoveTagGroup={handleRemoveTagGroup}
                  onToggleTagGroupVisibility={handleToggleTagGroupVisibility}
                  onToggleGrading={handleToggleGrading}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">Neue Sammlung</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</label>
                <input
                  required
                  value={colForm.name}
                  onChange={(e) => setColForm((f) => ({ ...f, name: e.target.value }))}
                  className="retro-field w-full"
                  placeholder="z.B. Konsolenspiele"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Icon</label>
                <IconPicker value={colForm.icon} onChange={(v) => setColForm((f) => ({ ...f, icon: v }))} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Medientyp</label>
                <select
                  value={colForm.mediaType}
                  onChange={(e) => setColForm((f) => ({ ...f, mediaType: e.target.value }))}
                  className="retro-field w-full"
                >
                  {MEDIA_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {colForm.mediaType === "CUSTOM" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Name des Medientyps <span className="text-primary">*</span>
                  </label>
                  <input
                    required
                    value={colForm.customMediaTypeLabel}
                    onChange={(e) => setColForm((f) => ({ ...f, customMediaTypeLabel: e.target.value }))}
                    className="retro-field w-full"
                    placeholder="z.B. Actionfiguren"
                  />
                  <p className="text-[10px] text-muted-foreground">Wird als Bezeichnung für diesen benutzerdefinierten Typ verwendet.</p>
                </div>
              )}

              {colError && <p className="text-xs text-destructive">{colError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setColError(""); }}
                  className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition"
                >
                  {submitting ? "Erstelle…" : "Erstellen"}
                </button>
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
              <h3 className="font-heading text-[10px] text-destructive uppercase tracking-widest">Danger Zone</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Sammlung <span className="font-medium text-foreground">„{deleteTarget.name}"</span> löschen?{" "}
              {deleteTarget._count.items > 0 && (
                <span className="text-destructive">
                  Enthält {deleteTarget._count.items} {deleteTarget._count.items === 1 ? "Eintrag" : "Einträge"}, die ebenfalls gelöscht werden.
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-md bg-destructive px-3 py-2 text-xs font-medium text-white uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition"
              >
                {deleting ? "Lösche…" : "Dauerhaft löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
