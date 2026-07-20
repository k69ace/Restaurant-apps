import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getUserLocations } from "@/lib/data/workspace";
import { getEntriesInRange, summarizeByDaypart, summarizeByRole } from "@/lib/data/reporting";
import { roundHalfUp } from "@/lib/calculations/labor";
import { RangeControls } from "@/app/app/trend/RangeControls";
import { ExportCsvButton } from "@/app/app/ExportCsvButton";

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 27);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default async function AnalysisPage({
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
        No labor data yet — enter daily numbers first, then role/daypart analysis will appear here.
      </div>
    );
  }

  const selectedLocation = locations.find((l) => l.id === location) ?? locations[0];
  const range = start && end ? { start, end } : defaultRange();

  const entries = await getEntriesInRange(selectedLocation.id, range.start, range.end);
  const [daypartSummaries, roleSummaries] = await Promise.all([
    summarizeByDaypart(selectedLocation.organizationId, selectedLocation.id, entries),
    summarizeByRole(selectedLocation.organizationId, selectedLocation.id, range.start, range.end),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Role &amp; Daypart Analysis</h1>
      <p className="mb-4 text-sm text-muted">{selectedLocation.name}</p>

      <RangeControls
        locations={locations}
        selectedLocationId={selectedLocation.id}
        startDate={range.start}
        endDate={range.end}
        basePath="/app/analysis"
      />

      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">By daypart</h2>
          <ExportCsvButton
            filename={`daypart-analysis-${selectedLocation.name}-${range.start}-to-${range.end}.csv`}
            headers={["Daypart", "Net Sales", "Labor $", "Labor %", "SPLH", "Entries"]}
            rows={daypartSummaries.map((d) => [
              d.daypartLabel,
              roundHalfUp(d.summary.calcInput.netSales ?? 0, 2),
              roundHalfUp(
                d.summary.calcInput.regularLaborDollars +
                  d.summary.calcInput.overtimeDollars +
                  d.summary.calcInput.managementLaborDollars,
                2,
              ),
              d.summary.laborPercent === null ? "" : roundHalfUp(d.summary.laborPercent * 100, 1),
              d.summary.splh === null ? "" : roundHalfUp(d.summary.splh, 2),
              d.summary.entryCount,
            ])}
          />
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-3 py-2 font-medium">Daypart</th>
                <th className="px-3 py-2 font-medium">Net sales</th>
                <th className="px-3 py-2 font-medium">Labor $</th>
                <th className="px-3 py-2 font-medium">Labor %</th>
                <th className="px-3 py-2 font-medium">SPLH</th>
                <th className="px-3 py-2 font-medium">Entries</th>
              </tr>
            </thead>
            <tbody>
              {daypartSummaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-muted">
                    No entries in this range.
                  </td>
                </tr>
              ) : (
                daypartSummaries.map((d) => {
                  const laborDollars =
                    d.summary.calcInput.regularLaborDollars +
                    d.summary.calcInput.overtimeDollars +
                    d.summary.calcInput.managementLaborDollars;
                  return (
                    <tr key={d.daypartId} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{d.daypartLabel}</td>
                      <td className="px-3 py-2 tabular-nums">
                        ${roundHalfUp(d.summary.calcInput.netSales ?? 0, 2).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 tabular-nums">${roundHalfUp(laborDollars, 2).toLocaleString()}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {d.summary.laborPercent === null
                          ? "—"
                          : `${roundHalfUp(d.summary.laborPercent * 100, 1)}%`}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {d.summary.splh === null ? "—" : `$${roundHalfUp(d.summary.splh, 2)}`}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{d.summary.entryCount}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">By role</h2>
          <ExportCsvButton
            filename={`role-analysis-${selectedLocation.name}-${range.start}-to-${range.end}.csv`}
            headers={["Role", "Category", "Hours", "Dollars"]}
            rows={roleSummaries.map((r) => [
              r.roleName,
              r.category,
              roundHalfUp(r.hours, 2),
              roundHalfUp(r.dollars, 2),
            ])}
          />
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Hours</th>
                <th className="px-3 py-2 font-medium">Dollars</th>
              </tr>
            </thead>
            <tbody>
              {roleSummaries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-muted">
                    No role-level detail entered for this range. Role-level entry is optional — see
                    the Daily Entry form.
                  </td>
                </tr>
              ) : (
                roleSummaries.map((r) => (
                  <tr key={r.roleId} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{r.roleName}</td>
                    <td className="px-3 py-2 text-muted">{r.category}</td>
                    <td className="px-3 py-2 tabular-nums">{roundHalfUp(r.hours, 2)}</td>
                    <td className="px-3 py-2 tabular-nums">${roundHalfUp(r.dollars, 2).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
