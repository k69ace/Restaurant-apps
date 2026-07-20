"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOrgSettings } from "@/app/actions/settings";

interface OrgSettingsFormProps {
  organizationId: string;
  editLockHoursAfterBusinessDate: number;
  approvalRequired: boolean;
  guestsPerLaborHourHighThreshold: number;
  scheduledVsActualVarianceThresholdPercent: number;
}

export function OrgSettingsForm(props: OrgSettingsFormProps) {
  const router = useRouter();
  const [editLockHours, setEditLockHours] = useState(String(props.editLockHoursAfterBusinessDate));
  const [approvalRequired, setApprovalRequired] = useState(props.approvalRequired);
  const [guestsThreshold, setGuestsThreshold] = useState(
    String(props.guestsPerLaborHourHighThreshold),
  );
  const [varianceThreshold, setVarianceThreshold] = useState(
    String(props.scheduledVsActualVarianceThresholdPercent),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    setError(null);
    setSaved(false);
    setIsSubmitting(true);
    const result = await saveOrgSettings({
      organizationId: props.organizationId,
      editLockHoursAfterBusinessDate: Number(editLockHours),
      approvalRequired,
      guestsPerLaborHourHighThreshold: Number(guestsThreshold),
      scheduledVsActualVarianceThresholdPercent: Number(varianceThreshold),
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex max-w-md flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm">Edit lock window (hours after business date)</label>
        <input
          type="number"
          min="0"
          value={editLockHours}
          onChange={(e) => setEditLockHours(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
        />
        <p className="text-xs text-muted">
          Default 48 (roughly the end of the following business day). Org Admins can always edit,
          regardless of this window.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={approvalRequired}
          onChange={(e) => setApprovalRequired(e.target.checked)}
        />
        Require a GM to lock a day before it counts in weekly/period rollups
      </label>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm">Understaffing flag: guests/labor-hour high-workload threshold</label>
        <input
          type="number"
          min="0"
          step="0.1"
          value={guestsThreshold}
          onChange={(e) => setGuestsThreshold(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
        />
        <p className="text-xs text-muted">Default 3.5 guests per labor hour.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm">Understaffing flag: scheduled-vs-actual variance threshold (%)</label>
        <input
          type="number"
          min="0"
          step="1"
          value={varianceThreshold}
          onChange={(e) => setVarianceThreshold(e.target.value)}
          className="min-h-11 rounded-lg border border-border bg-transparent px-3 text-sm"
        />
        <p className="text-xs text-muted">Default 10%.</p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSubmitting}
        className="min-h-11 self-start rounded-lg bg-accent px-4 text-sm font-medium text-background disabled:opacity-60"
      >
        Save
      </button>
      {saved && <p className="text-sm text-success">Saved.</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
