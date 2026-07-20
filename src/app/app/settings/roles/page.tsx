import { redirect } from "next/navigation";
import { getCurrentUserContext, hasAnyRole } from "@/lib/auth/session";
import { getUserLocations } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { RoleForm } from "./RoleForm";

export default async function RolesSettingsPage() {
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
  const { data: roles } = await supabase
    .from("labor_roles")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Labor roles</h2>
      <p className="mb-4 text-sm text-muted">
        Roles used for optional role-level detail on the Daily Entry form and Role Analysis
        report.
      </p>
      <RoleForm organizationId={organizationId} roles={roles ?? []} />
    </div>
  );
}
