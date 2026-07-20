"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireOrgAdmin,
  requireOrgAdminOrOwner,
  PermissionError,
} from "@/lib/auth/requireRole";
import type { Enums } from "@/lib/supabase/types";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveLaborTarget(input: {
  organizationId: string;
  locationId: string | null;
  effectiveDate: string;
  targetTotalLaborPercent: number;
  targetFohPercent: number | null;
  targetBohPercent: number | null;
  targetManagementPercent: number | null;
  includeManagementInProductive: boolean;
  targetOvertimePercent: number | null;
}): Promise<ActionResult> {
  try {
    await requireOrgAdminOrOwner(input.organizationId);
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  if (input.targetTotalLaborPercent < 0 || input.targetTotalLaborPercent > 1) {
    return { ok: false, error: "Target total labor % must be between 0% and 100%." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("labor_targets").upsert(
    {
      organization_id: input.organizationId,
      location_id: input.locationId,
      effective_date: input.effectiveDate,
      target_total_labor_percent: input.targetTotalLaborPercent,
      target_foh_percent: input.targetFohPercent,
      target_boh_percent: input.targetBohPercent,
      target_management_percent: input.targetManagementPercent,
      include_management_in_productive: input.includeManagementInProductive,
      target_overtime_percent: input.targetOvertimePercent,
    },
    { onConflict: "organization_id,location_id,effective_date" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings/targets");
  return { ok: true };
}

export async function saveDaypart(input: {
  organizationId: string;
  locationId: string;
  code: string;
  label: string;
  sortOrder: number;
}): Promise<ActionResult> {
  try {
    await requireOrgAdmin(input.organizationId);
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("daypart_configs").upsert(
    {
      organization_id: input.organizationId,
      location_id: input.locationId,
      code: input.code.trim().toLowerCase().replace(/\s+/g, "_"),
      label: input.label.trim(),
      sort_order: input.sortOrder,
    },
    { onConflict: "organization_id,location_id,code" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings/dayparts");
  return { ok: true };
}

export async function setDaypartActive(
  organizationId: string,
  daypartId: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    await requireOrgAdmin(organizationId);
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("daypart_configs")
    .update({ is_active: isActive })
    .eq("id", daypartId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings/dayparts");
  return { ok: true };
}

export async function saveLaborRole(input: {
  organizationId: string;
  name: string;
  category: Enums<"labor_role_category">;
  defaultHourlyWage: number | null;
}): Promise<ActionResult> {
  try {
    await requireOrgAdmin(input.organizationId);
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("labor_roles").upsert(
    {
      organization_id: input.organizationId,
      name: input.name.trim(),
      category: input.category,
      default_hourly_wage: input.defaultHourlyWage,
    },
    { onConflict: "organization_id,name" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings/roles");
  return { ok: true };
}

export async function setLaborRoleActive(
  organizationId: string,
  roleId: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    await requireOrgAdmin(organizationId);
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("labor_roles").update({ is_active: isActive }).eq("id", roleId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings/roles");
  return { ok: true };
}

export async function saveOrgSettings(input: {
  organizationId: string;
  editLockHoursAfterBusinessDate: number;
  approvalRequired: boolean;
  guestsPerLaborHourHighThreshold: number;
  scheduledVsActualVarianceThresholdPercent: number;
}): Promise<ActionResult> {
  try {
    await requireOrgAdmin(input.organizationId);
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("org_settings")
    .update({
      edit_lock_hours_after_business_date: input.editLockHoursAfterBusinessDate,
      approval_required: input.approvalRequired,
      guests_per_labor_hour_high_threshold: input.guestsPerLaborHourHighThreshold,
      scheduled_vs_actual_variance_threshold_percent: input.scheduledVsActualVarianceThresholdPercent,
    })
    .eq("organization_id", input.organizationId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings");
  return { ok: true };
}

/** Invites a new user by email and grants them a membership. Uses the
 * service-role admin client ONLY for the invite call itself (which
 * legitimately needs to create an auth.users row outside any one
 * requester's session) — the org_admin authorization check still runs
 * first via the normal RLS-backed client. */
export async function inviteUser(input: {
  organizationId: string;
  locationId: string | null;
  email: string;
  role: Enums<"membership_role">;
}): Promise<ActionResult> {
  try {
    await requireOrgAdmin(input.organizationId);
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: e.message };
    throw e;
  }

  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    input.email,
  );
  if (inviteError || !invited.user) {
    return { ok: false, error: inviteError?.message ?? "Could not invite this user." };
  }

  const { error: membershipError } = await admin.from("memberships").insert({
    user_id: invited.user.id,
    organization_id: input.organizationId,
    location_id: input.locationId,
    role: input.role,
  });

  if (membershipError) return { ok: false, error: membershipError.message };
  revalidatePath("/app/settings/users");
  return { ok: true };
}
