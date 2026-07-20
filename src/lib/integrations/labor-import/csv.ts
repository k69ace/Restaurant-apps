import { parseCsv } from "@/lib/csv/csv";
import type { LaborImportAdapter, LaborImportParseResult, LaborImportRow, LaborImportRowError } from "./types";

/**
 * Documented column-mapping template for CSV import — the header row must
 * contain these exact column names (case-insensitive, order doesn't
 * matter). Extra columns are ignored. This is the reference/only import
 * implementation for the MVP; see types.ts for the adapter seam a future
 * POS integration would fill instead.
 */
export const REQUIRED_COLUMNS = [
  "business_date",
  "daypart_code",
  "net_sales",
  "scheduled_hours",
  "actual_hours",
  "regular_labor_dollars",
  "overtime_hours",
  "overtime_dollars",
  "foh_labor_dollars",
  "boh_labor_dollars",
  "management_labor_dollars",
] as const;

export const OPTIONAL_COLUMNS = [
  "gross_sales",
  "discounts_comps",
  "guest_count",
  "transaction_count",
  "scheduled_labor_dollars",
  "catering_event_labor_dollars",
] as const;

export const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseRequiredNumber(
  value: string | undefined,
  column: string,
  sourceRow: number,
  errors: LaborImportRowError[],
): number | null {
  if (value === undefined || value.trim() === "") {
    errors.push({ sourceRow, message: `Missing required column "${column}".` });
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    errors.push({ sourceRow, message: `"${column}" must be a number, got "${value}".` });
    return null;
  }
  if (n < 0) {
    errors.push({ sourceRow, message: `"${column}" can't be negative (got ${n}).` });
    return null;
  }
  return n;
}

function parseOptionalNumber(
  value: string | undefined,
  column: string,
  sourceRow: number,
  errors: LaborImportRowError[],
): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) {
    errors.push({ sourceRow, message: `"${column}" must be a number, got "${value}".` });
    return null;
  }
  if (n < 0) {
    errors.push({ sourceRow, message: `"${column}" can't be negative (got ${n}).` });
    return null;
  }
  return n;
}

export class CsvLaborImportAdapter implements LaborImportAdapter {
  readonly name = "CSV";

  parse(input: string): LaborImportParseResult {
    const table = parseCsv(input);
    const errors: LaborImportRowError[] = [];

    if (table.length === 0) {
      return { rows: [], errors: [{ sourceRow: 0, message: "The file is empty." }] };
    }

    const header = table[0].map((h) => h.trim().toLowerCase());
    const missingRequired = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
    if (missingRequired.length > 0) {
      return {
        rows: [],
        errors: [
          {
            sourceRow: 1,
            message: `Missing required column(s): ${missingRequired.join(", ")}. Expected headers: ${ALL_COLUMNS.join(", ")}.`,
          },
        ],
      };
    }

    const colIndex = Object.fromEntries(header.map((h, i) => [h, i]));
    const rows: LaborImportRow[] = [];

    for (let i = 1; i < table.length; i++) {
      const sourceRow = i + 1; // 1-indexed, header is row 1
      const cells = table[i];
      const get = (col: string) => cells[colIndex[col]];
      const rowErrors: LaborImportRowError[] = [];

      const businessDate = get("business_date")?.trim();
      if (!businessDate || !DATE_PATTERN.test(businessDate)) {
        rowErrors.push({
          sourceRow,
          message: `"business_date" must be YYYY-MM-DD, got "${businessDate ?? ""}".`,
        });
      }

      const daypartCode = get("daypart_code")?.trim();
      if (!daypartCode) {
        rowErrors.push({ sourceRow, message: `Missing required column "daypart_code".` });
      }

      const netSales = parseRequiredNumber(get("net_sales"), "net_sales", sourceRow, rowErrors);
      const scheduledHours = parseRequiredNumber(
        get("scheduled_hours"),
        "scheduled_hours",
        sourceRow,
        rowErrors,
      );
      const actualHours = parseRequiredNumber(get("actual_hours"), "actual_hours", sourceRow, rowErrors);
      const regularLaborDollars = parseRequiredNumber(
        get("regular_labor_dollars"),
        "regular_labor_dollars",
        sourceRow,
        rowErrors,
      );
      const overtimeHours = parseRequiredNumber(
        get("overtime_hours"),
        "overtime_hours",
        sourceRow,
        rowErrors,
      );
      const overtimeDollars = parseRequiredNumber(
        get("overtime_dollars"),
        "overtime_dollars",
        sourceRow,
        rowErrors,
      );
      const fohLaborDollars = parseRequiredNumber(
        get("foh_labor_dollars"),
        "foh_labor_dollars",
        sourceRow,
        rowErrors,
      );
      const bohLaborDollars = parseRequiredNumber(
        get("boh_labor_dollars"),
        "boh_labor_dollars",
        sourceRow,
        rowErrors,
      );
      const managementLaborDollars = parseRequiredNumber(
        get("management_labor_dollars"),
        "management_labor_dollars",
        sourceRow,
        rowErrors,
      );

      const grossSales = parseOptionalNumber(get("gross_sales"), "gross_sales", sourceRow, rowErrors);
      const discountsComps = parseOptionalNumber(
        get("discounts_comps"),
        "discounts_comps",
        sourceRow,
        rowErrors,
      );
      const guestCount = parseOptionalNumber(get("guest_count"), "guest_count", sourceRow, rowErrors);
      const transactionCount = parseOptionalNumber(
        get("transaction_count"),
        "transaction_count",
        sourceRow,
        rowErrors,
      );
      const scheduledLaborDollars = parseOptionalNumber(
        get("scheduled_labor_dollars"),
        "scheduled_labor_dollars",
        sourceRow,
        rowErrors,
      );
      const cateringEventLaborDollars = parseOptionalNumber(
        get("catering_event_labor_dollars"),
        "catering_event_labor_dollars",
        sourceRow,
        rowErrors,
      );

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue; // never silently skip — every dropped row has a reported reason
      }

      rows.push({
        sourceRow,
        businessDate: businessDate!,
        daypartCode: daypartCode!,
        netSales: netSales!,
        grossSales,
        discountsComps,
        guestCount,
        transactionCount,
        scheduledHours: scheduledHours!,
        actualHours: actualHours!,
        scheduledLaborDollars,
        regularLaborDollars: regularLaborDollars!,
        overtimeHours: overtimeHours!,
        overtimeDollars: overtimeDollars!,
        fohLaborDollars: fohLaborDollars!,
        bohLaborDollars: bohLaborDollars!,
        managementLaborDollars: managementLaborDollars!,
        cateringEventLaborDollars,
      });
    }

    return { rows, errors };
  }
}
