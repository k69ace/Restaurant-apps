import { createClient } from "@/lib/supabase/server";
import { getActiveTarget, type LaborEntryRow } from "@/lib/data/laborEntries";
import {
  aggregateLaborEntries,
  overtimePercent,
  salesPerLaborHour,
  totalLaborPercent,
  type LaborEntryInput,
} from "@/lib/calculations/labor";
import type { Tables } from "@/lib/supabase/types";

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

export async function getEntriesInRange(
  locationId: string,
  startDate: string,
  endDate: string,
): Promise<LaborEntryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("labor_entries")
    .select("*")
    .eq("location_id", locationId)
    .gte("business_date", startDate)
    .lte("business_date", endDate)
    .order("business_date", { ascending: true });

  if (error) throw error;
  return data;
}

export interface DailySummary {
  date: string;
  calcInput: LaborEntryInput;
  laborPercent: number | null;
  splh: number | null;
  otPercent: number | null;
}

export function summarizeByDay(entries: LaborEntryRow[]): DailySummary[] {
  const byDate = new Map<string, LaborEntryRow[]>();
  for (const row of entries) {
    const list = byDate.get(row.business_date) ?? [];
    list.push(row);
    byDate.set(row.business_date, list);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => {
      const calcInput = aggregateLaborEntries(rows.map(rowToCalcInput));
      return {
        date,
        calcInput,
        laborPercent: totalLaborPercent(calcInput),
        splh: salesPerLaborHour(calcInput, "actual"),
        otPercent: overtimePercent(calcInput),
      };
    });
}

export interface PeriodSummary {
  calcInput: LaborEntryInput;
  laborPercent: number | null;
  splh: number | null;
  otPercent: number | null;
  entryCount: number;
}

export function summarizePeriod(entries: LaborEntryRow[]): PeriodSummary {
  const calcInput = aggregateLaborEntries(entries.map(rowToCalcInput));
  return {
    calcInput,
    laborPercent: totalLaborPercent(calcInput),
    splh: salesPerLaborHour(calcInput, "actual"),
    otPercent: overtimePercent(calcInput),
    entryCount: entries.length,
  };
}

export interface DaypartSummary {
  daypartId: string;
  daypartLabel: string;
  summary: PeriodSummary;
}

export async function summarizeByDaypart(
  organizationId: string,
  locationId: string,
  entries: LaborEntryRow[],
): Promise<DaypartSummary[]> {
  const supabase = await createClient();
  const { data: dayparts, error } = await supabase
    .from("daypart_configs")
    .select("id, label")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId);
  if (error) throw error;

  const labelById = new Map((dayparts ?? []).map((d) => [d.id, d.label]));
  const byDaypart = new Map<string, LaborEntryRow[]>();
  for (const row of entries) {
    const list = byDaypart.get(row.daypart_id) ?? [];
    list.push(row);
    byDaypart.set(row.daypart_id, list);
  }

  return [...byDaypart.entries()].map(([daypartId, rows]) => ({
    daypartId,
    daypartLabel: labelById.get(daypartId) ?? "Unknown daypart",
    summary: summarizePeriod(rows),
  }));
}

export interface RoleSummary {
  roleId: string;
  roleName: string;
  category: Tables<"labor_roles">["category"];
  hours: number;
  dollars: number;
}

export async function summarizeByRole(
  organizationId: string,
  locationId: string,
  startDate: string,
  endDate: string,
): Promise<RoleSummary[]> {
  const supabase = await createClient();

  const { data: roleEntries, error } = await supabase
    .from("labor_role_entries")
    .select("hours, dollars, labor_role_id, labor_entries!inner(location_id, business_date)")
    .eq("labor_entries.location_id", locationId)
    .gte("labor_entries.business_date", startDate)
    .lte("labor_entries.business_date", endDate);
  if (error) throw error;

  const { data: roles, error: rolesError } = await supabase
    .from("labor_roles")
    .select("id, name, category")
    .eq("organization_id", organizationId);
  if (rolesError) throw rolesError;

  const roleById = new Map((roles ?? []).map((r) => [r.id, r]));
  const totals = new Map<string, { hours: number; dollars: number }>();

  for (const entry of roleEntries ?? []) {
    const current = totals.get(entry.labor_role_id) ?? { hours: 0, dollars: 0 };
    current.hours += entry.hours;
    current.dollars += entry.dollars;
    totals.set(entry.labor_role_id, current);
  }

  return [...totals.entries()].map(([roleId, { hours, dollars }]) => {
    const role = roleById.get(roleId);
    return {
      roleId,
      roleName: role?.name ?? "Unknown role",
      category: role?.category ?? "foh",
      hours,
      dollars,
    };
  });
}

export { getActiveTarget };
