import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

// Server-side client scoped to the signed-in user's session. Uses the anon
// key + the caller's cookies, so every query still goes through Postgres
// RLS — this is NOT a service-role bypass. See lib/supabase/admin.ts for
// the (rarely needed) service-role client.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component without a response to
            // attach cookies to — safe to ignore as long as middleware.ts
            // is refreshing the session on every request.
          }
        },
      },
    },
  );
}
