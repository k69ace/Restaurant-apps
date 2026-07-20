/**
 * Pure validation for the Daily Entry form. No DB/UI concerns — same spirit
 * as lib/calculations/labor.ts.
 *
 * Per the task brief: negative hours/dollars always hard-block. A guest
 * count of 0 with nonzero sales warns but never blocks — "data entry
 * mistakes happen and operators need to save partial data." Missing
 * required fields only block a FINAL save, never a draft/autosave, since
 * autosave has to work while the manager is mid-entry.
 */

export interface LaborEntryFormValues {
  netSales: number | null;
  grossSales?: number | null;
  discountsComps?: number | null;
  guestCount?: number | null;
  transactionCount?: number | null;
  scheduledHours: number | null;
  actualHours: number | null;
  scheduledLaborDollars?: number | null;
  regularLaborDollars: number | null;
  overtimeHours: number | null;
  overtimeDollars: number | null;
  fohLaborDollars: number | null;
  bohLaborDollars: number | null;
  managementLaborDollars: number | null;
  cateringEventLaborDollars?: number | null;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const NON_NEGATIVE_FIELDS: (keyof LaborEntryFormValues)[] = [
  "netSales",
  "grossSales",
  "discountsComps",
  "guestCount",
  "transactionCount",
  "scheduledHours",
  "actualHours",
  "scheduledLaborDollars",
  "regularLaborDollars",
  "overtimeHours",
  "overtimeDollars",
  "fohLaborDollars",
  "bohLaborDollars",
  "managementLaborDollars",
  "cateringEventLaborDollars",
];

const FIELD_LABELS: Record<keyof LaborEntryFormValues, string> = {
  netSales: "Net sales",
  grossSales: "Gross sales",
  discountsComps: "Discounts/comps",
  guestCount: "Guest count",
  transactionCount: "Transaction count",
  scheduledHours: "Scheduled hours",
  actualHours: "Actual hours",
  scheduledLaborDollars: "Scheduled labor $",
  regularLaborDollars: "Regular labor $",
  overtimeHours: "Overtime hours",
  overtimeDollars: "Overtime $",
  fohLaborDollars: "FOH labor $",
  bohLaborDollars: "BOH labor $",
  managementLaborDollars: "Management labor $",
  cateringEventLaborDollars: "Catering/event labor $",
};

/** Fields required to mark a day/daypart Final — not required for a draft
 * autosave, which must always be able to save whatever's been typed so far. */
const REQUIRED_FOR_FINAL: (keyof LaborEntryFormValues)[] = [
  "netSales",
  "scheduledHours",
  "actualHours",
  "regularLaborDollars",
  "overtimeHours",
  "overtimeDollars",
  "fohLaborDollars",
  "bohLaborDollars",
  "managementLaborDollars",
];

export function validateLaborEntryInput(
  values: LaborEntryFormValues,
  options: { requireCompleteness: boolean },
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of NON_NEGATIVE_FIELDS) {
    const value = values[field];
    if (value !== null && value !== undefined && value < 0) {
      errors.push(`${FIELD_LABELS[field]} can't be negative.`);
    }
  }

  if (
    values.guestCount === 0 &&
    values.netSales !== null &&
    values.netSales !== undefined &&
    values.netSales > 0
  ) {
    warnings.push(
      "Guest count is 0 but net sales is greater than $0 — double check the guest count.",
    );
  }

  if (options.requireCompleteness) {
    const missing = REQUIRED_FOR_FINAL.filter(
      (field) => values[field] === null || values[field] === undefined,
    );
    if (missing.length > 0) {
      errors.push(
        `Missing required fields to mark this final: ${missing.map((f) => FIELD_LABELS[f]).join(", ")}.`,
      );
    }
  }

  return { errors, warnings };
}
