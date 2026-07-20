import { redirect } from "next/navigation";
import { getCurrentUserContext, hasAnyRole } from "@/lib/auth/session";
import { getUserLocations } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { InviteUserForm } from "./InviteUserForm";

export default async function UsersSettingsPage() {
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
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, role, location_id, user_id")
    .eq("organization_id", organizationId);

  const userIds = [...new Set((memberships ?? []).map((m) => m.user_id))];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
      : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const locationById = new Map(locations.map((l) => [l.id, l.name]));

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Users</h2>
      <p className="mb-4 text-sm text-muted">
        Manage who has access to this organization and at what role. This is the shared platform
        core&apos;s user/role model — not duplicated per module.
      </p>

      <div className="mb-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Location</th>
            </tr>
          </thead>
          <tbody>
            {(memberships ?? []).length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-muted">
                  No members yet.
                </td>
              </tr>
            ) : (
              (memberships ?? []).map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{nameById.get(m.user_id) ?? "Unknown"}</td>
                  <td className="px-3 py-2 text-muted">{m.role.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2 text-muted">
                    {m.location_id ? (locationById.get(m.location_id) ?? "Unknown") : "All locations"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InviteUserForm organizationId={organizationId} locations={locations} />
    </div>
  );
}
