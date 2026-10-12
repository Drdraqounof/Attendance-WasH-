import type { Route, RouteType } from "@/lib/fleet/types";

export type RouteFilter = "all" | RouteType;

const FILTER_LABELS: Record<RouteFilter, string> = {
  all: "All routes",
  truck: "Trucks",
  bike: "Bikes",
};

function typeBadge(type: RouteType): string {
  return type === "truck"
    ? "border-accent-deep/40 bg-accent/10 text-accent-deep"
    : "border-danger-soft/40 bg-danger-soft/10 text-danger-soft";
}

export function RouteSidebar({
  routes,
  filter,
  selected,
  onFilterChange,
  onSelect,
  onToggle,
}: {
  routes: Route[];
  filter: RouteFilter;
  selected: string | null;
  onFilterChange: (f: RouteFilter) => void;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const visible = routes.filter((r) => filter === "all" || r.type === filter);

  return (
    <aside
      className="flex min-h-0 flex-col border border-line bg-white/70"
      aria-label="Routes"
    >
      <div className="grid grid-cols-3 gap-px border-b border-line bg-line" role="group" aria-label="Filter routes">
        {(["all", "truck", "bike"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            aria-pressed={filter === f}
            className={`px-2 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
              filter === f ? "bg-ink text-white" : "bg-white/90 text-slate/70 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-line/70 overflow-y-auto">
        {visible.map((route) => {
          const isSelected = selected === route.id;
          return (
            <li
              key={route.id}
              className={`flex items-start gap-3 px-4 py-3.5 ${isSelected ? "bg-surface-2/80" : ""}`}
            >
              <button
                type="button"
                onClick={() => onSelect(route.id)}
                aria-current={isSelected ? "true" : undefined}
                className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                <span className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-block border px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.08em] uppercase ${typeBadge(route.type)}`}
                  >
                    {route.type}
                  </span>
                  {route.driver?.atRisk && (
                    <span className="inline-block border border-danger-soft bg-danger-soft px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.08em] text-white uppercase">
                      Needs cover
                    </span>
                  )}
                </span>
                <span
                  className={`mt-1.5 block text-sm font-medium leading-snug ${
                    route.active ? "text-ink" : "text-slate/50"
                  }`}
                >
                  {route.name}
                </span>
                <span className="mt-0.5 block text-sm text-slate/65">
                  {route.driver ? `Driver: ${route.driver.name}` : "No driver assigned"}
                </span>
                <span className="mt-1 flex flex-wrap gap-x-3 text-sm tabular-nums text-slate/60">
                  <span>{route.distance.toFixed(1)} km</span>
                  <span>{route.duration.toFixed(0)} min</span>
                  {route.type === "truck" && <span>${route.fuelCost.toFixed(2)}</span>}
                  {route.isFallbackGeometry && (
                    <span title="Live routing unavailable — straight-line estimate">≈ estimate</span>
                  )}
                </span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={route.active}
                aria-label={`Show ${route.name} on the map`}
                onClick={() => onToggle(route.id)}
                className={`relative mt-0.5 h-5 w-9 shrink-0 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  route.active ? "border-accent-deep bg-accent-deep" : "border-line bg-surface-2"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3.5 w-3.5 bg-white shadow-sm transition-[left] ${
                    route.active ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
