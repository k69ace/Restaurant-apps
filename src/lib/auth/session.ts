import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

export type MembershipRole = Enums<"membership_role">;

export interface Membership {
  id: string;
  organizationId: string;
  locationId: string | null;
  role: MembershipRole;
}

export interface CurrentUserContext {
  userId: string;
  email: string | null;
  displayName: string;
  memberships: Membership[];
}

/** Returns null when there is no signed-in user — callers decide whether
 * that means "redirect to /login" or "render a public page". */
export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase
      .from("memberships")
      .select("id, organization_id, location_id, role"),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? user.email ?? "User",
    memberships: (memberships ?? []).map((m) => ({
      id: m.id,
      organizationId: m.organization_id,
      locationId: m.location_id,
      role: m.role,
    })),
  };
}

export function hasAnyRole(memberships: Membership[], roles: MembershipRole[]): boolean {
  return memberships.some((m) => roles.includes(m.role));
}

export function membershipForLocation(
  memberships: Membership[],
  locationId: string,
): Membership | undefined {
  return memberships.find(
    (m) => m.locationId === locationId || m.locationId === null,
  );
}
