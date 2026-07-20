import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getUserLocations } from "@/lib/data/workspace";
import { getDailyDashboardData } from "@/lib/data/dashboard";
import { EntryControls } from "@/app/app/entry/EntryControls";
import { KpiCard, formatDollarsPerHour, formatGuestsPerHour, formatPercent } from "./KpiCard";
import { DaypartTable } from "./DaypartTable";
import { PrintButton } from "./PrintButton";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; date?: string }>;
}) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const { location, date } = await searchParams;
  const locations = await getUserLocations(context);

  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-muted">
        No labor data yet for this location — enter today&apos;s numbers to get started.
      </div>
    );
  }

  const selectedLocation = locations.find((l) => l.id === location) ?? locations[0];
  const businessDate = date ?? todayIso();

  const data = await getDailyDashboardData(
    selectedLocation.organizationId,
    selectedLocation.id,
    businessDate,
  );

  return (
    <div className="print-page">
      <div className="no-print mb-4 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Daily Dashboard</h1>
          <p className="text-sm text-muted">{selectedLocation.name}</p>
        </div>
        <PrintButton />
      </div>

      <h1 className="mb-1 hidden text-xl font-semibold print:block">
        {selectedLocation.name} — Daily Labor Report
      </h1>
      <p className="mb-4 hidden text-sm print:block">{businessDate}</p>

      <div className="no-print">
        <EntryControls
          locations={locations}
          selectedLocationId={selectedLocation.id}
          businessDate={businessDate}
        />
      </div>

      {!data.hasAnyEntries ? (
        <div className="rounded-xl border border-border p-6 text-sm text-muted">
          No labor data yet for {businessDate} at {selectedLocation.name} — enter today&apos;s
          numbers on the Daily Entry page to get started.
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total Labor %"
              comparison={data.kpis.totalLaborPercent}
              format={formatPercent}
              lowerIsBetter
            />
            <KpiCard
              label="Sales per Labor Hour"
              comparison={data.kpis.splhActual}
              format={formatDollarsPerHour}
              lowerIsBetter={false}
            />
            <KpiCard
              label="Guests per Labor Hour"
              comparison={data.kpis.guestsPerLaborHourActual}
              format={formatGuestsPerHour}
              lowerIsBetter={false}
            />
            <KpiCard
              label="OT % of Labor"
              comparison={data.kpis.overtimePercent}
              format={formatPercent}
              lowerIsBetter
            />
          </div>

          <DaypartTable rows={data.dayparts} />

          {data.dayparts.some((r) => r.understaffing?.flagged) && (
            <p className="mt-4 text-xs text-muted">
              &quot;Possible understaffing&quot; is a flag for human review, not a certainty — it
              means labor % ran meaningfully below target alongside a workload signal (high
              guests/labor-hour, or hours cut well below schedule with sales at or above the
              trailing average). Worth a look, not an alarm.
            </p>
          )}
        </>
      )}
    </div>
  );
}
