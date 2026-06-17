"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { ItemForm } from "@/components/items/ItemForm";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ShelfView }  from "@/components/views/ShelfView";
import { CdWallView } from "@/components/views/CdWallView";
import { SpineView }  from "@/components/views/SpineView";
import { SimpleView } from "@/components/views/SimpleView";
import { TableView }  from "@/components/views/TableView";
import {
  VIEW_AVAILABILITY,
  VIEW_ICONS,
  VIEW_LABELS,
  type ViewType,
  type MediaType,
  type ViewItem,
  type CategoryField,
} from "@/components/views/types";

type CollectionTagGroup = { groupId: string; showInView: boolean; group: { id: string; name: string; color: string; linkedField?: string | null } };
type Collection = {
  id: string;
  name: string;
  icon: string | null;
  mediaType: MediaType;
  fields: CategoryField[];
  tagGroups: CollectionTagGroup[];
};

export default function CollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>();

  const [collection, setCollection]    = useState<Collection | null>(null);
  const [items, setItems]              = useState<ViewItem[]>([]);
  const [loading, setLoading]          = useState(true);
  const [activeView, setActiveView]    = useState<ViewType>("SHELF");
  const [visibleTags, setVisibleTags]  = useState<string[]>([]);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [showForm, setShowForm]        = useState(false);
  const tagPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/collections")
      .then((r) => r.json())
      .then((cols: Collection[]) => setCollection(cols.find((c) => c.id === collectionId) ?? null));
  }, [collectionId]);

  useEffect(() => {
    const stored = localStorage.getItem(`view_${collectionId}`) as ViewType | null;
    if (stored) setActiveView(stored);

    fetch(`/api/collection-settings/${collectionId}`)
      .then((r) => r.json())
      .then((s) => {
        const view = (localStorage.getItem(`view_${collectionId}`) as ViewType | null) ?? s.viewType ?? "SHELF";
        setActiveView(view);
        setVisibleTags(s.visibleTags ?? []);
      })
      .catch(() => {});
  }, [collectionId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tagPanelRef.current && !tagPanelRef.current.contains(e.target as Node)) setShowTagPanel(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/items?collectionId=${collectionId}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [collectionId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function saveViewSettings(view: ViewType, tags: string[]) {
    await fetch(`/api/collection-settings/${collectionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewType: view, visibleTags: tags }),
    });
  }

  function handleViewChange(view: ViewType) {
    setActiveView(view);
    localStorage.setItem(`view_${collectionId}`, view);
    saveViewSettings(view, visibleTags);
  }

  function toggleTag(key: string) {
    const next = visibleTags.includes(key) ? visibleTags.filter((t) => t !== key) : [...visibleTags, key];
    setVisibleTags(next);
    saveViewSettings(activeView, next);
  }

  const availableViews = collection
    ? VIEW_AVAILABILITY[collection.mediaType] ?? ["SHELF", "SIMPLE", "TABLE"]
    : (["SHELF", "SIMPLE", "TABLE"] as ViewType[]);

  const viewProps = {
    items,
    categoryIcon: collection?.icon ?? "📦",
    visibleTags,
    fields: collection?.fields ?? [],
    chipGroups: (collection?.tagGroups ?? [])
      .filter((tg) => tg.showInView)
      .map((tg) => ({ groupId: tg.groupId, name: tg.group.name, color: tg.group.color ?? "#ff2d95", linkedField: tg.group.linkedField })),
  };

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest flex items-center gap-2">
            <CategoryIcon icon={collection?.icon ?? null} className="h-4 w-4" />
            {collection?.name ?? "Sammlung"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Lade…" : `${items.length} ${items.length === 1 ? "Eintrag" : "Einträge"}`}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted p-1">
            {availableViews.map((view) => (
              <button
                key={view}
                title={VIEW_LABELS[view]}
                onClick={() => handleViewChange(view)}
                className={`flex items-center justify-center w-8 h-7 rounded text-sm transition ${
                  activeView === view ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {VIEW_ICONS[view]}
              </button>
            ))}
          </div>

          {/* Tag/chip settings */}
          {(collection?.fields?.length ?? 0) > 0 && (
            <div className="relative" ref={tagPanelRef}>
              <button
                onClick={() => setShowTagPanel((p) => !p)}
                title="Angezeigte Felder"
                className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs transition ${showTagPanel ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Felder
                {visibleTags.length > 0 && (
                  <span className="rounded-full bg-primary w-4 h-4 text-[10px] text-primary-foreground flex items-center justify-center">{visibleTags.length}</span>
                )}
              </button>
              {showTagPanel && (
                <div className="absolute right-0 top-10 z-20 w-56 rounded-lg border border-border bg-card shadow-xl p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Als Chip auf Kacheln zeigen</p>
                  {collection?.fields.map((field) => (
                    <label key={field.fieldKey} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={visibleTags.includes(field.fieldKey)} onChange={() => toggleTag(field.fieldKey)} className="rounded" />
                      <span className="text-xs text-foreground">{field.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add button */}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground uppercase tracking-wider transition hover:opacity-90"
          >
            + Hinzufügen
          </button>
        </div>
      </div>

      {/* View */}
      {!loading && (
        <>
          {activeView === "SHELF"  && <ShelfView  {...viewProps} />}
          {activeView === "CDWALL" && <CdWallView {...viewProps} />}
          {activeView === "SPINE"  && <SpineView  {...viewProps} />}
          {activeView === "SIMPLE" && <SimpleView {...viewProps} />}
          {activeView === "TABLE"  && <TableView  {...viewProps} />}
        </>
      )}

      {showForm && collection && (
        <ItemForm
          collection={collection}
          collectionId={collection.id}
          item={null}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadItems(); }}
        />
      )}
    </div>
  );
}
