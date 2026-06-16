"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";
import { formatPrice } from "@/lib/format";

type StatsData = {
  total: number;
  totalValue: number;
  favorites: number;
  wishlist: number;
  byCollection: Array<{ name: string; icon: string | null; count: number; value: number }>;
  byCondition: Record<string, number>;
  byYear: Array<{ year: number; count: number }>;
  byMonth: Array<{ month: string; count: number }>;
};

const CONDITION_COLORS_HEX: Record<string, string> = {
  MINT: "#22c55e", VERY_GOOD: "#22d3ee", GOOD: "#fbbf24", USED: "#f97316", POOR: "#ef4444", UNKNOWN: "#6b7280",
};
const CONDITION_LABELS: Record<string, string> = {
  MINT: "Mint", VERY_GOOD: "Very Good", GOOD: "Good", USED: "Used", POOR: "Poor", UNKNOWN: "Unbekannt",
};

const CHART_COLORS = [
  "#ff2d95", "#00f5d4", "#a855f7", "#f97316", "#22d3ee",
  "#fbbf24", "#22c55e", "#e879f9", "#34d399", "#fb7185",
];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">Noch keine Einträge vorhanden.</p>
      </div>
    );
  }

  const conditionData = Object.entries(data.byCondition).map(([k, v]) => ({
    name: CONDITION_LABELS[k] ?? k,
    value: v,
    color: CONDITION_COLORS_HEX[k] ?? "#6b7280",
  }));

  const monthLabels = data.byMonth.map((m) => {
    const [y, mo] = m.month.split("-");
    return { ...m, label: `${mo}/${y?.slice(2)}` };
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-xs text-primary neon-glow uppercase tracking-widest">Statistiken</h2>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Einträge gesamt" value={data.total} />
        <StatCard label="Gesamtwert" value={formatPrice(data.totalValue)} />
        <StatCard label="Favoriten" value={data.favorites} />
        <StatCard label="Wunschliste" value={data.wishlist} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Items per collection */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">Einträge pro Sammlung</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byCollection.slice(0, 10)} margin={{ top: 0, right: 0, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                cursor={{ fill: "rgba(255,45,149,0.08)" }}
              />
              <Bar dataKey="count" name="Einträge" radius={[4, 4, 0, 0]}>
                {data.byCollection.slice(0, 10).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Condition distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">Zustand</p>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={conditionData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {conditionData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {conditionData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                    <span className="text-xs text-muted-foreground">{entry.name}</span>
                  </div>
                  <span className="text-xs font-medium text-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Items added per month */}
        {monthLabels.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">Hinzugefügt (letzte 12 Monate)</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthLabels} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff2d95" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff2d95" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                  cursor={{ stroke: "rgba(255,45,149,0.3)" }}
                />
                <Area type="monotone" dataKey="count" name="Einträge" stroke="#ff2d95" strokeWidth={2} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Items per year */}
        {data.byYear.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">Einträge nach Erscheinungsjahr</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.byYear} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
                  cursor={{ fill: "rgba(255,45,149,0.08)" }}
                />
                <Bar dataKey="count" name="Einträge" fill="#00f5d4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>

      {/* Top collections by value */}
      {data.byCollection.some((c) => c.value > 0) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">Wert pro Sammlung</p>
          <div className="space-y-2">
            {data.byCollection
              .filter((c) => c.value > 0)
              .sort((a, b) => b.value - a.value)
              .slice(0, 8)
              .map((col, i) => {
                const maxVal = Math.max(...data.byCollection.map((c) => c.value));
                const pct = maxVal > 0 ? (col.value / maxVal) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-32 text-xs text-muted-foreground truncate shrink-0">{col.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right shrink-0">{formatPrice(col.value)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
