import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server client - for use in Server Components and Route Handlers. Reads/
 * writes auth cookies via next/headers, respects the signed-in user's own
 * session and RLS (does NOT bypass RLS - see admin.ts for that). `cookies()`
 * is async in Next.js 15, so this factory is async too.
 *
 * The try/catch around setAll is the standard @supabase/ssr guard: Server
 * Components can't write cookies (Next.js throws if you try), which is fine
 * as long as the middleware is refreshing the session on every request -
 * that's the only place cookies actually need writing.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
            // Called from a Server Component - safe to ignore since the
            // middleware refreshes the session on every request.
          }
        },
      },
    },
  );
}
