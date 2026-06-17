"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

type Collection = {
  id: string;
  name: string;
  icon: string | null;
  _count: { items: number };
};

export default function DashboardPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : []))
      .then((cols: Collection[]) => { setCollections(cols); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalItems = collections.reduce((sum, c) => sum + c._count.items, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">
          Sammlungen
        </h2>
        {!loading && (
          <p className="mt-1 text-sm text-muted-foreground">
            {totalItems} {totalItems === 1 ? "Eintrag" : "Einträge"} in {collections.length} {collections.length === 1 ? "Sammlung" : "Sammlungen"}
          </p>
        )}
      </div>

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/collection/${col.id}`}
              className="media-card group flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-8 transition hover:border-primary hover:bg-primary/5"
            >
              <CategoryIcon icon={col.icon} className="h-16 w-16" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition">{col.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {col._count.items} {col._count.items === 1 ? "Eintrag" : "Einträge"}
                </p>
              </div>
            </Link>
          ))}

          {collections.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <CategoryIcon icon={null} className="h-16 w-16 opacity-20 mb-4" />
              <p className="text-sm text-muted-foreground">Noch keine Sammlungen angelegt.</p>
              <Link href="/admin/collections" className="mt-3 text-xs text-primary hover:underline">
                Sammlungen im Admin-Bereich verwalten →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
