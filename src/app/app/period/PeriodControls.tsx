"use client";

import { useRouter } from "next/navigation";
import type { LocationSummary } from "@/lib/data/workspace";

interface PeriodControlsProps {
  locations: LocationSummary[];
  selectedLocationId: string;
  startA: string;
  endA: string;
  startB: string;
  endB: string;
}

export function PeriodControls({
  locations,
  selectedLocationId,
  startA,
  endA,
  startB,
  endB,
}: PeriodControlsProps) {
  const router = useRouter();

  function navigate(next: Partial<{ location: string; startA: string; endA: string; startB: string; endB: string }>) {
    const params = new URLSearchParams({
      location: next.location ?? selectedLocationId,
      startA: next.startA ?? startA,
      endA: next.endA ?? endA,
      startB: next.startB ?? startB,
      endB: next.endB ?? endB,
    });
    router.push(`/app/period?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      {locations.length > 1 && (
        <select
          aria-label="Location"
          value={selectedLocationId}
          onChange={(e) => navigate({ location: e.target.value })}
          className="min-h-11 w-fit rounded-lg border border-border bg-transparent px-3 text-sm"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Period A</span>
        <input
          type="date"
          aria-label="Period A start"
          value={startA}
          onChange={(e) => navigate({ startA: e.target.value })}
          className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
        />
        <span className="text-muted">to</span>
        <input
          type="date"
          aria-label="Period A end"
          value={endA}
          onChange={(e) => navigate({ endA: e.target.value })}
          className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Period B</span>
        <input
          type="date"
          aria-label="Period B start"
          value={startB}
          onChange={(e) => navigate({ startB: e.target.value })}
          className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
        />
        <span className="text-muted">to</span>
        <input
          type="date"
          aria-label="Period B end"
          value={endB}
          onChange={(e) => navigate({ endB: e.target.value })}
          className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
        />
      </div>
    </div>
  );
}
