import { redirect } from "next/navigation";
import { getCurrentUserContext, hasAnyRole } from "@/lib/auth/session";
import { getUserLocations } from "@/lib/data/workspace";
import { getDaypartsForLocation } from "@/lib/data/laborEntries";
import { DaypartForm } from "./DaypartForm";

export default async function DaypartsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const { location } = await searchParams;
  const locations = await getUserLocations(context);
  if (locations.length === 0) {
    return <p className="text-sm text-muted">No locations yet.</p>;
  }
  const selectedLocation = locations.find((l) => l.id === location) ?? locations[0];
  const dayparts = await getDaypartsForLocation(selectedLocation.organizationId, selectedLocation.id);
  const canEdit = hasAnyRole(context.memberships, ["org_admin"]);

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Dayparts — {selectedLocation.name}</h2>
      <p className="mb-4 text-sm text-muted">
        Dayparts (Lunch, Dinner, custom) are configurable per location. Only an Org Admin can add
        or deactivate them.
      </p>
      <DaypartForm
        organizationId={selectedLocation.organizationId}
        locationId={selectedLocation.id}
        dayparts={dayparts}
        canEdit={canEdit}
      />
    </div>
  );
}
