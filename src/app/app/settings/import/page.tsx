import { redirect } from "next/navigation";
import { getCurrentUserContext, hasAnyRole } from "@/lib/auth/session";
import { getUserLocations } from "@/lib/data/workspace";
import { ImportCsvClient } from "./ImportCsvClient";

export default async function ImportSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const { location } = await searchParams;
  const locations = await getUserLocations(context);
  if (locations.length === 0) return <p className="text-sm text-muted">No locations yet.</p>;
  const selectedLocation = locations.find((l) => l.id === location) ?? locations[0];

  const canEdit = hasAnyRole(context.memberships, [
    "org_admin",
    "owner",
    "general_manager",
    "assistant_manager",
    "kitchen_manager",
    "foh_manager",
  ]);

  if (!canEdit) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-muted">
        Read-only access can&apos;t import data.
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Import CSV — {selectedLocation.name}</h2>
      <p className="mb-4 text-sm text-muted">
        Bring in sales/covers/labor data exported from a POS or spreadsheet. No live POS
        integration exists in this build — this is the manual/CSV path; see the module README for
        the integration roadmap.
      </p>
      <ImportCsvClient
        organizationId={selectedLocation.organizationId}
        locationId={selectedLocation.id}
      />
    </div>
  );
}
