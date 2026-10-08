import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client - for use in client components only. Reads the two
 * NEXT_PUBLIC_ env vars (safe to expose) and respects the signed-in user's
 * session/RLS, same as the server client. Never use this for anything that
 * needs to bypass RLS - see admin.ts for that.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
