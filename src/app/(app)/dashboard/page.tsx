const PLACEHOLDER_ITEMS = [
  { id: 1, title: "The Legend of Zelda: Ocarina of Time", platform: "N64",    condition: "MINT",      year: 1998, cover: null },
  { id: 2, title: "Super Mario World",                    platform: "SNES",   condition: "VERY_GOOD", year: 1990, cover: null },
  { id: 3, title: "Sonic the Hedgehog 2",                 platform: "Mega Drive", condition: "GOOD", year: 1992, cover: null },
  { id: 4, title: "Final Fantasy VII",                    platform: "PS1",    condition: "SEALED",    year: 1997, cover: null },
  { id: 5, title: "GoldenEye 007",                        platform: "N64",    condition: "GOOD",      year: 1997, cover: null },
  { id: 6, title: "Donkey Kong Country",                  platform: "SNES",   condition: "VERY_GOOD", year: 1994, cover: null },
];

const CONDITION_COLORS: Record<string, string> = {
  MINT:      "text-green-400 border-green-400/30 bg-green-400/10",
  VERY_GOOD: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  GOOD:      "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  USED:      "text-orange-400 border-orange-400/30 bg-orange-400/10",
  POOR:      "text-red-400 border-red-400/30 bg-red-400/10",
  SEALED:    "text-purple-400 border-purple-400/30 bg-purple-400/10",
};

const CONDITION_LABELS: Record<string, string> = {
  MINT: "Mint", VERY_GOOD: "Very Good", GOOD: "Good",
  USED: "Used", POOR: "Poor", SEALED: "Sealed",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-[10px] text-primary neon-glow uppercase tracking-widest">
            Konsolenspiele
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">6 Items · Sortiert nach Titel</p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-md border border-border p-1">
          {[
            { id: "grid", icon: "▦" },
            { id: "list", icon: "☰" },
          ].map((v) => (
            <button
              key={v.id}
              className={`rounded px-2 py-1 text-xs transition ${v.id === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {PLACEHOLDER_ITEMS.map((item) => (
          <div
            key={item.id}
            className="media-card group relative flex flex-col rounded-lg border border-border bg-card overflow-hidden cursor-pointer"
          >
            {/* Cover */}
            <div className="scanlines relative aspect-[3/4] bg-muted flex items-center justify-center">
              <div className="text-4xl opacity-20">🎮</div>
              {/* Condition badge */}
              <span className={`absolute top-1.5 right-1.5 rounded-full border px-1.5 py-0.5 text-[8px] font-medium uppercase ${CONDITION_COLORS[item.condition]}`}>
                {CONDITION_LABELS[item.condition]}
              </span>
            </div>

            {/* Info */}
            <div className="p-2 space-y-1">
              <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                {item.title}
              </p>
              <div className="flex items-center justify-between">
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">
                  {item.platform}
                </span>
                <span className="text-[9px] text-muted-foreground">{item.year}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Add new item card */}
        <div className="media-card flex aspect-auto min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 transition hover:border-primary hover:bg-primary/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-primary/50 text-primary/50 transition group-hover:border-primary group-hover:text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="mt-2 text-[9px] text-muted-foreground uppercase tracking-wider">Hinzufügen</p>
        </div>
      </div>
    </div>
  );
}
