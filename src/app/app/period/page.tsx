import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getUserLocations } from "@/lib/data/workspace";
import { getEntriesInRange, summarizePeriod, getActiveTarget } from "@/lib/data/reporting";
import { roundHalfUp, understaffingRisk, DEFAULT_UNDERSTAFFING_THRESHOLDS } from "@/lib/calculations/labor";
import { PeriodControls } from "./PeriodControls";
import { PeriodSummaryCard } from "./PeriodSummaryCard";
import { ExportCsvButton } from "@/app/app/ExportCsvButton";
import { getPeriodSummaryCached } from "@/app/actions/laborSummary";
import { LaborSummaryPanel } from "./LaborSummaryPanel";
import { createClient } from "@/lib/supabase/server";

function defaultPeriods() {
  const endA = new Date();
  const startA = new Date();
  startA.setDate(startA.getDate() - 6);
  const endB = new Date(startA);
  endB.setDate(endB.getDate() - 1);
  const startB = new Date(endB);
  startB.setDate(startB.getDate() - 6);

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { startA: iso(startA), endA: iso(endA), startB: iso(startB), endB: iso(endB) };
}

export default async function PeriodPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; startA?: string; endA?: string; startB?: string; endB?: string }>;
}) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const params = await searchParams;
  const locations = await getUserLocations(context);

  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-muted">
        No labor data yet — enter daily numbers first, then period comparisons will appear here.
      </div>
    );
  }

  const selectedLocation = locations.find((l) => l.id === params.location) ?? locations[0];
  const defaults = defaultPeriods();
  const startA = params.startA ?? defaults.startA;
  const endA = params.endA ?? defaults.endA;
  const startB = params.startB ?? defaults.startB;
  const endB = params.endB ?? defaults.endB;

  const [entriesA, entriesB] = await Promise.all([
    getEntriesInRange(selectedLocation.id, startA, endA),
    getEntriesInRange(selectedLocation.id, startB, endB),
  ]);

  const summaryA = summarizePeriod(entriesA);
  const summaryB = summarizePeriod(entriesB);

  const target = await getActiveTarget(selectedLocation.organizationId, selectedLocation.id, endA);
  const supabase = await createClient();
  const { data: orgSettings } = await supabase
    .from("org_settings")
    .select("guests_per_labor_hour_high_threshold, scheduled_vs_actual_variance_threshold_percent")
    .eq("organization_id", selectedLocation.organizationId)
    .maybeSingle();
  const thresholds = orgSettings
    ? {
        guestsPerLaborHourHighThreshold: orgSettings.guests_per_labor_hour_high_threshold,
        scheduledVsActualVarianceThresholdPercent:
          orgSettings.scheduled_vs_actual_variance_threshold_percent,
      }
    : DEFAULT_UNDERSTAFFING_THRESHOLDS;

  // Per-entry flag count for the summary panel. Simplified vs. the Daily
  // Dashboard's per-daypart flag (which also checks hours-variance against
  // a trailing-average forecast) — here only the guests/labor-hour signal
  // is evaluated, since a period-level trailing-average-per-entry lookup
  // isn't computed on this page. Illustrative for the summary, not the
  // source of truth for any single day's flag.
  const understaffingFlagCount = target
    ? entriesA.filter(
        (e) =>
          understaffingRisk(
            {
              netSales: e.net_sales,
              guestCount: e.guest_count,
              scheduledHours: e.scheduled_hours,
              actualHours: e.actual_hours,
              scheduledLaborDollars: e.scheduled_labor_dollars,
              regularLaborDollars: e.regular_labor_dollars,
              overtimeHours: e.overtime_hours,
              overtimeDollars: e.overtime_dollars,
              fohLaborDollars: e.foh_labor_dollars,
              bohLaborDollars: e.boh_labor_dollars,
              managementLaborDollars: e.management_labor_dollars,
            },
            { targetTotalLaborPercent: target.target_total_labor_percent },
            thresholds,
          ).flagged,
      ).length
    : 0;

  const laborSummary = await getPeriodSummaryCached(
    selectedLocation.organizationId,
    selectedLocation.id,
    startA,
    endA,
    {
      locationName: selectedLocation.name,
      periodLabel: `${startA} to ${endA}`,
      netSales: summaryA.calcInput.netSales,
      laborDollars:
        summaryA.calcInput.regularLaborDollars +
        summaryA.calcInput.overtimeDollars +
        summaryA.calcInput.managementLaborDollars,
      laborPercent: summaryA.laborPercent,
      targetPercent: target?.target_total_labor_percent ?? null,
      splh: summaryA.splh,
      otPercent: summaryA.otPercent,
      fohLaborDollars: summaryA.calcInput.fohLaborDollars,
      bohLaborDollars: summaryA.calcInput.bohLaborDollars,
      managementLaborDollars: summaryA.calcInput.managementLaborDollars,
      understaffingFlagCount,
      comparison:
        entriesB.length > 0
          ? { periodLabel: `${startB} to ${endB}`, laborPercent: summaryB.laborPercent, netSales: summaryB.calcInput.netSales }
          : undefined,
    },
  );

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Period Comparison</h1>
      <p className="mb-4 text-sm text-muted">{selectedLocation.name}</p>

      <PeriodControls
        locations={locations}
        selectedLocationId={selectedLocation.id}
        startA={startA}
        endA={endA}
        startB={startB}
        endB={endB}
      />

      <LaborSummaryPanel summary={laborSummary} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PeriodSummaryCard label={`Period A: ${startA} to ${endA}`} summary={summaryA} comparisonSummary={summaryB} />
        <PeriodSummaryCard label={`Period B: ${startB} to ${endB}`} summary={summaryB} />
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Period A — raw entries + computed metrics</h2>
        <ExportCsvButton
          filename={`period-comparison-${selectedLocation.name}-${startA}-to-${endA}.csv`}
          headers={[
            "Business Date",
            "Net Sales",
            "Gross Sales",
            "Guest Count",
            "Scheduled Hours",
            "Actual Hours",
            "Regular Labor $",
            "OT Hours",
            "OT $",
            "FOH $",
            "BOH $",
            "Management $",
            "Status",
          ]}
          rows={entriesA.map((e) => [
            e.business_date,
            e.net_sales,
            e.gross_sales ?? "",
            e.guest_count ?? "",
            e.scheduled_hours,
            e.actual_hours,
            e.regular_labor_dollars,
            e.overtime_hours,
            e.overtime_dollars,
            e.foh_labor_dollars,
            e.boh_labor_dollars,
            e.management_labor_dollars,
            e.status,
          ])}
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Net sales</th>
              <th className="px-3 py-2 font-medium">Actual hrs</th>
              <th className="px-3 py-2 font-medium">Labor $</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entriesA.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted">
                  No entries in Period A.
                </td>
              </tr>
            ) : (
              entriesA.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{e.business_date}</td>
                  <td className="px-3 py-2 tabular-nums">${roundHalfUp(e.net_sales, 2).toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{e.actual_hours}</td>
                  <td className="px-3 py-2 tabular-nums">
                    $
                    {roundHalfUp(
                      e.regular_labor_dollars + e.overtime_dollars + e.management_labor_dollars,
                      2,
                    ).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-muted">{e.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
