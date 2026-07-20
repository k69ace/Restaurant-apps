import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getUserLocations } from "@/lib/data/workspace";
import { getEntriesInRange, summarizeByDay, getActiveTarget } from "@/lib/data/reporting";
import { roundHalfUp } from "@/lib/calculations/labor";
import { RangeControls } from "./RangeControls";
import { LineChart, StackedBarChart } from "./charts";
import { ExportCsvButton } from "@/app/app/ExportCsvButton";

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default async function TrendPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; start?: string; end?: string }>;
}) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const { location, start, end } = await searchParams;
  const locations = await getUserLocations(context);

  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-muted">
        No labor data yet — enter daily numbers first, then trends will appear here.
      </div>
    );
  }

  const selectedLocation = locations.find((l) => l.id === location) ?? locations[0];
  const range = start && end ? { start, end } : defaultRange();

  const [entries, target] = await Promise.all([
    getEntriesInRange(selectedLocation.id, range.start, range.end),
    getActiveTarget(selectedLocation.organizationId, selectedLocation.id, range.end),
  ]);

  const days = summarizeByDay(entries);

  const targetPercent = target?.target_total_labor_percent ?? null;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Weekly Trend</h1>
      <p className="mb-4 text-sm text-muted">{selectedLocation.name}</p>

      <RangeControls
        locations={locations}
        selectedLocationId={selectedLocation.id}
        startDate={range.start}
        endDate={range.end}
        basePath="/app/trend"
      />

      {days.length === 0 ? (
        <div className="rounded-xl border border-border p-6 text-sm text-muted">
          No labor data yet for this date range at {selectedLocation.name}.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-2 text-sm font-semibold">Total Labor % vs target</h2>
            <LineChart
              series={[
                {
                  name: "Total Labor %",
                  color: "#4da3ff",
                  points: days.map((d) => ({
                    label: d.date.slice(5),
                    value: d.laborPercent === null ? null : d.laborPercent * 100,
                  })),
                },
                ...(targetPercent !== null
                  ? [
                      {
                        name: "Target",
                        color: "#f4b740",
                        points: days.map((d) => ({ label: d.date.slice(5), value: targetPercent * 100 })),
                      },
                    ]
                  : []),
              ]}
              formatValue={(v) => `${roundHalfUp(v, 1)}%`}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Sales per Labor Hour trend</h2>
            <LineChart
              series={[
                {
                  name: "SPLH",
                  color: "#4caf7d",
                  points: days.map((d) => ({ label: d.date.slice(5), value: d.splh })),
                },
              ]}
              formatValue={(v) => `$${roundHalfUp(v, 2)}`}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">FOH / BOH / Management labor $ by day</h2>
            <StackedBarChart
              points={days.map((d) => ({
                label: d.date.slice(5),
                segments: [
                  { name: "FOH", color: "#4da3ff", value: d.calcInput.fohLaborDollars },
                  { name: "BOH", color: "#4caf7d", value: d.calcInput.bohLaborDollars },
                  { name: "Management", color: "#f4b740", value: d.calcInput.managementLaborDollars },
                ],
              }))}
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Day-by-day</h2>
              <ExportCsvButton
                filename={`weekly-trend-${selectedLocation.name}-${range.start}-to-${range.end}.csv`}
                headers={["Date", "Net Sales", "Labor $", "Labor %", "SPLH", "OT %"]}
                rows={days.map((d) => [
                  d.date,
                  roundHalfUp(d.calcInput.netSales ?? 0, 2),
                  roundHalfUp(
                    d.calcInput.regularLaborDollars +
                      d.calcInput.overtimeDollars +
                      d.calcInput.managementLaborDollars,
                    2,
                  ),
                  d.laborPercent === null ? "" : roundHalfUp(d.laborPercent * 100, 1),
                  d.splh === null ? "" : roundHalfUp(d.splh, 2),
                  d.otPercent === null ? "" : roundHalfUp(d.otPercent * 100, 1),
                ])}
              />
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Net sales</th>
                    <th className="px-3 py-2 font-medium">Labor $</th>
                    <th className="px-3 py-2 font-medium">Labor %</th>
                    <th className="px-3 py-2 font-medium">SPLH</th>
                    <th className="px-3 py-2 font-medium">OT %</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.date} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{d.date}</td>
                      <td className="px-3 py-2 tabular-nums">
                        ${roundHalfUp(d.calcInput.netSales ?? 0, 2).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        $
                        {roundHalfUp(
                          d.calcInput.regularLaborDollars +
                            d.calcInput.overtimeDollars +
                            d.calcInput.managementLaborDollars,
                          2,
                        ).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {d.laborPercent === null ? "—" : `${roundHalfUp(d.laborPercent * 100, 1)}%`}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {d.splh === null ? "—" : `$${roundHalfUp(d.splh, 2)}`}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {d.otPercent === null ? "—" : `${roundHalfUp(d.otPercent * 100, 1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
