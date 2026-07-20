import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client. Bypasses Row Level Security entirely.
 *
 * Server-only — importing this into any client component or route that
 * ships to the browser is a security bug. Only use for operations that
 * genuinely require crossing tenant boundaries (e.g. a cron rollup job).
 * Every request-scoped read/write (server actions, route handlers backing
 * user-facing pages) must go through lib/supabase/server.ts instead, so
 * multi-tenant isolation is enforced by Postgres, not by app-layer code.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient must never be called from the browser.");
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
