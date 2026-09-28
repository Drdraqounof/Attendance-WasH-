import { NODES } from "@/lib/fleet/nodes";
import { KPI_COLOR, KPI_MAX } from "@/lib/fleet/theme";
import type { Route } from "@/lib/fleet/types";
import { KpiBar } from "./kpi-bar";
import { StatCell } from "./stat-cell";

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-slate/65">{label}</span>
      <span className="font-medium tabular-nums text-ink">{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
      {children}
    </p>
  );
}

export function RouteDetailPanel({
  routes,
  selectedRoute,
  totalRouteCounts,
}: {
  routes: Route[];
  selectedRoute: Route | undefined;
  totalRouteCounts: { truck: number; bike: number };
}) {
  const active = routes.filter((r) => r.active);
  const totals = {
    timeSaved: active.reduce((s, r) => s + r.savings.time, 0),
    fuelSaved: active.reduce((s, r) => s + r.savings.fuel, 0),
    co2Saved: active.reduce((s, r) => s + r.savings.co2, 0),
    activeTrucks: active.filter((r) => r.type === "truck").length,
    activeBikes: active.filter((r) => r.type === "bike").length,
  };
  const stops = selectedRoute?.stops.filter((s) => NODES[s]) ?? [];
  const endpointTone = selectedRoute?.type === "truck" ? "bg-accent-deep" : "bg-danger-soft";

  return (
    <aside
      className="flex min-h-0 flex-col overflow-y-auto border border-line bg-white/70"
      aria-label="Route details"
    >
      <div className="border-b border-line px-5 py-5">
        <SectionLabel>Estimated savings · active routes</SectionLabel>
        <div className="space-y-3">
          <KpiBar label="Time" value={totals.timeSaved} unit="min" max={KPI_MAX.time} color={KPI_COLOR.time} />
          <KpiBar label="Fuel" value={totals.fuelSaved} unit="USD" max={KPI_MAX.fuel} color={KPI_COLOR.fuel} prefix="$" />
          <KpiBar label="CO₂ avoided" value={totals.co2Saved} unit="kg" max={KPI_MAX.co2} color={KPI_COLOR.co2} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-line bg-line">
        <StatCell label="Trucks" value={totals.activeTrucks} total={totalRouteCounts.truck} tone="text-accent-deep" />
        <StatCell label="Bikes" value={totals.activeBikes} total={totalRouteCounts.bike} tone="text-danger-soft" />
      </div>

      {selectedRoute ? (
        <div className="px-5 py-5">
          <SectionLabel>Route detail</SectionLabel>
          <p className="font-display text-base font-semibold text-ink">{selectedRoute.name}</p>
          <p className="mt-1 text-sm text-slate/60">
            {stops.length} stops · {selectedRoute.distance.toFixed(1)} km
            {selectedRoute.isFallbackGeometry && " · straight-line estimate"}
          </p>

          <div className="mt-4 space-y-2">
            <MetricRow label="Duration" value={`${selectedRoute.duration.toFixed(0)} min`} />
            {selectedRoute.type === "truck" && (
              <>
                <MetricRow label="Fuel cost" value={`$${selectedRoute.fuelCost.toFixed(2)}`} />
                <MetricRow label="CO₂ output" value={`${selectedRoute.co2.toFixed(1)} kg`} />
              </>
            )}
          </div>

          <p className="mt-5 mb-2 text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
            vs. unoptimized
          </p>
          <div className="space-y-2">
            <MetricRow label="Time" value={`−${selectedRoute.savings.time.toFixed(0)} min`} />
            <MetricRow label="Fuel" value={`−$${selectedRoute.savings.fuel.toFixed(2)}`} />
            <MetricRow label="CO₂" value={`−${selectedRoute.savings.co2.toFixed(1)} kg`} />
          </div>

          <p className="mt-5 mb-2 text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
            Stop sequence
          </p>
          <ol className="space-y-0.5">
            {stops.map((stop, i) => {
              const isEndpoint = i === 0 || i === stops.length - 1;
              return (
                <li key={`${stop}-${i}`} className="flex items-start gap-2.5">
                  <span className="flex flex-col items-center pt-1.5">
                    <span
                      className={`h-2 w-2 rounded-full border ${
                        isEndpoint ? `${endpointTone} border-transparent` : "border-slate/40 bg-white"
                      }`}
                    />
                    {i < stops.length - 1 && <span className="h-4 w-px bg-line" />}
                  </span>
                  <span className="text-sm text-slate/80">{NODES[stop]?.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-slate/65">Select a route to see its details.</p>
      )}
    </aside>
  );
}
