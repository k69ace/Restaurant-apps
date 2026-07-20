"use client";

import { useRouter } from "next/navigation";
import type { LocationSummary } from "@/lib/data/workspace";

interface RangeControlsProps {
  locations: LocationSummary[];
  selectedLocationId: string;
  startDate: string;
  endDate: string;
  basePath: string;
}

export function RangeControls({
  locations,
  selectedLocationId,
  startDate,
  endDate,
  basePath,
}: RangeControlsProps) {
  const router = useRouter();

  function navigate(locationId: string, start: string, end: string) {
    router.push(`${basePath}?location=${locationId}&start=${start}&end=${end}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {locations.length > 1 && (
        <select
          aria-label="Location"
          value={selectedLocationId}
          onChange={(e) => navigate(e.target.value, startDate, endDate)}
          className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      )}

      <label className="flex items-center gap-2 text-sm">
        From
        <input
          type="date"
          value={startDate}
          onChange={(e) => navigate(selectedLocationId, e.target.value, endDate)}
          className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        To
        <input
          type="date"
          value={endDate}
          onChange={(e) => navigate(selectedLocationId, startDate, e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
        />
      </label>
    </div>
  );
}
