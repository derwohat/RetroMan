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

type TagValue = { id: string; value: string; order: number };
type TagGroup = { id: string; name: string; color: string; order: number; values: TagValue[] };

// ── Drag Handle Icon ───────────────────────────────────────────────────────────
function DragHandle({ listeners, attributes }: { listeners?: object; attributes?: object }) {
  return (
    <span
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition px-1 touch-none select-none"
      title="Verschieben"
    >
      ⣿
    </span>
  );
}

// ── Sortable Tag Value Row ─────────────────────────────────────────────────────
function SortableValue({
  tagValue,
  groupId,
  onDelete,
  onRename,
}: {
  tagValue: TagValue;
  groupId: string;
  onDelete: (groupId: string, valueId: string) => void;
  onRename: (groupId: string, valueId: string, newValue: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tagValue.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tagValue.value);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(tagValue.value);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }
  function confirmEdit() {
    if (draft.trim() && draft.trim() !== tagValue.value) {
      onRename(groupId, tagValue.id, draft.trim());
    }
    setEditing(false);
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 group/value py-1 px-2 rounded hover:bg-muted/30 transition-colors">
      <DragHandle listeners={listeners} attributes={attributes} />
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={confirmEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmEdit();
              if (e.key === "Escape") { setEditing(false); setDraft(tagValue.value); }
            }}
            className="retro-field py-0.5 px-1.5 text-xs w-full"
            autoFocus
          />
        ) : (
          <span
            className="text-sm text-foreground cursor-pointer hover:text-primary transition-colors"
            onClick={startEdit}
            title="Klicken zum Bearbeiten"
          >
            {tagValue.value}
          </span>
        )}
      </div>
      <button
        onClick={() => onDelete(groupId, tagValue.id)}
        className="opacity-0 group-hover/value:opacity-100 text-[10px] text-destructive/60 hover:text-destructive transition ml-1 shrink-0"
        title="Löschen"
      >
        ✕
      </button>
    </div>
  );
}

// ── Add Value Row ──────────────────────────────────────────────────────────────
function AddValueRow({ groupId, onAdd }: { groupId: string; onAdd: (groupId: string, value: string) => Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    await onAdd(groupId, draft.trim());
    setDraft("");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 mt-2 px-2">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Neuer Wert…"
        className="retro-field flex-1 py-1 px-2 text-xs"
        disabled={busy}
      />
      <button
        type="submit"
        disabled={!draft.trim() || busy}
        className="shrink-0 rounded-md bg-primary/80 px-3 py-1 text-[11px] font-medium text-primary-foreground uppercase tracking-wider hover:bg-primary disabled:opacity-40 transition"
      >
        + Hinzufügen
      </button>
    </form>
  );
}

// ── Sortable Group Accordion ───────────────────────────────────────────────────
function SortableGroup({
  group,
  isOpen,
  onToggle,
  onAddValue,
  onDeleteValue,
  onRenameValue,
  onReorderValues,
  onRenameGroup,
  onDeleteGroup,
  onColorChange,
}: {
  group: TagGroup;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onAddValue: (groupId: string, value: string) => Promise<void>;
  onDeleteValue: (groupId: string, valueId: string) => void;
  onRenameValue: (groupId: string, valueId: string, newValue: string) => void;
  onReorderValues: (groupId: string, newOrder: TagValue[]) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onColorChange: (groupId: string, color: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(group.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function startEditName(e: React.MouseEvent) {
    e.stopPropagation();
    setNameDraft(group.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }
  function confirmName() {
    if (nameDraft.trim() && nameDraft.trim() !== group.name) {
      onRenameGroup(group.id, nameDraft.trim());
    }
    setEditingName(false);
  }

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
      {/* Group Header */}
      <div
        className="flex items-center gap-1 px-2 py-3 cursor-pointer hover:bg-muted/20 transition-colors select-none"
        onClick={() => !editingName && onToggle(group.id)}
      >
        <DragHandle listeners={listeners} attributes={attributes} />

        {/* Group Name (as colored badge) */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={confirmName}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmName();
                if (e.key === "Escape") { setEditingName(false); setNameDraft(group.name); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="retro-field py-0.5 px-1.5 text-sm font-medium w-full max-w-xs"
              autoFocus
            />
          ) : (
            <span
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
              style={{ borderColor: `${group.color}50`, backgroundColor: `${group.color}18`, color: group.color }}
            >
              {group.name}
            </span>
          )}
        </div>

        <span className="text-[10px] text-muted-foreground mr-1 shrink-0">
          {group.values.length} {group.values.length === 1 ? "Wert" : "Werte"}
        </span>

        {/* Color picker */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="color"
            value={group.color}
            onChange={(e) => onColorChange(group.id, e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            title="Farbe wählen"
          />
          <div
            className="h-5 w-5 rounded-full border-2 border-white/20"
            style={{ backgroundColor: group.color }}
            title="Farbe wählen"
          />
        </div>

        {/* Edit name button */}
        <button
          onClick={startEditName}
          className="text-[10px] text-muted-foreground hover:text-foreground transition px-1.5 py-0.5 rounded shrink-0"
          title="Gruppe umbenennen"
        >
          ✎
        </button>

        {/* Delete group button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }}
          className="text-[10px] text-destructive/50 hover:text-destructive transition px-1.5 py-0.5 rounded shrink-0"
          title="Gruppe löschen"
        >
          ✕
        </button>
      </div>

      {/* Accordion Body */}
      {isOpen && (
        <div className="border-t border-border bg-background/40 pb-3">
          {group.values.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground italic">Noch keine Werte. Füge den ersten hinzu.</p>
          ) : (
            <DndContext sensors={innerSensors} collisionDetection={closestCenter} onDragEnd={handleValueDragEnd}>
              <SortableContext items={group.values.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                <div className="pt-1">
                  {group.values.map((v) => (
                    <SortableValue
                      key={v.id}
                      tagValue={v}
                      groupId={group.id}
                      onDelete={onDeleteValue}
                      onRename={onRenameValue}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <AddValueRow groupId={group.id} onAdd={onAddValue} />
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminTagsPage() {
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
    const res = await fetch("/api/admin/tag-groups");
    if (res.ok) setGroups(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Group CRUD ───────────────────────────────────────────────────────────────
  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!newGroupName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/tag-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName.trim() }),
    });
    setCreating(false);
    if (!res.ok) { setCreateError((await res.json()).error ?? "Fehler"); return; }
    const newGroup: TagGroup = await res.json();
    setGroups((prev) => [...prev, newGroup]);
    setOpenGroups((prev) => new Set([...prev, newGroup.id]));
    setNewGroupName("");
    setShowCreateGroup(false);
  }

  function handleColorChange(groupId: string, color: string) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, color } : g)));
    if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
    colorTimerRef.current = setTimeout(() => {
      fetch(`/api/admin/tag-groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
    }, 300);
  }

  async function handleRenameGroup(groupId: string, name: string) {
    const res = await fetch(`/api/admin/tag-groups/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const updated: TagGroup = await res.json();
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name: updated.name } : g)));
    }
  }

  async function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    const reordered = arrayMove(groups, oldIndex, newIndex);
    setGroups(reordered);
    await fetch("/api/admin/tag-groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((g) => g.id) }),
    });
  }

  // ── Value CRUD ───────────────────────────────────────────────────────────────
  async function handleAddValue(groupId: string, value: string) {
    const res = await fetch(`/api/admin/tag-groups/${groupId}/values`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (res.ok) {
      const newValue: TagValue = await res.json();
      setGroups((prev) =>
        prev.map((g) => g.id === groupId ? { ...g, values: [...g.values, newValue] } : g)
      );
    }
  }

  async function handleRenameValue(groupId: string, valueId: string, newValue: string) {
    const res = await fetch(`/api/admin/tag-groups/${groupId}/values/${valueId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newValue }),
    });
    if (res.ok) {
      const updated: TagValue = await res.json();
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, values: g.values.map((v) => (v.id === valueId ? updated : v)) }
            : g
        )
      );
    }
  }

  async function handleReorderValues(groupId: string, newOrder: TagValue[]) {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, values: newOrder } : g))
    );
    await fetch(`/api/admin/tag-groups/${groupId}/values`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: newOrder.map((v) => v.id) }),
    });
  }

  // ── Delete with confirmation ──────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "group") {
      await fetch(`/api/admin/tag-groups/${deleteTarget.group.id}`, { method: "DELETE" });
      setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.group.id));
    } else {
      await fetch(`/api/admin/tag-groups/${deleteTarget.group.id}/values/${deleteTarget.value.id}`, { method: "DELETE" });
      setGroups((prev) =>
        prev.map((g) =>
          g.id === deleteTarget.group.id
            ? { ...g, values: g.values.filter((v) => v.id !== deleteTarget.value.id) }
            : g
        )
      );
    }
    setDeleteTarget(null);
  }

  function requestDeleteGroup(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (group) setDeleteTarget({ type: "group", group });
  }

  function requestDeleteValue(groupId: string, valueId: string) {
    const group = groups.find((g) => g.id === groupId);
    const value = group?.values.find((v) => v.id === valueId);
    if (group && value) setDeleteTarget({ type: "value", group, value });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">Tags</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {groups.length} {groups.length === 1 ? "Gruppe" : "Gruppen"} · Werte werden beim Anlegen von Einträgen als Optionen angeboten
          </p>
        </div>
        <button
          onClick={() => { setShowCreateGroup(true); setNewGroupName(""); setCreateError(""); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90 shrink-0"
        >
          + Neue Gruppe
        </button>
      </div>

      {/* Group List */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Lade…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">Noch keine Tag-Gruppen. Erstelle die erste Gruppe.</p>
        </div>
      ) : (
        <DndContext sensors={outerSensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
          <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {groups.map((group) => (
                <SortableGroup
                  key={group.id}
                  group={group}
                  isOpen={openGroups.has(group.id)}
                  onToggle={toggleGroup}
                  onAddValue={handleAddValue}
                  onDeleteValue={requestDeleteValue}
                  onRenameValue={handleRenameValue}
                  onReorderValues={handleReorderValues}
                  onRenameGroup={handleRenameGroup}
                  onDeleteGroup={requestDeleteGroup}
                  onColorChange={handleColorChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <h3 className="font-heading text-[10px] text-primary uppercase tracking-widest">Neue Tag-Gruppe</h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name *</label>
                <input
                  required
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="retro-field w-full"
                  placeholder="z.B. Shops, Genre, Region…"
                />
              </div>
              {createError && <p className="text-xs text-destructive">{createError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreateGroup(false); setCreateError(""); }}
                  className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition"
                >
                  {creating ? "…" : "Erstellen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-destructive/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive text-sm">⚠</span>
              <h3 className="font-heading text-[10px] text-destructive uppercase tracking-widest">Danger Zone</h3>
            </div>
            {deleteTarget.type === "group" ? (
              <p className="text-sm text-muted-foreground">
                Die Gruppe <span className="font-medium text-foreground">„{deleteTarget.group.name}"</span> und alle{" "}
                <span className="font-medium text-foreground">{deleteTarget.group.values.length} Werte</span> werden dauerhaft gelöscht.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">„{deleteTarget.value.value}"</span> wird aus der Gruppe{" "}
                <span className="font-medium text-foreground">„{deleteTarget.group.name}"</span> entfernt.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-md bg-destructive px-3 py-2 text-xs font-medium text-white uppercase tracking-wider hover:opacity-90 transition"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
