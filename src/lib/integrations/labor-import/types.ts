/**
 * Adapter interface for bringing sales/covers/labor data into the app from
 * an external source. MVP ships one implementation — CSV — but this
 * interface is the seam a future Toast/Square/Clover/SpotOn/Restaurant365/
 * MarginEdge/7shifts integration would implement without touching core
 * calculation or UI code. No such integration is implemented or claimed
 * here — there's no live POS/payroll connection in this build.
 */

export interface LaborImportRow {
  /** 1-indexed row number in the source file, for error reporting. */
  sourceRow: number;
  businessDate: string; // YYYY-MM-DD
  daypartCode: string;
  netSales: number;
  grossSales: number | null;
  discountsComps: number | null;
  guestCount: number | null;
  transactionCount: number | null;
  scheduledHours: number;
  actualHours: number;
  scheduledLaborDollars: number | null;
  regularLaborDollars: number;
  overtimeHours: number;
  overtimeDollars: number;
  fohLaborDollars: number;
  bohLaborDollars: number;
  managementLaborDollars: number;
  cateringEventLaborDollars: number | null;
}

export interface LaborImportRowError {
  sourceRow: number;
  message: string;
}

export interface LaborImportParseResult {
  rows: LaborImportRow[];
  errors: LaborImportRowError[];
}

export interface LaborImportAdapter {
  /** Human-readable name shown in the UI (e.g. "CSV"). */
  readonly name: string;
  parse(input: string): LaborImportParseResult;
}
