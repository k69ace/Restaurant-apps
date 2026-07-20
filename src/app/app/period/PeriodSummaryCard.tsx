import { roundHalfUp } from "@/lib/calculations/labor";
import type { PeriodSummary } from "@/lib/data/reporting";

function formatPercentVariance(a: number | null, b: number | null): string {
  if (a === null || b === null) return "—";
  const diffPoints = (a - b) * 100;
  const sign = diffPoints > 0 ? "+" : "";
  return `${sign}${roundHalfUp(diffPoints, 1)} pts`;
}

export function PeriodSummaryCard({
  label,
  summary,
  comparisonSummary,
}: {
  label: string;
  summary: PeriodSummary;
  comparisonSummary?: PeriodSummary;
}) {
  const totalLaborDollars =
    summary.calcInput.regularLaborDollars +
    summary.calcInput.overtimeDollars +
    summary.calcInput.managementLaborDollars;

  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold">{label}</h3>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Metric
          label="Net sales"
          value={`$${roundHalfUp(summary.calcInput.netSales ?? 0, 2).toLocaleString()}`}
        />
        <Metric label="Labor $" value={`$${roundHalfUp(totalLaborDollars, 2).toLocaleString()}`} />
        <Metric
          label="Labor %"
          value={summary.laborPercent === null ? "—" : `${roundHalfUp(summary.laborPercent * 100, 1)}%`}
          delta={
            comparisonSummary
              ? formatPercentVariance(summary.laborPercent, comparisonSummary.laborPercent)
              : undefined
          }
        />
        <Metric
          label="SPLH"
          value={summary.splh === null ? "—" : `$${roundHalfUp(summary.splh, 2)}`}
        />
        <Metric
          label="OT %"
          value={summary.otPercent === null ? "—" : `${roundHalfUp(summary.otPercent * 100, 1)}%`}
        />
        <Metric label="Entries" value={String(summary.entryCount)} />
      </dl>
    </div>
  );
}

function Metric({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular-nums">
        {value}
        {delta && <span className="ml-1.5 text-xs text-muted">({delta} vs B)</span>}
      </dd>
    </div>
  );
}
