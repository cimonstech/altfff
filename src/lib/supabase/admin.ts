import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client - bypasses Row Level Security entirely. Uses
 * createClient from @supabase/supabase-js directly, not the @supabase/ssr
 * helper, since this never needs to read/write the browser's session
 * cookies - it authenticates as the service role itself, not as any
 * particular user.
 *
 * SERVER-ONLY. Never import this in a client component or anywhere its
 * module could end up in a browser bundle - SUPABASE_SERVICE_ROLE_KEY has
 * no RLS restrictions at all. Only ever import this in Route Handlers
 * (app/api/**\/route.ts), for operations that must deliberately bypass RLS:
 * the admin-invite operation today, and later the bulk-communication queue.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
