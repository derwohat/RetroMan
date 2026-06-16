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
import { CategoryIcon } from "@/components/ui/CategoryIcon";

type CategoryOption = { id: string; name: string; icon: string | null; mediaType: string };
type Collection = {
  id: string;
  name: string;
  categoryId: string;
  order: number;
  category: { id: string; name: string; icon: string | null; mediaType: string };
  _count: { items: number };
};

// ── Drag-and-drop row ─────────────────────────────────────────────────────────
function CollectionRow({
  collection,
  onRename,
  onDelete,
}: {
  collection: Collection;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: collection.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(collection.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(collection.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  }

  async function commitRename() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== collection.name) {
      await onRename(collection.id, trimmed);
    } else {
      setDraft(collection.name);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground touch-none"
        title="Ziehen zum Neuanordnen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      {/* Category icon */}
      <span className="shrink-0">
        <CategoryIcon icon={collection.category.icon} className="h-5 w-5" />
      </span>

      {/* Name (editable) */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setEditing(false); setDraft(collection.name); } }}
            className="retro-field w-full text-sm"
            autoFocus
          />
        ) : (
          <button
            onClick={startEdit}
            className="text-sm font-medium text-foreground hover:text-primary transition text-left w-full truncate"
            title="Klicken zum Umbenennen"
          >
            {collection.name}
          </button>
        )}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {collection.category.name} · {collection._count.items} {collection._count.items === 1 ? "Eintrag" : "Einträge"}
        </p>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(collection.id)}
        className="shrink-0 rounded border border-destructive/30 px-2 py-1 text-[10px] text-destructive hover:bg-destructive/10 transition"
      >
        Löschen
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categories,  setCategories]  = useState<CategoryOption[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [newName,     setNewName]     = useState("");
  const [newCatId,    setNewCatId]    = useState("");
  const [creating,    setCreating]    = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [deleting,    setDeleting]    = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const load = useCallback(async () => {
    setLoading(true);
    const [colRes, catRes] = await Promise.all([
      fetch("/api/admin/collections"),
      fetch("/api/categories"),
    ]);
    if (colRes.ok) setCollections(await colRes.json());
    if (catRes.ok) setCategories(await catRes.json());
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
    if (!newName.trim() || !newCatId) { setCreateError("Name und Kategorie erforderlich."); return; }
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/admin/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), categoryId: newCatId }),
    });
    setCreating(false);
    if (!res.ok) { setCreateError((await res.json()).error ?? "Fehler"); return; }
    const created = await res.json();
    setCollections((prev) => [...prev, created]);
    setNewName("");
    setNewCatId("");
    setShowCreate(false);
  }

  async function handleRename(id: string, name: string) {
    const res = await fetch(`/api/admin/collections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCollections((prev) => prev.map((c) => (c.id === id ? updated : c)));
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">Sammlungen</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sammlungen verwalten · Reihenfolge per Drag &amp; Drop ändern
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(""); setNewName(""); setNewCatId(categories[0]?.id ?? ""); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 transition"
        >
          + Neue Sammlung
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6 space-y-4"
          >
            <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">Neue Sammlung</h3>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</label>
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="retro-field w-full"
                placeholder="z.B. Meine Konsolenspiele"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Typ (Kategorie)</label>
              <select
                required
                value={newCatId}
                onChange={(e) => setNewCatId(e.target.value)}
                className="retro-field w-full"
              >
                <option value="">— Kategorie wählen —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {createError && <p className="text-xs text-destructive">{createError}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition"
              >
                {creating ? "Erstelle…" : "Erstellen"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collection list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Noch keine Sammlungen.</p>
          <button
            onClick={() => { setShowCreate(true); setNewCatId(categories[0]?.id ?? ""); }}
            className="text-xs text-primary hover:underline"
          >
            Erste Sammlung erstellen →
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={collections.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {collections.map((col) => (
                <CollectionRow
                  key={col.id}
                  collection={col}
                  onRename={handleRename}
                  onDelete={(id) => setDeleteTarget(collections.find((c) => c.id === id) ?? null)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Delete confirmation */}
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
