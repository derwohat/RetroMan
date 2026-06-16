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

type CategoryTagGroupAdmin = {
  groupId: string;
  showInView: boolean;
  group: { id: string; name: string };
};

type Category = {
  id: string;
  name: string;
  icon: string | null;
  mediaType: string;
  order: number;
  fields: Field[];
  tagGroups: CategoryTagGroupAdmin[];
};

type TagGroupOption = { id: string; name: string };

const MEDIA_TYPES = [
  { value: "GAME",    label: "Spiele" },
  { value: "MUSIC",   label: "Musik" },
  { value: "VIDEO",   label: "Video" },
  { value: "BOOK",    label: "Bücher" },
  { value: "CONSOLE", label: "Konsolen" },
  { value: "CUSTOM",  label: "Benutzerdefiniert" },
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

// ── Sortable category row ──────────────────────────────────────────────────────
function SortableCategory({
  cat,
  expanded,
  onExpand,
  onDelete,
  onReload,
  onRename,
  allTagGroups,
  onAssignTagGroup,
  onRemoveTagGroup,
  onToggleTagGroupVisibility,
}: {
  cat: Category;
  expanded: boolean;
  onExpand: () => void;
  onDelete: () => void;
  onReload: () => void;
  onRename: (id: string, name: string) => void;
  allTagGroups: TagGroupOption[];
  onAssignTagGroup: (catId: string, groupId: string) => Promise<void>;
  onRemoveTagGroup: (catId: string, groupId: string) => Promise<void>;
  onToggleTagGroupVisibility: (catId: string, groupId: string) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(cat.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function startEditName(e: React.MouseEvent) {
    e.stopPropagation();
    setNameDraft(cat.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  function confirmName() {
    if (nameDraft.trim() && nameDraft.trim() !== cat.name) {
      onRename(cat.id, nameDraft.trim());
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
    const res = await fetch(`/api/admin/categories/${cat.id}/fields`, {
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
    await fetch(`/api/admin/categories/${cat.id}/fields/${fieldId}`, { method: "DELETE" });
    onReload();
  }

  const assignedGroupIds = new Set(cat.tagGroups.map((tg) => tg.groupId));
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

        <CategoryIcon icon={cat.icon} className="h-4 w-4 shrink-0 text-foreground" />

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
                if (e.key === "Escape") { setEditingName(false); setNameDraft(cat.name); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="retro-field py-0.5 px-1.5 text-sm font-medium w-full max-w-xs"
              autoFocus
            />
          ) : (
            <div>
              <p className="text-sm font-medium text-foreground">{cat.name}</p>
              <p className="text-xs text-muted-foreground">
                {MEDIA_TYPES.find((m) => m.value === cat.mediaType)?.label} · {cat.fields.length} Felder
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
            {cat.fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine Felder vorhanden.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Felder</p>
                {cat.fields.map((field) => (
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
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tag-Gruppen</p>

            {cat.tagGroups.length === 0 && (
              <p className="text-xs text-muted-foreground">Keine Tag-Gruppen zugewiesen.</p>
            )}

            {/* Assigned groups */}
            {cat.tagGroups.map((tg) => (
              <div key={tg.groupId} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                <span className="flex-1 text-sm text-foreground">{tg.group.name}</span>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tg.showInView}
                    onChange={() => onToggleTagGroupVisibility(cat.id, tg.groupId)}
                    className="rounded"
                  />
                  Dashboard
                </label>
                <button
                  onClick={() => onRemoveTagGroup(cat.id, tg.groupId)}
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
                onChange={(e) => { if (e.target.value) onAssignTagGroup(cat.id, e.target.value); }}
                className="retro-field text-xs"
              >
                <option value="">+ Tag-Gruppe hinzufügen…</option>
                {unassignedGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTagGroups, setAllTagGroups] = useState<TagGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", icon: "gamepad", mediaType: "GAME", customMediaTypeLabel: "" });
  const [catError, setCatError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = useCallback(async () => {
    const [catRes, tagsRes] = await Promise.all([
      fetch("/api/admin/categories"),
      fetch("/api/tags"),
    ]);
    if (catRes.ok) setCategories(await catRes.json());
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
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);
    await fetch("/api/admin/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((c) => c.id) }),
    });
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setCatError("");
    setSubmitting(true);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: catForm.name,
        icon: catForm.icon,
        mediaType: catForm.mediaType,
        customMediaTypeLabel: catForm.mediaType === "CUSTOM" ? catForm.customMediaTypeLabel : null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) { setCatError((await res.json()).error ?? "Fehler"); return; }
    await load();
    setShowCreate(false);
    setCatForm({ name: "", icon: "gamepad", mediaType: "GAME", customMediaTypeLabel: "" });
  }

  async function handleDeleteCategory(id: string) {
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    await load();
  }

  async function handleRenameCategory(id: string, name: string) {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setCategories((prev) => prev.map((c) => c.id === id ? { ...c, name } : c));
    }
  }

  async function handleAssignTagGroup(catId: string, groupId: string) {
    const res = await fetch(`/api/admin/categories/${catId}/tag-groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    if (!res.ok) return;
    const assignment: { groupId: string; showInView: boolean; group: { id: string; name: string } } = await res.json();
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, tagGroups: [...c.tagGroups, { groupId: assignment.groupId, showInView: assignment.showInView, group: assignment.group }] }
          : c
      )
    );
  }

  async function handleRemoveTagGroup(catId: string, groupId: string) {
    const res = await fetch(`/api/admin/categories/${catId}/tag-groups/${groupId}`, { method: "DELETE" });
    if (!res.ok) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, tagGroups: c.tagGroups.filter((tg) => tg.groupId !== groupId) }
          : c
      )
    );
  }

  async function handleToggleTagGroupVisibility(catId: string, groupId: string) {
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, tagGroups: c.tagGroups.map((tg) => tg.groupId === groupId ? { ...tg, showInView: !tg.showInView } : tg) }
          : c
      )
    );
    const res = await fetch(`/api/admin/categories/${catId}/tag-groups/${groupId}`, { method: "PATCH" });
    if (!res.ok) {
      // Revert on failure
      setCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? { ...c, tagGroups: c.tagGroups.map((tg) => tg.groupId === groupId ? { ...tg, showInView: !tg.showInView } : tg) }
            : c
        )
      );
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">Kategorien</h2>
          <p className="mt-1 text-sm text-muted-foreground">{categories.length} Kategorien</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90"
        >
          + Neue Kategorie
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Lade…</p>
      ) : categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Noch keine Kategorien angelegt.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {categories.map((cat) => (
                <SortableCategory
                  key={cat.id}
                  cat={cat}
                  expanded={expanded === cat.id}
                  onExpand={() => setExpanded(expanded === cat.id ? null : cat.id)}
                  onDelete={() => setDeleteConfirm(cat.id)}
                  onReload={load}
                  onRename={handleRenameCategory}
                  allTagGroups={allTagGroups}
                  onAssignTagGroup={handleAssignTagGroup}
                  onRemoveTagGroup={handleRemoveTagGroup}
                  onToggleTagGroupVisibility={handleToggleTagGroupVisibility}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create Category Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">Neue Kategorie</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</label>
                <input
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                  className="retro-field w-full"
                  placeholder="z.B. Konsolenspiele"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Icon</label>
                <IconPicker value={catForm.icon} onChange={(v) => setCatForm((f) => ({ ...f, icon: v }))} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Medientyp</label>
                <select
                  value={catForm.mediaType}
                  onChange={(e) => setCatForm((f) => ({ ...f, mediaType: e.target.value }))}
                  className="retro-field w-full"
                >
                  {MEDIA_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {catForm.mediaType === "CUSTOM" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Name des Medientyps <span className="text-primary">*</span>
                  </label>
                  <input
                    required
                    value={catForm.customMediaTypeLabel}
                    onChange={(e) => setCatForm((f) => ({ ...f, customMediaTypeLabel: e.target.value }))}
                    className="retro-field w-full"
                    placeholder="z.B. Actionfiguren"
                  />
                  <p className="text-[10px] text-muted-foreground">Wird als Bezeichnung für diesen benutzerdefinierten Typ verwendet.</p>
                </div>
              )}

              {catError && <p className="text-xs text-destructive">{catError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCatError(""); }}
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

      {/* Delete Confirm — DangerZone */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive text-sm">⚠</span>
              <h3 className="font-heading text-[10px] text-destructive uppercase tracking-widest">Danger Zone</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Die Kategorie und alle zugehörigen Felder und Einträge werden <span className="text-destructive font-medium">dauerhaft und unwiderruflich gelöscht</span>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteCategory(deleteConfirm)}
                className="flex-1 rounded-md bg-destructive px-3 py-2 text-xs font-medium text-white uppercase tracking-wider hover:opacity-90 transition"
              >
                Dauerhaft löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
