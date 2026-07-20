import { createClient } from "@/lib/supabase/server";
import type { CurrentUserContext, MembershipRole } from "@/lib/auth/session";

export interface LocationSummary {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: MembershipRole;
}

/**
 * Expands a user's memberships into the concrete locations they can act on.
 * An org-wide membership (location_id null — Owner, Org Admin, org-level
 * Read-only) grants every active location in that org; a location-scoped
 * membership grants just that one. This mirrors has_location_access() in
 * SQL — see supabase/migrations/0001_platform_core.sql — but is only used
 * for UI display (which locations to list); RLS is what actually enforces
 * access when the data is queried.
 */
export async function getUserLocations(
  context: CurrentUserContext,
): Promise<LocationSummary[]> {
  const orgIds = [...new Set(context.memberships.map((m) => m.organizationId))];
  if (orgIds.length === 0) return [];

  const supabase = await createClient();
  const [{ data: orgs }, { data: locations }] = await Promise.all([
    supabase.from("organizations").select("id, name").in("id", orgIds),
    supabase
      .from("locations")
      .select("id, name, organization_id")
      .in("organization_id", orgIds)
      .eq("is_active", true),
  ]);

  const orgNameById = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  const result = new Map<string, LocationSummary>();

  for (const membership of context.memberships) {
    const orgLocations = (locations ?? []).filter(
      (l) => l.organization_id === membership.organizationId,
    );
    const grantedLocations =
      membership.locationId === null
        ? orgLocations
        : orgLocations.filter((l) => l.id === membership.locationId);

    for (const loc of grantedLocations) {
      if (result.has(loc.id)) continue;
      result.set(loc.id, {
        id: loc.id,
        name: loc.name,
        organizationId: membership.organizationId,
        organizationName: orgNameById.get(membership.organizationId) ?? "Organization",
        role: membership.role,
      });
    }
  }

  return [...result.values()];
}
