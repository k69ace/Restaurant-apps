import { redirect } from "next/navigation";
import { getCurrentUserContext, hasAnyRole } from "@/lib/auth/session";
import { getUserLocations } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { OrgSettingsForm } from "./OrgSettingsForm";

export default async function OrgSettingsPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const isOrgAdmin = hasAnyRole(context.memberships, ["org_admin"]);
  if (!isOrgAdmin) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-muted">
        This page requires the Org Admin role.
      </div>
    );
  }

  const locations = await getUserLocations(context);
  if (locations.length === 0) return <p className="text-sm text-muted">No locations yet.</p>;
  const organizationId = locations[0].organizationId;

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("org_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .single();

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Organization settings</h2>
      <p className="mb-4 text-sm text-muted">
        Edit-lock window, approval workflow, and understaffing-flag thresholds. Sane defaults are
        pre-filled; adjust for your operation.
      </p>
      <OrgSettingsForm
        organizationId={organizationId}
        editLockHoursAfterBusinessDate={settings?.edit_lock_hours_after_business_date ?? 48}
        approvalRequired={settings?.approval_required ?? false}
        guestsPerLaborHourHighThreshold={settings?.guests_per_labor_hour_high_threshold ?? 3.5}
        scheduledVsActualVarianceThresholdPercent={
          settings?.scheduled_vs_actual_variance_threshold_percent ?? 10
        }
      />
    </div>
  );
}
