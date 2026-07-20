"use client";

import { useRouter } from "next/navigation";
import type { LocationSummary } from "@/lib/data/workspace";

interface EntryControlsProps {
  locations: LocationSummary[];
  selectedLocationId: string;
  businessDate: string;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function EntryControls({ locations, selectedLocationId, businessDate }: EntryControlsProps) {
  const router = useRouter();

  function navigate(locationId: string, date: string) {
    router.push(`/app/entry?location=${locationId}&date=${date}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {locations.length > 1 && (
        <select
          aria-label="Location"
          value={selectedLocationId}
          onChange={(e) => navigate(e.target.value, businessDate)}
          className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => navigate(selectedLocationId, shiftDate(businessDate, -1))}
          className="min-h-11 min-w-11 rounded-lg border border-border text-lg"
        >
          ‹
        </button>
        <input
          type="date"
          aria-label="Business date"
          value={businessDate}
          onChange={(e) => e.target.value && navigate(selectedLocationId, e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
        />
        <button
          type="button"
          aria-label="Next day"
          onClick={() => navigate(selectedLocationId, shiftDate(businessDate, 1))}
          className="min-h-11 min-w-11 rounded-lg border border-border text-lg"
        >
          ›
        </button>
      </div>
    </div>
  );
}
