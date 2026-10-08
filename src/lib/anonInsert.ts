import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Insert a public form row via the session-less anon client.
 *
 * anon has INSERT-only on these tables — no SELECT policy — so
 * `.insert().select()` fails with RLS 42501 even when the row is saved.
 * Assign the uuid here instead of reading it back.
 */
export async function anonInsertWithId<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  row: T,
): Promise<string> {
  const id = randomUUID();
  const { error } = await supabase.from(table).insert({ ...row, id });
  if (error) throw error;
  return id;
}
