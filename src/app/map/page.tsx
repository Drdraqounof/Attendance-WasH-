import type { Metadata } from "next";
import { OpsShell } from "@/components/ops-shell";
import { ROLE_LABELS } from "@/lib/access";
import { DEMO_STATION_TEAMS } from "@/lib/dashboard-mock";
import { routesForScope } from "@/lib/fleet/scoped-routes";
import { requireSession } from "@/lib/session";
import { FleetDashboard } from "./fleet-dashboard";

export const metadata: Metadata = {
  title: "Delivery routes",
};

/** Stations whose mock teams include the drivers, for the empty state. */
const DELIVERY_STATIONS = Object.entries(DEMO_STATION_TEAMS)
  .filter(([, teams]) => teams.includes("Delivery Drivers"))
  .map(([station]) => station);

/**
 * Fleet route map for supervisors (and HR). Demo routes over Boston,
 * street-routed via OSRM, with fuel cost from the EIA gas price — see
 * docs/fleet/map.md. Routes are scoped to the viewer's station like the
 * other mock-backed pages, and carry their mock driver's attendance
 * standing. Toggles and filters are per-viewer view state only; nothing
 * here writes data.
 */
export default async function MapPage() {
  const session = await requireSession();
  const definitions = routesForScope(session.scope);
  const needCover = definitions.filter((d) => d.active && d.driver?.atRisk).length;

  return (
    <OpsShell active="map">
      <main className="relative z-10 mx-auto w-full max-w-[96rem] flex-1 px-6 py-8 sm:px-8 sm:py-10">
        <div className="animate-fade-up">
          <div className="live-pulse mb-4 h-[3px] w-14 sm:w-20" aria-hidden />
          <p className="text-sm font-semibold tracking-[0.16em] text-slate/55 uppercase">Fleet</p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Delivery routes
            </h1>
            <p className="border border-line bg-white/70 px-3 py-1.5 text-sm text-slate/65">
              Demo routes · not live vehicle tracking
            </p>
          </div>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate/75">
            Truck and bike routes across Boston with distance, drive time, fuel cost and
            estimated savings versus an unoptimized sequence, plus each driver&apos;s
            attendance standing. Viewing as {ROLE_LABELS[session.active.role]} ·{" "}
            {session.active.station?.name ?? "All stations"}.
          </p>
          {needCover > 0 && (
            <p className="mt-4 inline-block border border-danger-soft/40 bg-danger-soft/10 px-3 py-2 text-sm text-ink">
              <span className="font-semibold text-danger-soft">
                {needCover} active {needCover === 1 ? "route needs" : "routes need"} cover
              </span>{" "}
              · driver is at the at-risk band or higher.
            </p>
          )}
        </div>

        {definitions.length > 0 ? (
          <FleetDashboard definitions={definitions} />
        ) : (
          <div className="animate-fade-up-delay-1 mt-6 border border-line bg-white/70 px-6 py-10 text-center">
            <p className="font-display text-lg font-semibold text-ink">
              No delivery routes at this station
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate/65">
              Routes belong to the Delivery Drivers team
              {DELIVERY_STATIONS.length > 0 && <> ({DELIVERY_STATIONS.join(", ")})</>}. Switch
              workspace, or ask HR, to view the fleet.
            </p>
          </div>
        )}
      </main>
    </OpsShell>
  );
}
