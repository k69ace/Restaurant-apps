import { roundHalfUp } from "@/lib/calculations/labor";
import type { KpiComparison } from "@/lib/data/dashboard";

interface KpiCardProps {
  label: string;
  comparison: KpiComparison;
  format: (value: number) => string;
  /** Lower is better (e.g. Total Labor %, OT %) vs higher is better (e.g.
   * SPLH). Only used to color the target comparison — never applied without
   * a configured target, per the brief: never imply good/bad without one. */
  lowerIsBetter: boolean;
}

export function KpiCard({ label, comparison, format, lowerIsBetter }: KpiCardProps) {
  const { value, targetValue, trailingAverageValue } = comparison;

  let colorClass = "text-foreground";
  if (value !== null && targetValue !== null) {
    const diff = lowerIsBetter ? value - targetValue : targetValue - value;
    if (diff <= 0) colorClass = "text-success";
    else if (diff <= targetValue * 0.05) colorClass = "text-warning";
    else colorClass = "text-danger";
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${colorClass}`}>
        {value === null ? "—" : format(value)}
      </p>
      <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted">
        <span>{targetValue === null ? "No target set" : `Target: ${format(targetValue)}`}</span>
        <span>
          {trailingAverageValue === null
            ? "No trailing-average data yet"
            : `Trailing 4-wk avg: ${format(trailingAverageValue)}`}
        </span>
      </div>
    </div>
  );
}

export function formatPercent(value: number): string {
  return `${roundHalfUp(value * 100, 1)}%`;
}

export function formatDollarsPerHour(value: number): string {
  return `$${roundHalfUp(value, 2).toLocaleString()}/hr`;
}

export function formatGuestsPerHour(value: number): string {
  return `${roundHalfUp(value, 1)}`;
}
