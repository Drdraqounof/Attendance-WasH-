import type { Metadata } from "next";
import { OpsShell } from "@/components/ops-shell";
import { ROLE_LABELS } from "@/lib/access";
import { requireSession } from "@/lib/session";
import { FleetDashboard } from "./fleet-dashboard";

export const metadata: Metadata = {
  title: "Delivery routes",
};

/**
 * Fleet route map for supervisors (and HR). Demo routes over Boston,
 * street-routed via OSRM, with fuel cost from the EIA gas price — see
 * docs/fleet/map.md. Toggles and filters are per-viewer view state
 * only; nothing here writes data.
 */
export default async function MapPage() {
  const session = await requireSession();

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
            estimated savings versus an unoptimized sequence. Viewing as{" "}
            {ROLE_LABELS[session.active.role]} ·{" "}
            {session.active.station?.name ?? "All stations"}.
          </p>
        </div>

        <FleetDashboard />
      </main>
    </OpsShell>
  );
}
