"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NumberField } from "./NumberField";
import { saveLaborEntry, type SaveLaborEntryInput } from "@/app/actions/laborEntries";
import { validateLaborEntryInput, type LaborEntryFormValues } from "@/lib/validation/laborEntry";
import {
  breakEvenSalesForCurrentLaborSpend,
  overtimePercent,
  roundHalfUp,
  totalLaborDollars,
  totalLaborPercent,
  type LaborEntryInput,
} from "@/lib/calculations/labor";
import type { Tables } from "@/lib/supabase/types";

type LaborEntryRow = Tables<"labor_entries">;
type LaborTargetRow = Tables<"labor_targets">;

interface EntryFormProps {
  organizationId: string;
  locationId: string;
  businessDate: string;
  daypartId: string;
  daypartLabel: string;
  initialEntry: LaborEntryRow | null;
  target: LaborTargetRow | null;
  canEdit: boolean;
}

type FormState = {
  netSales: string;
  guestCount: string;
  transactionCount: string;
  grossSales: string;
  discountsComps: string;
  scheduledHours: string;
  actualHours: string;
  scheduledLaborDollars: string;
  regularLaborDollars: string;
  overtimeHours: string;
  overtimeDollars: string;
  fohLaborDollars: string;
  bohLaborDollars: string;
  managementLaborDollars: string;
  cateringEventLaborDollars: string;
  notes: string;
  weatherOrEventNote: string;
};

const EMPTY_STATE: FormState = {
  netSales: "",
  guestCount: "",
  transactionCount: "",
  grossSales: "",
  discountsComps: "",
  scheduledHours: "",
  actualHours: "",
  scheduledLaborDollars: "",
  regularLaborDollars: "",
  overtimeHours: "",
  overtimeDollars: "",
  fohLaborDollars: "",
  bohLaborDollars: "",
  managementLaborDollars: "",
  cateringEventLaborDollars: "",
  notes: "",
  weatherOrEventNote: "",
};

function rowToFormState(row: LaborEntryRow | null): FormState {
  if (!row) return EMPTY_STATE;
  return {
    netSales: String(row.net_sales ?? ""),
    guestCount: row.guest_count === null ? "" : String(row.guest_count),
    transactionCount: row.transaction_count === null ? "" : String(row.transaction_count),
    grossSales: row.gross_sales === null ? "" : String(row.gross_sales),
    discountsComps: row.discounts_comps === null ? "" : String(row.discounts_comps),
    scheduledHours: String(row.scheduled_hours ?? ""),
    actualHours: String(row.actual_hours ?? ""),
    scheduledLaborDollars:
      row.scheduled_labor_dollars === null ? "" : String(row.scheduled_labor_dollars),
    regularLaborDollars: String(row.regular_labor_dollars ?? ""),
    overtimeHours: String(row.overtime_hours ?? ""),
    overtimeDollars: String(row.overtime_dollars ?? ""),
    fohLaborDollars: String(row.foh_labor_dollars ?? ""),
    bohLaborDollars: String(row.boh_labor_dollars ?? ""),
    managementLaborDollars: String(row.management_labor_dollars ?? ""),
    cateringEventLaborDollars:
      row.catering_event_labor_dollars === null ? "" : String(row.catering_event_labor_dollars),
    notes: row.notes ?? "",
    weatherOrEventNote: row.weather_or_event_note ?? "",
  };
}

function toNumberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formStateToValues(form: FormState): LaborEntryFormValues {
  return {
    netSales: toNumberOrNull(form.netSales),
    grossSales: toNumberOrNull(form.grossSales),
    discountsComps: toNumberOrNull(form.discountsComps),
    guestCount: toNumberOrNull(form.guestCount),
    transactionCount: toNumberOrNull(form.transactionCount),
    scheduledHours: toNumberOrNull(form.scheduledHours),
    actualHours: toNumberOrNull(form.actualHours),
    scheduledLaborDollars: toNumberOrNull(form.scheduledLaborDollars),
    regularLaborDollars: toNumberOrNull(form.regularLaborDollars),
    overtimeHours: toNumberOrNull(form.overtimeHours),
    overtimeDollars: toNumberOrNull(form.overtimeDollars),
    fohLaborDollars: toNumberOrNull(form.fohLaborDollars),
    bohLaborDollars: toNumberOrNull(form.bohLaborDollars),
    managementLaborDollars: toNumberOrNull(form.managementLaborDollars),
    cateringEventLaborDollars: toNumberOrNull(form.cateringEventLaborDollars),
  };
}

function valuesToCalcInput(values: LaborEntryFormValues): LaborEntryInput {
  return {
    netSales: values.netSales,
    guestCount: values.guestCount,
    scheduledHours: values.scheduledHours ?? 0,
    actualHours: values.actualHours ?? 0,
    scheduledLaborDollars: values.scheduledLaborDollars,
    regularLaborDollars: values.regularLaborDollars ?? 0,
    overtimeHours: values.overtimeHours ?? 0,
    overtimeDollars: values.overtimeDollars ?? 0,
    fohLaborDollars: values.fohLaborDollars ?? 0,
    bohLaborDollars: values.bohLaborDollars ?? 0,
    managementLaborDollars: values.managementLaborDollars ?? 0,
  };
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DEBOUNCE_MS = 2000;

export function EntryForm({
  organizationId,
  locationId,
  businessDate,
  daypartId,
  daypartLabel,
  initialEntry,
  target,
  canEdit,
}: EntryFormProps) {
  const storageKey = `unkaged-labor-draft:${locationId}:${businessDate}:${daypartId}`;

  const [form, setForm] = useState<FormState>(() => {
    if (typeof window === "undefined") return rowToFormState(initialEntry);
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        return JSON.parse(stored) as FormState;
      } catch {
        // fall through to server state
      }
    }
    return rowToFormState(initialEntry);
  });
  const [status, setStatus] = useState<"draft" | "final" | "locked">(
    initialEntry?.status ?? "draft",
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);

  const isLocked = status === "locked";
  const readOnly = !canEdit || isLocked;

  const performSave = useCallback(
    async (nextStatus: "draft" | "final") => {
      const values = formStateToValues(form);
      setSaveStatus("saving");

      const input: SaveLaborEntryInput = {
        organizationId,
        locationId,
        businessDate,
        daypartId,
        status: nextStatus,
        values,
        notes: form.notes || null,
        weatherOrEventNote: form.weatherOrEventNote || null,
      };

      const result = await saveLaborEntry(input);

      if (!result.ok) {
        setSaveStatus("error");
        setErrors(result.errors);
        return;
      }

      setSaveStatus("saved");
      setErrors([]);
      setWarnings(result.warnings);
      setStatus(result.entry.status);
      isDirtyRef.current = false;
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }
    },
    [form, organizationId, locationId, businessDate, daypartId, storageKey],
  );

  // Live validation, derived at render time (not via setState-in-effect) so
  // the UI always reflects the current form state without an extra render
  // pass. Server-returned errors (`errors` state) are shown when there's no
  // live validation problem to report instead.
  const liveValidation = useMemo(
    () => validateLaborEntryInput(formStateToValues(form), { requireCompleteness: false }),
    [form],
  );
  const displayedErrors = liveValidation.errors.length > 0 ? liveValidation.errors : errors;

  // Autosave: debounce 2s after the last keystroke. Local validation runs
  // first so we never fire a doomed request for an obviously invalid draft
  // (negative numbers) — but missing fields never block a draft autosave.
  useEffect(() => {
    if (readOnly || !isDirtyRef.current) return;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(form));
    }

    if (liveValidation.errors.length > 0) {
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void performSave(status === "final" ? "final" : "draft");
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function updateField(field: keyof FormState, value: string) {
    isDirtyRef.current = true;
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur() {
    if (readOnly || !isDirtyRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void performSave(status === "final" ? "final" : "draft");
  }

  async function handleMarkFinal() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus("final");
    await performSave("final");
  }

  const values = useMemo(() => formStateToValues(form), [form]);
  const calcInput = useMemo(() => valuesToCalcInput(values), [values]);
  const laborPercent = totalLaborPercent(calcInput);
  const otPercent = overtimePercent(calcInput);
  const laborDollars = totalLaborDollars(calcInput);
  const targetPercent = target?.target_total_labor_percent ?? null;
  const breakEven = targetPercent
    ? breakEvenSalesForCurrentLaborSpend(calcInput, { targetTotalLaborPercent: targetPercent })
    : null;

  let comparisonColor: "success" | "warning" | "danger" | "muted" = "muted";
  if (laborPercent !== null && targetPercent !== null) {
    const diff = laborPercent - targetPercent;
    if (diff <= 0) comparisonColor = "success";
    else if (diff <= 0.02) comparisonColor = "warning";
    else comparisonColor = "danger";
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="status"
        aria-live="polite"
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-2 text-sm"
      >
        <span>
          {daypartLabel} — {businessDate}
        </span>
        <span className="text-muted">
          {liveValidation.errors.length > 0 && "Not saved — check the errors below"}
          {liveValidation.errors.length === 0 && saveStatus === "saving" && "Saving…"}
          {liveValidation.errors.length === 0 && saveStatus === "saved" && "Saved"}
          {liveValidation.errors.length === 0 && saveStatus === "error" && "Not saved — check the errors below"}
          {liveValidation.errors.length === 0 &&
            saveStatus === "idle" &&
            (isLocked ? "Locked" : status === "final" ? "Final" : "Draft")}
        </span>
      </div>

      {!canEdit && (
        <p className="rounded-lg border border-border bg-accent-soft px-4 py-3 text-sm">
          You have read-only access to this location and can&apos;t edit entries.
        </p>
      )}

      {isLocked && (
        <p className="rounded-lg border border-border bg-accent-soft px-4 py-3 text-sm">
          This entry is locked and read-only. An Org Admin can unlock it from Settings.
        </p>
      )}

      <section className="rounded-xl border border-border p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatTile
            label="Total Labor %"
            value={laborPercent === null ? "—" : `${roundHalfUp(laborPercent * 100, 1)}%`}
            sub={targetPercent !== null ? `Target ${roundHalfUp(targetPercent * 100, 1)}%` : undefined}
            color={comparisonColor}
          />
          <StatTile
            label="Total Labor $"
            value={`$${roundHalfUp(laborDollars, 2).toLocaleString()}`}
          />
          <StatTile
            label="OT % of labor"
            value={otPercent === null ? "—" : `${roundHalfUp(otPercent * 100, 1)}%`}
          />
        </div>
        {breakEven !== null && (
          <p className="mt-2 text-xs text-muted">
            Break-even sales at target: ${roundHalfUp(breakEven, 0).toLocaleString()}
          </p>
        )}
      </section>

      {displayedErrors.length > 0 && (
        <div role="alert" className="rounded-lg border border-danger bg-danger/10 px-4 py-3">
          {displayedErrors.map((e) => (
            <p key={e} className="text-sm text-danger">
              {e}
            </p>
          ))}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-warning bg-warning/10 px-4 py-3">
          {warnings.map((w) => (
            <p key={w} className="text-sm">
              {w}
            </p>
          ))}
        </div>
      )}

      <fieldset disabled={readOnly} className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-semibold">Sales</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            id={`${daypartId}-netSales`}
            label="Net sales"
            required
            value={form.netSales}
            onChange={(v) => updateField("netSales", v)}
            onBlur={handleBlur}
          />
          <NumberField
            id={`${daypartId}-guestCount`}
            label="Guest count"
            value={form.guestCount}
            onChange={(v) => updateField("guestCount", v)}
            onBlur={handleBlur}
            hint="Leave blank if unknown — never estimated automatically."
          />
        </div>

        <legend className="mb-1 mt-2 text-sm font-semibold">Hours &amp; labor $</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            id={`${daypartId}-scheduledHours`}
            label="Scheduled hours"
            required
            value={form.scheduledHours}
            onChange={(v) => updateField("scheduledHours", v)}
            onBlur={handleBlur}
          />
          <NumberField
            id={`${daypartId}-actualHours`}
            label="Actual hours"
            required
            value={form.actualHours}
            onChange={(v) => updateField("actualHours", v)}
            onBlur={handleBlur}
          />
          <NumberField
            id={`${daypartId}-regularLaborDollars`}
            label="Regular labor $"
            required
            value={form.regularLaborDollars}
            onChange={(v) => updateField("regularLaborDollars", v)}
            onBlur={handleBlur}
          />
          <NumberField
            id={`${daypartId}-overtimeHours`}
            label="Overtime hours"
            value={form.overtimeHours}
            onChange={(v) => updateField("overtimeHours", v)}
            onBlur={handleBlur}
          />
          <NumberField
            id={`${daypartId}-overtimeDollars`}
            label="Overtime $"
            value={form.overtimeDollars}
            onChange={(v) => updateField("overtimeDollars", v)}
            onBlur={handleBlur}
          />
          <NumberField
            id={`${daypartId}-fohLaborDollars`}
            label="FOH labor $"
            required
            value={form.fohLaborDollars}
            onChange={(v) => updateField("fohLaborDollars", v)}
            onBlur={handleBlur}
          />
          <NumberField
            id={`${daypartId}-bohLaborDollars`}
            label="BOH labor $"
            required
            value={form.bohLaborDollars}
            onChange={(v) => updateField("bohLaborDollars", v)}
            onBlur={handleBlur}
          />
          <NumberField
            id={`${daypartId}-managementLaborDollars`}
            label="Management labor $"
            required
            value={form.managementLaborDollars}
            onChange={(v) => updateField("managementLaborDollars", v)}
            onBlur={handleBlur}
          />
        </div>

        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium">More detail (optional)</summary>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              id={`${daypartId}-grossSales`}
              label="Gross sales"
              value={form.grossSales}
              onChange={(v) => updateField("grossSales", v)}
              onBlur={handleBlur}
            />
            <NumberField
              id={`${daypartId}-discountsComps`}
              label="Discounts/comps"
              value={form.discountsComps}
              onChange={(v) => updateField("discountsComps", v)}
              onBlur={handleBlur}
            />
            <NumberField
              id={`${daypartId}-transactionCount`}
              label="Transaction count"
              value={form.transactionCount}
              onChange={(v) => updateField("transactionCount", v)}
              onBlur={handleBlur}
            />
            <NumberField
              id={`${daypartId}-scheduledLaborDollars`}
              label="Scheduled labor $"
              value={form.scheduledLaborDollars}
              onChange={(v) => updateField("scheduledLaborDollars", v)}
              onBlur={handleBlur}
              hint="What the schedule was built to spend — enables the $ variance metric."
            />
            <NumberField
              id={`${daypartId}-cateringEventLaborDollars`}
              label="Catering/event labor $"
              value={form.cateringEventLaborDollars}
              onChange={(v) => updateField("cateringEventLaborDollars", v)}
              onBlur={handleBlur}
              hint="Tagged separately so catering spikes don't distort restaurant-floor labor %."
            />
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor={`${daypartId}-weather`} className="text-sm font-medium">
                Weather / event note
              </label>
              <input
                id={`${daypartId}-weather`}
                value={form.weatherOrEventNote}
                onChange={(e) => updateField("weatherOrEventNote", e.target.value)}
                onBlur={handleBlur}
                className="min-h-11 rounded-lg border border-border bg-transparent px-4 py-2.5 text-base"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor={`${daypartId}-notes`} className="text-sm font-medium">
                Notes
              </label>
              <textarea
                id={`${daypartId}-notes`}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                onBlur={handleBlur}
                rows={3}
                className="rounded-lg border border-border bg-transparent px-4 py-2.5 text-base"
              />
            </div>
          </div>
        </details>
      </fieldset>

      {!readOnly && status !== "final" && (
        <button
          type="button"
          onClick={handleMarkFinal}
          className="min-h-11 self-start rounded-lg bg-accent px-4 py-2.5 text-base font-medium text-background"
        >
          Mark final
        </button>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  color = "muted",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "success" | "warning" | "danger" | "muted";
}) {
  const colorClass =
    color === "success"
      ? "text-success"
      : color === "warning"
        ? "text-warning"
        : color === "danger"
          ? "text-danger"
          : "text-foreground";
  return (
    <div className="rounded-lg bg-accent-soft px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
