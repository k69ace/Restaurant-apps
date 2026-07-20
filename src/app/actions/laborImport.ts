"use server";

import { createClient } from "@/lib/supabase/server";
import { requireLocationEditAccess, PermissionError } from "@/lib/auth/requireRole";
import type { LaborImportRow, LaborImportRowError } from "@/lib/integrations/labor-import/types";

export interface ImportCommitResult {
  committed: number;
  errors: LaborImportRowError[];
}

/**
 * Commits already-parsed-and-validated CSV rows (see
 * lib/integrations/labor-import/csv.ts) to labor_entries. Rows are only
 * skipped with a reported, row-numbered reason — a code that doesn't match
 * any configured daypart for this location, for instance — never silently.
 */
export async function importLaborEntries(
  organizationId: string,
  locationId: string,
  rows: LaborImportRow[],
): Promise<ImportCommitResult> {
  try {
    await requireLocationEditAccess(locationId);
  } catch (e) {
    if (e instanceof PermissionError) {
      return { committed: 0, errors: rows.map((r) => ({ sourceRow: r.sourceRow, message: e.message })) };
    }
    throw e;
  }

  const supabase = await createClient();
  const { data: dayparts, error: daypartError } = await supabase
    .from("daypart_configs")
    .select("id, code")
    .eq("organization_id", organizationId)
    .eq("location_id", locationId);

  if (daypartError) {
    return {
      committed: 0,
      errors: rows.map((r) => ({ sourceRow: r.sourceRow, message: daypartError.message })),
    };
  }

  const daypartIdByCode = new Map((dayparts ?? []).map((d) => [d.code.toLowerCase(), d.id]));
  const errors: LaborImportRowError[] = [];
  let committed = 0;

  for (const row of rows) {
    const daypartId = daypartIdByCode.get(row.daypartCode.toLowerCase());
    if (!daypartId) {
      errors.push({
        sourceRow: row.sourceRow,
        message: `No daypart configured with code "${row.daypartCode}" for this location. Add it under Settings > Dayparts first.`,
      });
      continue;
    }

    const { error } = await supabase.from("labor_entries").upsert(
      {
        organization_id: organizationId,
        location_id: locationId,
        business_date: row.businessDate,
        daypart_id: daypartId,
        status: "draft",
        net_sales: row.netSales,
        gross_sales: row.grossSales,
        discounts_comps: row.discountsComps,
        guest_count: row.guestCount,
        transaction_count: row.transactionCount,
        scheduled_hours: row.scheduledHours,
        actual_hours: row.actualHours,
        scheduled_labor_dollars: row.scheduledLaborDollars,
        regular_labor_dollars: row.regularLaborDollars,
        overtime_hours: row.overtimeHours,
        overtime_dollars: row.overtimeDollars,
        foh_labor_dollars: row.fohLaborDollars,
        boh_labor_dollars: row.bohLaborDollars,
        management_labor_dollars: row.managementLaborDollars,
        catering_event_labor_dollars: row.cateringEventLaborDollars,
      },
      { onConflict: "location_id,business_date,daypart_id" },
    );

    if (error) {
      errors.push({ sourceRow: row.sourceRow, message: error.message });
      continue;
    }
    committed += 1;
  }

  return { committed, errors };
}
