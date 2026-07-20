import {
  getActiveTarget,
  getDaypartsForLocation,
  getEntriesForDate,
  getTrailingSameWeekdayEntries,
  type DaypartConfig,
  type LaborEntryRow,
  type LaborTargetRow,
} from "@/lib/data/laborEntries";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateLaborEntries,
  DEFAULT_UNDERSTAFFING_THRESHOLDS,
  guestsPerLaborHour,
  overtimePercent,
  salesPerLaborHour,
  totalLaborPercent,
  understaffingRisk,
  type LaborEntryInput,
  type UnderstaffingRiskResult,
  type UnderstaffingThresholds,
} from "@/lib/calculations/labor";

export interface KpiComparison {
  value: number | null;
  targetValue: number | null;
  trailingAverageValue: number | null;
}

export interface DaypartDashboardRow {
  daypart: DaypartConfig;
  entry: LaborEntryRow | null;
  calcInput: LaborEntryInput | null;
  trailingAverageCalcInput: LaborEntryInput | null;
  understaffing: UnderstaffingRiskResult | null;
}

export interface DailyDashboardData {
  dayparts: DaypartDashboardRow[];
  target: LaborTargetRow | null;
  aggregated: LaborEntryInput;
  aggregatedTrailing: LaborEntryInput | null;
  hasAnyEntries: boolean;
  kpis: {
    totalLaborPercent: KpiComparison;
    splhActual: KpiComparison;
    guestsPerLaborHourActual: KpiComparison;
    overtimePercent: KpiComparison;
  };
}

function rowToCalcInput(row: LaborEntryRow): LaborEntryInput {
  return {
    netSales: row.net_sales,
    guestCount: row.guest_count,
    scheduledHours: row.scheduled_hours,
    actualHours: row.actual_hours,
    scheduledLaborDollars: row.scheduled_labor_dollars,
    regularLaborDollars: row.regular_labor_dollars,
    overtimeHours: row.overtime_hours,
    overtimeDollars: row.overtime_dollars,
    fohLaborDollars: row.foh_labor_dollars,
    bohLaborDollars: row.boh_labor_dollars,
    managementLaborDollars: row.management_labor_dollars,
  };
}

async function getUnderstaffingThresholds(organizationId: string): Promise<UnderstaffingThresholds> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_settings")
    .select("guests_per_labor_hour_high_threshold, scheduled_vs_actual_variance_threshold_percent")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!data) return DEFAULT_UNDERSTAFFING_THRESHOLDS;
  return {
    guestsPerLaborHourHighThreshold: data.guests_per_labor_hour_high_threshold,
    scheduledVsActualVarianceThresholdPercent: data.scheduled_vs_actual_variance_threshold_percent,
  };
}

export async function getDailyDashboardData(
  organizationId: string,
  locationId: string,
  businessDate: string,
): Promise<DailyDashboardData> {
  const [dayparts, entriesMap, target, thresholds] = await Promise.all([
    getDaypartsForLocation(organizationId, locationId),
    getEntriesForDate(locationId, businessDate),
    getActiveTarget(organizationId, locationId, businessDate),
    getUnderstaffingThresholds(organizationId),
  ]);

  const trailingRowsByDaypart = await Promise.all(
    dayparts.map((dp) => getTrailingSameWeekdayEntries(locationId, dp.id, businessDate)),
  );

  const rows: DaypartDashboardRow[] = dayparts.map((daypart, i) => {
    const entry = entriesMap.get(daypart.id) ?? null;
    const calcInput = entry ? rowToCalcInput(entry) : null;
    const trailingRows = trailingRowsByDaypart[i];
    const trailingAverageCalcInput =
      trailingRows.length > 0 ? aggregateLaborEntries(trailingRows.map(rowToCalcInput)) : null;

    const understaffing =
      calcInput && target
        ? understaffingRisk(
            calcInput,
            { targetTotalLaborPercent: target.target_total_labor_percent },
            thresholds,
            {
              trailingAverageNetSales:
                trailingRows.length > 0
                  ? trailingRows.reduce((sum, r) => sum + r.net_sales, 0) / trailingRows.length
                  : null,
            },
          )
        : null;

    return { daypart, entry, calcInput, trailingAverageCalcInput, understaffing };
  });

  const presentEntries = rows.map((r) => r.calcInput).filter((c): c is LaborEntryInput => c !== null);
  const aggregated = aggregateLaborEntries(presentEntries);
  const hasAnyEntries = presentEntries.length > 0;

  const trailingInputsForPresentDayparts = rows
    .filter((r) => r.calcInput !== null && r.trailingAverageCalcInput !== null)
    .map((r) => r.trailingAverageCalcInput!);
  const aggregatedTrailing =
    trailingInputsForPresentDayparts.length > 0
      ? aggregateLaborEntries(trailingInputsForPresentDayparts)
      : null;

  const targetPercent = target?.target_total_labor_percent ?? null;

  return {
    dayparts: rows,
    target,
    aggregated,
    aggregatedTrailing,
    hasAnyEntries,
    kpis: {
      totalLaborPercent: {
        value: hasAnyEntries ? totalLaborPercent(aggregated) : null,
        targetValue: targetPercent,
        trailingAverageValue: aggregatedTrailing ? totalLaborPercent(aggregatedTrailing) : null,
      },
      splhActual: {
        value: hasAnyEntries ? salesPerLaborHour(aggregated, "actual") : null,
        targetValue: null,
        trailingAverageValue: aggregatedTrailing
          ? salesPerLaborHour(aggregatedTrailing, "actual")
          : null,
      },
      guestsPerLaborHourActual: {
        value: hasAnyEntries ? guestsPerLaborHour(aggregated, "actual") : null,
        targetValue: null,
        trailingAverageValue: aggregatedTrailing
          ? guestsPerLaborHour(aggregatedTrailing, "actual")
          : null,
      },
      overtimePercent: {
        value: hasAnyEntries ? overtimePercent(aggregated) : null,
        targetValue: target?.target_overtime_percent ?? null,
        trailingAverageValue: aggregatedTrailing ? overtimePercent(aggregatedTrailing) : null,
      },
    },
  };
}
