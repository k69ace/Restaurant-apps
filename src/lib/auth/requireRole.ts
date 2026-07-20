import { createClient } from "@/lib/supabase/server";

/**
 * Server-side authorization guards for server actions / route handlers.
 *
 * These call the SAME SECURITY DEFINER SQL functions Postgres RLS uses
 * (has_location_access, can_edit_location_entries, is_org_admin,
 * is_org_admin_or_owner) via RPC, rather than re-implementing role logic in
 * TypeScript — so there is exactly one source of truth for "who can do
 * what," and it can't drift between the app layer and the database layer.
 *
 * Note that RLS is the real, unbypassable enforcement boundary: even if a
 * server action forgot to call one of these, the underlying insert/update/
 * select would still be rejected by Postgres. These guards exist so the app
 * can fail with a clear, role-aware message instead of an opaque RLS error,
 * and so permission checks happen before any partial work is attempted.
 */

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export async function requireLocationAccess(locationId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_location_access", {
    target_location: locationId,
  });
  if (error || !data) {
    throw new PermissionError("You don't have access to this location.");
  }
}

export async function requireLocationEditAccess(locationId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("can_edit_location_entries", {
    target_location: locationId,
  });
  if (error || !data) {
    throw new PermissionError(
      "You don't have permission to edit labor entries for this location. Read-only reporting access can view data but not save changes.",
    );
  }
}

export async function requireOrgAdmin(organizationId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_org_admin", {
    target_org: organizationId,
  });
  if (error || !data) {
    throw new PermissionError("This action requires the Org Admin role.");
  }
}

export async function requireOrgAdminOrOwner(organizationId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_org_admin_or_owner", {
    target_org: organizationId,
  });
  if (error || !data) {
    throw new PermissionError("This action requires the Org Admin or Owner role.");
  }
}
