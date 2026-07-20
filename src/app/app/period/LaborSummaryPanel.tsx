import type { CachedLaborSummary } from "@/app/actions/laborSummary";

export function LaborSummaryPanel({ summary }: { summary: CachedLaborSummary }) {
  return (
    <div className="mb-6 rounded-xl border border-border p-4">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold">
          {summary.source === "ai" ? "AI-generated summary" : "Summary"}
        </h2>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-strong">
          Suggested, not certain
        </span>
      </div>
      <p className="text-sm">{summary.summary}</p>
      {summary.flaggedItems.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {summary.flaggedItems.map((item, i) => (
            <li key={i} className="text-xs text-muted">
              <span className="font-medium text-foreground">
                {item.metric}: {item.value}
              </span>{" "}
              — {item.note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
