import { redirect } from "next/navigation";
import { getCurrentUserContext, hasAnyRole } from "@/lib/auth/session";
import { getUserLocations } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { TargetForm } from "./TargetForm";

export default async function TargetsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const isOrgAdminOrOwner = hasAnyRole(context.memberships, ["org_admin", "owner"]);
  if (!isOrgAdminOrOwner) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-muted">
        This page requires the Org Admin or Owner role.
      </div>
    );
  }

  const { location } = await searchParams;
  const locations = await getUserLocations(context);
  if (locations.length === 0) return <p className="text-sm text-muted">No locations yet.</p>;
  const selectedLocation = locations.find((l) => l.id === location) ?? locations[0];

  const supabase = await createClient();
  const { data: targets } = await supabase
    .from("labor_targets")
    .select("*")
    .eq("organization_id", selectedLocation.organizationId)
    .eq("location_id", selectedLocation.id)
    .order("effective_date", { ascending: false });

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Labor targets — {selectedLocation.name}</h2>
      <p className="mb-4 text-sm text-muted">
        Targets are effective-dated — the most recent one on or before a given business date
        applies. Dashboards and reports show &quot;no target set&quot; rather than a false
        good/bad color until one exists.
      </p>
      <TargetForm
        organizationId={selectedLocation.organizationId}
        locationId={selectedLocation.id}
        targets={targets ?? []}
      />
    </div>
  );
}
