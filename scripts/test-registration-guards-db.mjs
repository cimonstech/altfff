/**
 * Direct DB tests for duplicate finder (no HTTP server required).
 * Run: node --env-file=.env.local scripts/test-registration-guards-db.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) process.exit(1);

const supabase = createClient(url, key, { auth: { persistSession: false } });

function escapeIlike(value) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function findBlocking(table, email, statuses) {
  const { data, error } = await supabase
    .from(table)
    .select("id, status, email")
    .in("status", statuses)
    .ilike("email", escapeIlike(email.trim()))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function main() {
  const blocking = await findBlocking(
    "visitor_registrations",
    "prillayoung55@gmail.com",
    ["registered", "confirmed"],
  );
  console.log("Known visitor duplicate email blocks:", !!blocking, blocking);

  const exhibitor = await findBlocking(
    "exhibitor_applications",
    "kiaraafrik@gmail.com",
    ["new", "under_review", "invoiced", "payment_received", "confirmed"],
  );
  console.log("Known exhibitor duplicate email blocks:", !!exhibitor, exhibitor);

  const tag = `decline-test-${Date.now()}@test.local`;
  const id = crypto.randomUUID();
  await supabase.from("visitor_registrations").insert({
    id,
    email: tag,
    full_name: "Decline Test",
    status: "declined",
  });
  const declinedAllows = await findBlocking("visitor_registrations", tag, ["registered", "confirmed"]);
  console.log("Declined row does not block:", declinedAllows === null);
  await supabase.from("visitor_registrations").delete().eq("id", id);
}

main().catch(console.error);
