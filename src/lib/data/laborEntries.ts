import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type DaypartConfig = Tables<"daypart_configs">;
export type LaborEntryRow = Tables<"labor_entries">;
export type LaborTargetRow = Tables<"labor_targets">;

export async function getDaypartsForLocation(
  organizationId: string,
  locationId: string,
): Promise<DaypartConfig[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daypart_configs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data;
}

/** All of a location's entries for one business date, keyed by daypart_id,
 * so the entry page can hydrate every daypart tab from a single query. */
export async function getEntriesForDate(
  locationId: string,
  businessDate: string,
): Promise<Map<string, LaborEntryRow>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("labor_entries")
    .select("*")
    .eq("location_id", locationId)
    .eq("business_date", businessDate);

  if (error) throw error;
  return new Map(data.map((row) => [row.daypart_id, row]));
}

/** The target effective on or before businessDate, most specific first:
 * location-specific target beats an org-wide (location_id null) target. */
export async function getActiveTarget(
  organizationId: string,
  locationId: string,
  businessDate: string,
): Promise<LaborTargetRow | null> {
  const supabase = await createClient();
  const [locationScoped, orgWide] = await Promise.all([
    supabase
      .from("labor_targets")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("location_id", locationId)
      .lte("effective_date", businessDate)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("labor_targets")
      .select("*")
      .eq("organization_id", organizationId)
      .is("location_id", null)
      .lte("effective_date", businessDate)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (locationScoped.error) throw locationScoped.error;
  if (orgWide.error) throw orgWide.error;

  return locationScoped.data ?? orgWide.data ?? null;
}

/** Raw entries for the same day-of-week as businessDate, over the trailing
 * `weeks` occurrences strictly before it. This is the "trailing 4-week
 * average for that day-of-week/daypart" baseline the brief's Review
 * workflow and KPI cards both compare against — every KPI (Total Labor %,
 * SPLH, Guests/Labor Hour, OT %) gets its own trailing-average version by
 * aggregating these rows and computing the metric on the aggregate, not by
 * averaging daily percentages (which would over-weight low-volume days). */
export async function getTrailingSameWeekdayEntries(
  locationId: string,
  daypartId: string,
  businessDate: string,
  weeks = 4,
): Promise<LaborEntryRow[]> {
  const supabase = await createClient();
  const startDate = new Date(businessDate);
  startDate.setDate(startDate.getDate() - 7 * weeks);

  const { data, error } = await supabase
    .from("labor_entries")
    .select("*")
    .eq("location_id", locationId)
    .eq("daypart_id", daypartId)
    .lt("business_date", businessDate)
    .gte("business_date", startDate.toISOString().slice(0, 10))
    .order("business_date", { ascending: false });

  if (error) throw error;

  const targetDayOfWeek = new Date(businessDate).getUTCDay();
  return data.filter((row) => new Date(row.business_date).getUTCDay() === targetDayOfWeek);
}

/** Average net sales across getTrailingSameWeekdayEntries — the simpler
 * figure the understaffing flag uses as its "forecast" proxy. */
export async function getTrailingAverageNetSales(
  locationId: string,
  daypartId: string,
  businessDate: string,
  weeks = 4,
): Promise<number | null> {
  const rows = await getTrailingSameWeekdayEntries(locationId, daypartId, businessDate, weeks);
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, row) => sum + row.net_sales, 0);
  return total / rows.length;
}
