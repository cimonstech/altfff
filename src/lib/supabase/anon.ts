import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Deliberately session-LESS anonymous client - plain @supabase/supabase-js,
 * NOT the @supabase/ssr cookie-aware helper, so it never attaches whatever
 * Supabase session cookies the requesting browser happens to be carrying.
 *
 * WHY THIS EXISTS: the public form routes (contact, exhibitor-applications,
 * sponsor-inquiries, visitor-registrations) originally used the cookie-aware
 * server client. A visitor who was ALSO logged into the admin dashboard in
 * the same browser submitted a public form carrying an expired admin-session
 * JWT, and PostgREST rejected the insert with PGRST303 "JWT expired" - a
 * 500 on a form that a truly anonymous visitor would have submitted fine.
 * Public form submissions are anonymous inserts by design (the RLS policies
 * explicitly grant anon INSERT on these tables); they must never inherit
 * incidental session state. This client always requests as pure anon.
 *
 * Built lazily (inside the function, not at module top level) per the
 * established pattern - a top-level construct can crash the whole build
 * during page-data collection if an env var is missing.
 *
 * Do NOT use this for admin routes (/api/admin/...) - those correctly need
 * the cookie-aware server client to identify the requesting admin.
 */
let cachedClient: SupabaseClient | null = null;

export function createAnonClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return cachedClient;
}
