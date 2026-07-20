import { roundHalfUp, totalLaborPercent, salesPerLaborHour } from "@/lib/calculations/labor";
import type { DaypartDashboardRow } from "@/lib/data/dashboard";

export function DaypartTable({ rows }: { rows: DaypartDashboardRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="sticky top-0 bg-background">
          <tr className="border-b border-border text-left text-muted">
            <th className="px-3 py-2 font-medium">Daypart</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Net sales</th>
            <th className="px-3 py-2 font-medium">Labor $</th>
            <th className="px-3 py-2 font-medium">Labor %</th>
            <th className="px-3 py-2 font-medium">SPLH</th>
            <th className="px-3 py-2 font-medium">Flag</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ daypart, entry, calcInput, understaffing }) => {
            const laborPercent = calcInput ? totalLaborPercent(calcInput) : null;
            const splh = calcInput ? salesPerLaborHour(calcInput, "actual") : null;
            const laborDollars =
              calcInput &&
              calcInput.regularLaborDollars + calcInput.overtimeDollars + calcInput.managementLaborDollars;

            return (
              <tr key={daypart.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{daypart.label}</td>
                <td className="px-3 py-2 text-muted">{entry ? entry.status : "No entry"}</td>
                <td className="px-3 py-2 tabular-nums">
                  {entry ? `$${roundHalfUp(entry.net_sales, 2).toLocaleString()}` : "—"}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {laborDollars !== null && laborDollars !== undefined
                    ? `$${roundHalfUp(laborDollars, 2).toLocaleString()}`
                    : "—"}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {laborPercent === null ? "—" : `${roundHalfUp(laborPercent * 100, 1)}%`}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {splh === null ? "—" : `$${roundHalfUp(splh, 2).toLocaleString()}`}
                </td>
                <td className="px-3 py-2">
                  {understaffing?.flagged ? (
                    <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
                      Possible understaffing — for review
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
