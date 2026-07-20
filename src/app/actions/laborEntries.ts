"use server";

import { createClient } from "@/lib/supabase/server";
import { requireLocationEditAccess, requireOrgAdmin, PermissionError } from "@/lib/auth/requireRole";
import { validateLaborEntryInput, type LaborEntryFormValues } from "@/lib/validation/laborEntry";
import type { Tables } from "@/lib/supabase/types";

export interface SaveLaborEntryInput {
  organizationId: string;
  locationId: string;
  businessDate: string; // YYYY-MM-DD
  daypartId: string;
  status: "draft" | "final";
  values: LaborEntryFormValues;
  notes?: string | null;
  weatherOrEventNote?: string | null;
}

export type SaveLaborEntryResult =
  | { ok: true; entry: Tables<"labor_entries">; warnings: string[] }
  | { ok: false; errors: string[] };

export async function saveLaborEntry(input: SaveLaborEntryInput): Promise<SaveLaborEntryResult> {
  const { errors, warnings } = validateLaborEntryInput(input.values, {
    requireCompleteness: input.status === "final",
  });
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  try {
    await requireLocationEditAccess(input.locationId);
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, errors: [e.message] };
    throw e;
  }

  const supabase = await createClient();
  const v = input.values;

  const { data, error } = await supabase
    .from("labor_entries")
    .upsert(
      {
        organization_id: input.organizationId,
        location_id: input.locationId,
        business_date: input.businessDate,
        daypart_id: input.daypartId,
        status: input.status,
        net_sales: v.netSales ?? 0,
        gross_sales: v.grossSales ?? null,
        discounts_comps: v.discountsComps ?? null,
        guest_count: v.guestCount ?? null,
        transaction_count: v.transactionCount ?? null,
        scheduled_hours: v.scheduledHours ?? 0,
        actual_hours: v.actualHours ?? 0,
        scheduled_labor_dollars: v.scheduledLaborDollars ?? null,
        regular_labor_dollars: v.regularLaborDollars ?? 0,
        overtime_hours: v.overtimeHours ?? 0,
        overtime_dollars: v.overtimeDollars ?? 0,
        foh_labor_dollars: v.fohLaborDollars ?? 0,
        boh_labor_dollars: v.bohLaborDollars ?? 0,
        management_labor_dollars: v.managementLaborDollars ?? 0,
        catering_event_labor_dollars: v.cateringEventLaborDollars ?? null,
        notes: input.notes ?? null,
        weather_or_event_note: input.weatherOrEventNote ?? null,
      },
      { onConflict: "location_id,business_date,daypart_id" },
    )
    .select()
    .single();

  if (error) {
    return { ok: false, errors: [error.message] };
  }

  return { ok: true, entry: data, warnings };
}

export type LockLaborEntryResult = { ok: true } | { ok: false, errors: string[] };

/** Org Admins can lock (or unlock, for correcting a mistake) any entry
 * regardless of the edit-lock window — see can_edit_location_entries /
 * is_org_admin in supabase/migrations/0001_platform_core.sql. */
export async function setLaborEntryStatus(
  entryId: string,
  organizationId: string,
  status: "draft" | "final" | "locked",
): Promise<LockLaborEntryResult> {
  try {
    await requireOrgAdmin(organizationId);
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, errors: [e.message] };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("labor_entries").update({ status }).eq("id", entryId);

  if (error) return { ok: false, errors: [error.message] };
  return { ok: true };
}
