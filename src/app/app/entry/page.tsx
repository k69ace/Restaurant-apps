import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/session";
import { getUserLocations } from "@/lib/data/workspace";
import { getDaypartsForLocation, getEntriesForDate, getActiveTarget } from "@/lib/data/laborEntries";
import { EntryWorkspace } from "./EntryWorkspace";
import { EntryControls } from "./EntryControls";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function EntryPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; date?: string }>;
}) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const { location, date } = await searchParams;
  const locations = await getUserLocations(context);

  if (locations.length === 0) {
    return (
      <EmptyState message="No labor data yet for this location — enter today's numbers to get started. First, ask your Org Admin to add a location if you don't see one." />
    );
  }

  const selectedLocation = locations.find((l) => l.id === location) ?? locations[0];
  const businessDate = date ?? todayIso();

  const [dayparts, entriesMap, target] = await Promise.all([
    getDaypartsForLocation(selectedLocation.organizationId, selectedLocation.id),
    getEntriesForDate(selectedLocation.id, businessDate),
    getActiveTarget(selectedLocation.organizationId, selectedLocation.id, businessDate),
  ]);

  const entriesByDaypart = Object.fromEntries(
    dayparts.map((dp) => [dp.id, entriesMap.get(dp.id) ?? null]),
  );

  const canEdit = selectedLocation.role !== "read_only";

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Daily Entry</h1>
      <p className="mb-4 text-sm text-muted">{selectedLocation.name}</p>

      <EntryControls
        locations={locations}
        selectedLocationId={selectedLocation.id}
        businessDate={businessDate}
      />

      {dayparts.length === 0 ? (
        <EmptyState message="No labor data yet for this location — enter today's numbers to get started. An Org Admin can configure dayparts from Settings." />
      ) : (
        <EntryWorkspace
          organizationId={selectedLocation.organizationId}
          locationId={selectedLocation.id}
          businessDate={businessDate}
          dayparts={dayparts}
          entriesByDaypart={entriesByDaypart}
          target={target}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-xl border border-border p-6 text-sm text-muted">{message}</div>;
}
