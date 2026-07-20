"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveLaborTarget } from "@/app/actions/settings";

interface TargetRow {
  id: string;
  location_id: string | null;
  effective_date: string;
  target_total_labor_percent: number;
  target_foh_percent: number | null;
  target_boh_percent: number | null;
  target_management_percent: number | null;
  include_management_in_productive: boolean;
  target_overtime_percent: number | null;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function TargetForm({
  organizationId,
  locationId,
  targets,
}: {
  organizationId: string;
  locationId: string | null;
  targets: TargetRow[];
}) {
  const router = useRouter();
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalPercent, setTotalPercent] = useState("29");
  const [fohPercent, setFohPercent] = useState("");
  const [bohPercent, setBohPercent] = useState("");
  const [mgmtPercent, setMgmtPercent] = useState("");
  const [otPercent, setOtPercent] = useState("");
  const [includeManagement, setIncludeManagement] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    const result = await saveLaborTarget({
      organizationId,
      locationId,
      effectiveDate,
      targetTotalLaborPercent: Number(totalPercent) / 100,
      targetFohPercent: fohPercent.trim() === "" ? null : Number(fohPercent) / 100,
      targetBohPercent: bohPercent.trim() === "" ? null : Number(bohPercent) / 100,
      targetManagementPercent: mgmtPercent.trim() === "" ? null : Number(mgmtPercent) / 100,
      includeManagementInProductive: includeManagement,
      targetOvertimePercent: otPercent.trim() === "" ? null : Number(otPercent) / 100,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-3 py-2 font-medium">Effective</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2 font-medium">FOH</th>
              <th className="px-3 py-2 font-medium">BOH</th>
              <th className="px-3 py-2 font-medium">Mgmt</th>
              <th className="px-3 py-2 font-medium">OT</th>
            </tr>
          </thead>
          <tbody>
            {targets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted">
                  No targets set yet — dashboards will show &quot;no target set&quot; until one is
                  added.
                </td>
              </tr>
            ) : (
              targets.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{t.effective_date}</td>
                  <td className="px-3 py-2 tabular-nums">{pct(t.target_total_labor_percent)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {t.target_foh_percent === null ? "—" : pct(t.target_foh_percent)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {t.target_boh_percent === null ? "—" : pct(t.target_boh_percent)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {t.target_management_percent === null ? "—" : pct(t.target_management_percent)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {t.target_overtime_percent === null ? "—" : pct(t.target_overtime_percent)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold">Set a target (effective from a date)</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Effective date" type="date" value={effectiveDate} onChange={setEffectiveDate} />
          <Field label="Total labor %" value={totalPercent} onChange={setTotalPercent} suffix="%" />
          <Field label="OT %" value={otPercent} onChange={setOtPercent} suffix="%" />
          <Field label="FOH %" value={fohPercent} onChange={setFohPercent} suffix="%" />
          <Field label="BOH %" value={bohPercent} onChange={setBohPercent} suffix="%" />
          <Field label="Management %" value={mgmtPercent} onChange={setMgmtPercent} suffix="%" />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeManagement}
            onChange={(e) => setIncludeManagement(e.target.checked)}
          />
          Include management $ in Productive Labor % (unchecked = Productive % excludes management)
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="mt-3 min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-background disabled:opacity-60"
        >
          Save target
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "number",
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 w-full rounded-lg border border-border bg-transparent px-3 text-sm"
        />
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </div>
    </div>
  );
}
