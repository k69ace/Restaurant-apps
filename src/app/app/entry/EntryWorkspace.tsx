"use client";

import { useState } from "react";
import { EntryForm } from "./EntryForm";
import type { DaypartConfig, LaborEntryRow, LaborTargetRow } from "@/lib/data/laborEntries";

interface EntryWorkspaceProps {
  organizationId: string;
  locationId: string;
  businessDate: string;
  dayparts: DaypartConfig[];
  entriesByDaypart: Record<string, LaborEntryRow | null>;
  target: LaborTargetRow | null;
  canEdit: boolean;
}

export function EntryWorkspace({
  organizationId,
  locationId,
  businessDate,
  dayparts,
  entriesByDaypart,
  target,
  canEdit,
}: EntryWorkspaceProps) {
  const [selectedDaypartId, setSelectedDaypartId] = useState(dayparts[0]?.id);

  if (dayparts.length === 0) {
    return (
      <p className="rounded-lg border border-border p-4 text-sm text-muted">
        No dayparts are configured for this location yet. An Org Admin can add them from Settings
        &gt; Dayparts.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Daypart" className="flex flex-wrap gap-2">
        {dayparts.map((dp) => (
          <button
            key={dp.id}
            role="tab"
            aria-selected={selectedDaypartId === dp.id}
            onClick={() => setSelectedDaypartId(dp.id)}
            className={`min-h-11 rounded-lg border px-4 text-sm font-medium ${
              selectedDaypartId === dp.id
                ? "border-accent bg-accent-soft text-accent-strong"
                : "border-border"
            }`}
          >
            {dp.label}
            {entriesByDaypart[dp.id] && (
              <span className="ml-1.5 text-xs text-muted">
                ({entriesByDaypart[dp.id]!.status})
              </span>
            )}
          </button>
        ))}
      </div>

      {dayparts.map(
        (dp) =>
          selectedDaypartId === dp.id && (
            <EntryForm
              key={dp.id}
              organizationId={organizationId}
              locationId={locationId}
              businessDate={businessDate}
              daypartId={dp.id}
              daypartLabel={dp.label}
              initialEntry={entriesByDaypart[dp.id] ?? null}
              target={target}
              canEdit={canEdit}
            />
          ),
      )}
    </div>
  );
}
