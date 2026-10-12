"use client";

import { NODES } from "@/lib/fleet/nodes";
import { INCIDENT_PRIORITY, INCIDENT_STYLE } from "@/lib/fleet/theme";
import type {
  DirectionsResponse,
  Incident,
  PlaceResult,
  RouteOption,
  RouteType,
} from "@/lib/fleet/types";

/**
 * "Plan a trip" panels for /map: pick an origin depot, search a
 * destination ("Burger King"), compare up to 3 live routes, and see the
 * blockers (accidents, closures, jams…) on the chosen one. Data comes
 * from use-live.ts. See LIVE_ROUTING_PLAN.md.
 */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-sm font-semibold tracking-[0.14em] text-slate/55 uppercase">
      {children}
    </p>
  );
}

const fmtMin = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)} h ${Math.round(min % 60)} min` : `${Math.round(min)} min`;

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function sortIncidents(incidents: Incident[]): Incident[] {
  return [...incidents].sort(
    (a, b) => INCIDENT_PRIORITY.indexOf(a.kind) - INCIDENT_PRIORITY.indexOf(b.kind),
  );
}

export function IncidentBadge({ incident }: { incident: Incident }) {
  const style = INCIDENT_STYLE[incident.kind];
  return (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center px-1 text-xs font-bold text-white"
      style={{ background: style.color }}
      aria-hidden
    >
      {style.glyph}
    </span>
  );
}

function optionLabel(option: RouteOption, index: number): string {
  return option.isFastest ? "Fastest now" : `Alternate ${index}`;
}

export function TripControls({
  origins,
  origin,
  onOriginChange,
  mode,
  onModeChange,
  search,
  destination,
  onDestinationChange,
  trip,
  selectedOption,
  onSelectOption,
}: {
  origins: string[];
  origin: string;
  onOriginChange: (id: string) => void;
  mode: RouteType;
  onModeChange: (mode: RouteType) => void;
  search: {
    query: string;
    setQuery: (q: string) => void;
    results: PlaceResult[];
    status: "idle" | "loading" | "done" | "unavailable" | "error";
  };
  destination: PlaceResult | null;
  onDestinationChange: (place: PlaceResult | null) => void;
  trip: { data: DirectionsResponse | null; loading: boolean; error: boolean; refresh: () => void };
  selectedOption: string | null;
  onSelectOption: (id: string) => void;
}) {
  const options = trip.data?.options ?? [];
  let alternateIndex = 0;

  return (
    <aside className="flex min-h-0 flex-col overflow-y-auto border border-line bg-white/70" aria-label="Plan a trip">
      <div className="space-y-4 border-b border-line px-5 py-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate/70">From</span>
            <select
              value={origin}
              onChange={(e) => onOriginChange(e.target.value)}
              className="h-10 w-full border border-line bg-white px-2 text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              {origins.map((id) => (
                <option key={id} value={id}>
                  {NODES[id]?.label ?? id}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm">
            <span className="mb-1 block font-medium text-slate/70">Vehicle</span>
            <div className="grid h-10 grid-cols-2 gap-px border border-line bg-line" role="group" aria-label="Vehicle">
              {(["truck", "bike"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => onModeChange(m)}
                  className={`px-3 font-medium capitalize focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                    mode === m ? "bg-ink text-white" : "bg-white text-slate/70 hover:bg-surface-2"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="trip-destination" className="mb-1 block text-sm font-medium text-slate/70">
            To
          </label>
          {destination ? (
            <div className="flex items-start justify-between gap-3 border border-accent/40 bg-accent/5 px-3 py-2">
              <span className="min-w-0 text-sm">
                <span className="block font-semibold text-ink">{destination.name}</span>
                <span className="block truncate text-slate/65">{destination.address}</span>
              </span>
              <button
                type="button"
                onClick={() => onDestinationChange(null)}
                className="shrink-0 text-sm font-medium text-accent-deep underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                id="trip-destination"
                type="search"
                autoComplete="off"
                placeholder="Search a place or address, e.g. Burger King"
                value={search.query}
                onChange={(e) => search.setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.results[0]) onDestinationChange(search.results[0]);
                }}
                className="h-10 w-full border border-line bg-white px-3 text-sm text-ink placeholder:text-slate/45 focus-visible:outline-2 focus-visible:outline-accent"
              />
              <p className="mt-1 text-sm text-slate/55" aria-live="polite">
                {search.status === "loading" && "Searching…"}
                {search.status === "unavailable" && "Live search unavailable — check the TomTom key."}
                {search.status === "error" && "Search failed. Try again."}
                {search.status === "done" && search.results.length === 0 && "No matches near Boston."}
              </p>
              {search.results.length > 0 && (
                <ul className="mt-1 divide-y divide-line/70 border border-line bg-white">
                  {search.results.map((place) => (
                    <li key={place.id}>
                      <button
                        type="button"
                        onClick={() => onDestinationChange(place)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                      >
                        <span className="block font-medium text-ink">{place.name}</span>
                        <span className="block truncate text-slate/60">{place.address}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {destination && (
        <div className="px-5 py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <SectionLabel>Routes</SectionLabel>
            <span className="flex items-center gap-3 text-sm text-slate/55">
              {trip.data && <span>Updated {formatTime(trip.data.fetchedAt)}</span>}
              <button
                type="button"
                onClick={trip.refresh}
                disabled={trip.loading}
                className="font-medium text-accent-deep underline underline-offset-4 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent"
              >
                {trip.loading ? "Refreshing…" : "Refresh"}
              </button>
            </span>
          </div>

          {trip.data && !trip.data.isLive && (
            <p className="mb-3 border border-line bg-surface-2/70 px-3 py-2 text-sm text-slate/70">
              Live traffic unavailable. Showing free-flow estimates with no blockers.
            </p>
          )}
          {trip.error && !trip.data && (
            <p className="text-sm text-danger-soft">Couldn&apos;t load routes. Try Refresh.</p>
          )}
          {!trip.data && trip.loading && <p className="text-sm text-slate/60">Finding routes…</p>}

          <ul className="space-y-2">
            {options.map((option) => {
              const label = optionLabel(option, option.isFastest ? 0 : ++alternateIndex);
              const isSelected = option.id === selectedOption;
              const accidents = option.blockers.filter((b) => b.kind === "accident").length;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => onSelectOption(option.id)}
                    aria-pressed={isSelected}
                    className={`block w-full border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      isSelected ? "border-ink bg-surface-2/80" : "border-line bg-white/80 hover:border-accent/50"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span
                        className={`text-sm font-semibold ${option.isFastest ? "text-accent-deep" : "text-ink"}`}
                      >
                        {label}
                      </span>
                      <span className="font-display text-lg font-semibold tabular-nums text-ink">
                        {fmtMin(option.durationMin)}
                      </span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 text-sm tabular-nums text-slate/65">
                      <span>{option.distanceKm.toFixed(1)} km</span>
                      {option.trafficDelayMin >= 1 && (
                        <span className="text-danger-soft">+{fmtMin(option.trafficDelayMin)} traffic</span>
                      )}
                      {option.blockers.length > 0 ? (
                        <span className={accidents > 0 ? "font-semibold text-[#b91c1c]" : ""}>
                          {option.blockers.length} {option.blockers.length === 1 ? "blocker" : "blockers"}
                          {accidents > 0 && ` · ${accidents} accident${accidents === 1 ? "" : "s"}`}
                        </span>
                      ) : (
                        trip.data?.isLive && <span>No blockers</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}

export function TripDetail({
  option,
  destination,
  isLive,
}: {
  option: RouteOption | undefined;
  destination: PlaceResult | null;
  isLive: boolean;
}) {
  if (!destination || !option) {
    return (
      <aside className="border border-line bg-white/70 px-5 py-6 text-sm leading-relaxed text-slate/65" aria-label="Trip details">
        Search for a destination to compare live routes. The fastest route is picked using
        current traffic, and each route lists what&apos;s in the way: accidents, closures,
        roadworks and jams.
      </aside>
    );
  }

  const blockers = sortIncidents(option.blockers);
  const slowSections = option.trafficSections.filter((s) => s.delaySec > 0);

  return (
    <aside className="flex min-h-0 flex-col overflow-y-auto border border-line bg-white/70" aria-label="Trip details">
      <div className="border-b border-line px-5 py-5">
        <SectionLabel>{option.isFastest ? "Fastest route now" : "Alternate route"}</SectionLabel>
        <p className="font-display text-base font-semibold text-ink">To {destination.name}</p>
        <p className="mt-1 text-sm text-slate/60">{destination.address}</p>
        <dl className="mt-4 grid grid-cols-3 gap-px border border-line bg-line text-sm">
          {[
            ["ETA", fmtMin(option.durationMin)],
            ["Without traffic", fmtMin(option.noTrafficMin)],
            ["Distance", `${option.distanceKm.toFixed(1)} km`],
          ].map(([label, value]) => (
            <div key={label} className="bg-white/90 px-3 py-2">
              <dt className="text-slate/60">{label}</dt>
              <dd className="font-display font-semibold tabular-nums text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="px-5 py-5">
        <SectionLabel>What&apos;s in the way</SectionLabel>
        {!isLive ? (
          <p className="text-sm text-slate/65">Blockers need live traffic, which is unavailable.</p>
        ) : blockers.length === 0 && slowSections.length === 0 ? (
          <p className="text-sm text-slate/65">Nothing reported on this route right now.</p>
        ) : (
          <ul className="space-y-3">
            {blockers.map((b) => (
              <li key={b.id} className="flex items-start gap-3">
                <IncidentBadge incident={b} />
                <span className="min-w-0 text-sm">
                  <span className="block font-semibold text-ink">
                    {INCIDENT_STYLE[b.kind].label}
                    {b.delaySec ? (
                      <span className="font-normal text-danger-soft"> · +{fmtMin(b.delaySec / 60)}</span>
                    ) : null}
                  </span>
                  <span className="block text-slate/70">{b.description}</span>
                  {b.road && <span className="block text-slate/55">{b.road}</span>}
                </span>
              </li>
            ))}
            {slowSections.map((s, i) => (
                <li key={i} className="text-sm text-slate/70">
                  Slow traffic{s.speedKmh ? ` (${s.speedKmh} km/h)` : ""} · +{fmtMin(s.delaySec / 60)}
                </li>
              ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
