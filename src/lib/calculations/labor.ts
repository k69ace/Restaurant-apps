/**
 * Pure calculation module for the Restaurant Labor Efficiency Calculator.
 *
 * No UI or database concerns here — every export is a pure function over
 * plain numbers/objects. Callers (server actions, dashboard aggregation,
 * reports) own fetching data and rendering "—" / "insufficient data".
 *
 * Rounding: all display-facing values are rounded ROUND-HALF-UP (ties round
 * away from zero, e.g. 2.5 -> 3, -2.5 -> -3) to the stated precision via
 * `roundHalfUp`. Money sums (e.g. total labor dollars = regular + OT +
 * management) are computed in integer cents via `sumMoney` before being
 * converted back to dollars, so repeated addition of currency inputs never
 * accumulates binary floating-point drift. Percentages are stored/returned
 * at full precision and should be rounded to 1 decimal only at display time
 * via `roundHalfUp(value, 1)`.
 *
 * Data-model note: the task brief's LaborEntry field list does not include
 * a "scheduled labor dollars" figure, only `scheduledHours`. The brief also
 * explicitly requires a "Scheduled-vs-Actual Variance (hours AND dollars)"
 * metric. To support the dollar half of that metric without fabricating a
 * number, this module accepts an optional `scheduledLaborDollars` input
 * (see supabase/migrations/0004_scheduled_labor_dollars.sql) and returns
 * `null` for the dollar variance when it isn't supplied — never a fabricated
 * value, never a divide-by-zero.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LaborEntryInput {
  netSales: number | null;
  guestCount?: number | null;
  scheduledHours: number;
  actualHours: number;
  /** Optional: total labor dollars the schedule was built to. Not part of
   * the task brief's field list — see module doc comment. */
  scheduledLaborDollars?: number | null;
  regularLaborDollars: number;
  overtimeHours: number;
  overtimeDollars: number;
  fohLaborDollars: number;
  bohLaborDollars: number;
  managementLaborDollars: number;
}

export interface LaborTargetInput {
  targetTotalLaborPercent: number | null;
  includeManagementInProductive: boolean;
}

export interface UnderstaffingThresholds {
  /** Guests served per labor hour above which workload is considered high. */
  guestsPerLaborHourHighThreshold: number;
  /** Percent (0-100) actual hours can run below scheduled before it's a
   * meaningful variance. */
  scheduledVsActualVarianceThresholdPercent: number;
}

export const DEFAULT_UNDERSTAFFING_THRESHOLDS: UnderstaffingThresholds = {
  guestsPerLaborHourHighThreshold: 3.5,
  scheduledVsActualVarianceThresholdPercent: 10,
};

export type HoursBasis = "scheduled" | "actual";

export interface TargetComparisonResult {
  status: "over_target" | "at_or_under_target";
  /** Always >= 0. When status is "over_target", this is the estimated
   * savings available at target. When "at_or_under_target", this is how
   * far under target the entry already is. Never a negative "savings"
   * number — see module doc comment / task brief. */
  amountDollars: number;
}

export interface UnderstaffingRiskResult {
  flagged: boolean;
  /** True when totalLaborPercent (or another required input) couldn't be
   * computed, so no flag determination could be made either way. */
  insufficientData: boolean;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Rounding / money-safe arithmetic
// ---------------------------------------------------------------------------

/** Round-half-up (ties away from zero) to `decimals` places. */
export function roundHalfUp(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const nudge = (value >= 0 ? 1 : -1) * 1e-9;
  const shifted = value * factor + nudge;
  const rounded = value >= 0 ? Math.floor(shifted + 0.5) : Math.ceil(shifted - 0.5);
  return rounded / factor;
}

/** Sum dollar amounts via integer cents so repeated addition never drifts. */
export function sumMoney(...amounts: (number | null | undefined)[]): number {
  const cents = amounts.reduce<number>((total, amount) => {
    if (amount === null || amount === undefined) return total;
    return total + Math.round(amount * 100);
  }, 0);
  return cents / 100;
}

// ---------------------------------------------------------------------------
// Derived totals
// ---------------------------------------------------------------------------

export function totalLaborDollars(entry: LaborEntryInput): number {
  return sumMoney(entry.regularLaborDollars, entry.overtimeDollars, entry.managementLaborDollars);
}

function hoursFor(entry: LaborEntryInput, basis: HoursBasis): number {
  return basis === "scheduled" ? entry.scheduledHours : entry.actualHours;
}

function hasUsableSales(netSales: number | null | undefined): netSales is number {
  return typeof netSales === "number" && netSales > 0;
}

// ---------------------------------------------------------------------------
// Percentage metrics — null when netSales is missing or zero.
// ---------------------------------------------------------------------------

export function totalLaborPercent(entry: LaborEntryInput): number | null {
  if (!hasUsableSales(entry.netSales)) return null;
  return totalLaborDollars(entry) / entry.netSales!;
}

export function productiveLaborPercent(
  entry: LaborEntryInput,
  target: Pick<LaborTargetInput, "includeManagementInProductive">,
): number | null {
  if (!hasUsableSales(entry.netSales)) return null;
  if (target.includeManagementInProductive) {
    return totalLaborPercent(entry);
  }
  return sumMoney(entry.regularLaborDollars, entry.overtimeDollars) / entry.netSales!;
}

export function fohLaborPercent(entry: LaborEntryInput): number | null {
  if (!hasUsableSales(entry.netSales)) return null;
  return entry.fohLaborDollars / entry.netSales!;
}

export function bohLaborPercent(entry: LaborEntryInput): number | null {
  if (!hasUsableSales(entry.netSales)) return null;
  return entry.bohLaborDollars / entry.netSales!;
}

export function managementLaborPercent(entry: LaborEntryInput): number | null {
  if (!hasUsableSales(entry.netSales)) return null;
  return entry.managementLaborDollars / entry.netSales!;
}

/** Overtime % of total labor dollars. Independent of net sales — its own
 * denominator is total labor dollars, so it nulls out only when that's 0. */
export function overtimePercent(entry: LaborEntryInput): number | null {
  const denominator = totalLaborDollars(entry);
  if (denominator === 0) return null;
  return entry.overtimeDollars / denominator;
}

// ---------------------------------------------------------------------------
// Productivity metrics
// ---------------------------------------------------------------------------

export function salesPerLaborHour(entry: LaborEntryInput, basis: HoursBasis): number | null {
  if (entry.netSales === null || entry.netSales === undefined) return null;
  const hours = hoursFor(entry, basis);
  if (hours <= 0) return null;
  return entry.netSales / hours;
}

/** Null (never 0) when guestCount wasn't provided — never divide by a
 * fabricated guest count. */
export function guestsPerLaborHour(entry: LaborEntryInput, basis: HoursBasis): number | null {
  if (entry.guestCount === null || entry.guestCount === undefined) return null;
  const hours = hoursFor(entry, basis);
  if (hours <= 0) return null;
  return entry.guestCount / hours;
}

export function laborDollarsPerGuest(entry: LaborEntryInput): number | null {
  if (!entry.guestCount || entry.guestCount <= 0) return null;
  return totalLaborDollars(entry) / entry.guestCount;
}

/**
 * Sales per employee (non-management) hour. `managementHours`, if supplied
 * (e.g. rolled up from labor_role_entries where category = 'management'),
 * is subtracted from actualHours per the brief. When omitted, falls back to
 * total actualHours — i.e. "management included" — never guessed.
 */
export function salesPerEmployeeHour(
  entry: LaborEntryInput,
  managementHours?: number | null,
): number | null {
  if (entry.netSales === null || entry.netSales === undefined) return null;
  const effectiveHours = entry.actualHours - (managementHours ?? 0);
  if (effectiveHours <= 0) return null;
  return entry.netSales / effectiveHours;
}

// ---------------------------------------------------------------------------
// Variance metrics
// ---------------------------------------------------------------------------

export function scheduledVsActualVarianceHours(entry: LaborEntryInput): number {
  return entry.actualHours - entry.scheduledHours;
}

/** Null when scheduledLaborDollars wasn't supplied for this entry. */
export function scheduledVsActualVarianceDollars(entry: LaborEntryInput): number | null {
  if (entry.scheduledLaborDollars === null || entry.scheduledLaborDollars === undefined) {
    return null;
  }
  return sumMoney(totalLaborDollars(entry), -entry.scheduledLaborDollars);
}

/** Null when netSales or the target percent is missing (insufficient data
 * to compute a target-dollar figure to compare against). A netSales of
 * exactly 0 is still computable (target dollars = 0). */
export function laborBudgetVariance(
  entry: LaborEntryInput,
  target: Pick<LaborTargetInput, "targetTotalLaborPercent">,
): number | null {
  if (entry.netSales === null || entry.netSales === undefined) return null;
  if (target.targetTotalLaborPercent === null || target.targetTotalLaborPercent === undefined) {
    return null;
  }
  const targetDollars = target.targetTotalLaborPercent * entry.netSales;
  return sumMoney(totalLaborDollars(entry), -targetDollars);
}

export function estimatedSavingsAtTarget(
  entry: LaborEntryInput,
  target: Pick<LaborTargetInput, "targetTotalLaborPercent">,
): TargetComparisonResult | null {
  const variance = laborBudgetVariance(entry, target);
  if (variance === null) return null;
  if (variance > 0) {
    return { status: "over_target", amountDollars: variance };
  }
  return { status: "at_or_under_target", amountDollars: Math.abs(variance) };
}

/** Null when the target percent is missing or 0 (would divide by zero). */
export function breakEvenSalesForCurrentLaborSpend(
  entry: LaborEntryInput,
  target: Pick<LaborTargetInput, "targetTotalLaborPercent">,
): number | null {
  if (!target.targetTotalLaborPercent) return null;
  return totalLaborDollars(entry) / target.targetTotalLaborPercent;
}

// ---------------------------------------------------------------------------
// Understaffing-risk flag
// ---------------------------------------------------------------------------

/**
 * Flags a day/daypart as a *possible* understaffing risk for human review —
 * never a certainty. Low labor % alone is never sufficient; requires labor %
 * meaningfully below target AND at least one workload signal:
 *   - guestsPerLaborHour above the configured high-workload threshold, OR
 *   - actualHours meaningfully below scheduledHours while sales are at or
 *     above the trailing average for that day-of-week/daypart (used here as
 *     the "forecast" proxy — the brief's own Review workflow defines the
 *     trailing 4-week average as the comparison baseline, and no separate
 *     forecast field exists in the data model).
 */
export function understaffingRisk(
  entry: LaborEntryInput,
  target: Pick<LaborTargetInput, "targetTotalLaborPercent">,
  thresholds: UnderstaffingThresholds = DEFAULT_UNDERSTAFFING_THRESHOLDS,
  context: { trailingAverageNetSales?: number | null } = {},
): UnderstaffingRiskResult {
  const actualPercent = totalLaborPercent(entry);
  if (actualPercent === null || !target.targetTotalLaborPercent) {
    return { flagged: false, insufficientData: true, reasons: [] };
  }

  const meaningfullyBelowTarget = actualPercent < target.targetTotalLaborPercent;
  if (!meaningfullyBelowTarget) {
    return { flagged: false, insufficientData: false, reasons: [] };
  }

  const reasons: string[] = [];

  const guestsPerHour = guestsPerLaborHour(entry, "actual");
  if (guestsPerHour !== null && guestsPerHour > thresholds.guestsPerLaborHourHighThreshold) {
    reasons.push(
      `Guests per labor hour (${roundHalfUp(guestsPerHour, 1)}) is above the high-workload threshold (${thresholds.guestsPerLaborHourHighThreshold}).`,
    );
  }

  // Guaranteed a positive number here — actualPercent above already
  // returned early (insufficientData) for null/0 netSales.
  const netSales = entry.netSales!;

  const hoursVariance = scheduledVsActualVarianceHours(entry);
  const hoursVariancePercent =
    entry.scheduledHours > 0 ? (hoursVariance / entry.scheduledHours) * 100 : 0;
  const salesAtOrAboveForecast =
    context.trailingAverageNetSales === null || context.trailingAverageNetSales === undefined
      ? false
      : netSales >= context.trailingAverageNetSales;

  if (
    hoursVariancePercent < -thresholds.scheduledVsActualVarianceThresholdPercent &&
    salesAtOrAboveForecast
  ) {
    reasons.push(
      `Actual hours ran ${roundHalfUp(Math.abs(hoursVariancePercent), 1)}% below scheduled while sales were at or above the trailing average.`,
    );
  }

  return { flagged: reasons.length > 0, insufficientData: false, reasons };
}

// ---------------------------------------------------------------------------
// Aggregation (weekly / period rollups, role/daypart comparisons)
// ---------------------------------------------------------------------------

/** Sums a list of entries into one combined entry for period-level metrics.
 * netSales/guestCount/scheduledLaborDollars are summed only if every entry
 * provides them — a partially-known total is not reported as a real total. */
export function aggregateLaborEntries(entries: LaborEntryInput[]): LaborEntryInput {
  const allHaveNetSales = entries.every(
    (e) => e.netSales !== null && e.netSales !== undefined,
  );
  const allHaveGuestCount = entries.every(
    (e) => e.guestCount !== null && e.guestCount !== undefined,
  );
  const allHaveScheduledDollars = entries.every(
    (e) => e.scheduledLaborDollars !== null && e.scheduledLaborDollars !== undefined,
  );

  return entries.reduce<LaborEntryInput>(
    (acc, e) => ({
      // Non-null assertions below are structurally guaranteed, not a type
      // escape hatch: within the allHave*/true branch, acc.<field> starts at
      // 0 in the reduce seed and every step reassigns it to a `number`
      // (never null) in that same branch, so it can never be null here.
      netSales: allHaveNetSales ? sumMoney(acc.netSales!, e.netSales!) : null,
      guestCount: allHaveGuestCount ? acc.guestCount! + e.guestCount! : null,
      scheduledHours: acc.scheduledHours + e.scheduledHours,
      actualHours: acc.actualHours + e.actualHours,
      scheduledLaborDollars: allHaveScheduledDollars
        ? sumMoney(acc.scheduledLaborDollars!, e.scheduledLaborDollars!)
        : null,
      regularLaborDollars: sumMoney(acc.regularLaborDollars, e.regularLaborDollars),
      overtimeHours: acc.overtimeHours + e.overtimeHours,
      overtimeDollars: sumMoney(acc.overtimeDollars, e.overtimeDollars),
      fohLaborDollars: sumMoney(acc.fohLaborDollars, e.fohLaborDollars),
      bohLaborDollars: sumMoney(acc.bohLaborDollars, e.bohLaborDollars),
      managementLaborDollars: sumMoney(acc.managementLaborDollars, e.managementLaborDollars),
    }),
    {
      netSales: allHaveNetSales ? 0 : null,
      guestCount: allHaveGuestCount ? 0 : null,
      scheduledHours: 0,
      actualHours: 0,
      scheduledLaborDollars: allHaveScheduledDollars ? 0 : null,
      regularLaborDollars: 0,
      overtimeHours: 0,
      overtimeDollars: 0,
      fohLaborDollars: 0,
      bohLaborDollars: 0,
      managementLaborDollars: 0,
    },
  );
}
