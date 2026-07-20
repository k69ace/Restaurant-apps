"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDaypart, setDaypartActive } from "@/app/actions/settings";

interface DaypartRow {
  id: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export function DaypartForm({
  organizationId,
  locationId,
  dayparts,
  canEdit,
}: {
  organizationId: string;
  locationId: string;
  dayparts: DaypartRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd() {
    setError(null);
    setIsSubmitting(true);
    const result = await saveDaypart({
      organizationId,
      locationId,
      code,
      label,
      sortOrder: dayparts.length,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode("");
    setLabel("");
    router.refresh();
  }

  async function handleToggle(daypartId: string, isActive: boolean) {
    await setDaypartActive(organizationId, daypartId, !isActive);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-3 py-2 font-medium">Label</th>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Active</th>
              {canEdit && <th className="px-3 py-2 font-medium">Action</th>}
            </tr>
          </thead>
          <tbody>
            {dayparts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted">
                  No dayparts configured yet.
                </td>
              </tr>
            ) : (
              dayparts.map((dp) => (
                <tr key={dp.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{dp.label}</td>
                  <td className="px-3 py-2 text-muted">{dp.code}</td>
                  <td className="px-3 py-2">{dp.is_active ? "Yes" : "No"}</td>
                  {canEdit && (
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(dp.id, dp.is_active)}
                        className="text-sm text-accent-strong underline"
                      >
                        {dp.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">Add a daypart</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="daypart-label" className="text-sm">
                Label
              </label>
              <input
                id="daypart-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Brunch"
                className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="daypart-code" className="text-sm">
                Code
              </label>
              <input
                id="daypart-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. brunch"
                className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isSubmitting || !code || !label}
              className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-background disabled:opacity-60"
            >
              Add
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
