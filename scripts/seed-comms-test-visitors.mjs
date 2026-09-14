/**
 * Seed two visitor rows for admin Communications / SMS testing.
 * Run: node --env-file=.env.local scripts/seed-comms-test-visitors.mjs
 *
 * Upserts by email (case-insensitive). Safe to re-run.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const SEED_ROWS = [
  {
    full_name: "Batista",
    email: "batista.simons1@gmail.com",
    phone: "+233553018172",
  },
  {
    full_name: "Esi Boateng",
    email: "esi.boateng.sms-test@example.com",
    phone: "+233556117046",
  },
];

async function upsertVisitor(row) {
  const email = row.email.trim().toLowerCase();
  const { data: existing, error: findError } = await supabase
    .from("visitor_registrations")
    .select("id, email, full_name, phone, status")
    .ilike("email", email)
    .maybeSingle();

  if (findError) throw findError;

  const payload = {
    full_name: row.full_name,
    email,
    phone: row.phone,
    status: "confirmed",
    source: "pre_registered",
    admin_notes: "SMS comms test seed — safe to delete after testing",
  };

  if (existing) {
    const { data, error } = await supabase
      .from("visitor_registrations")
      .update(payload)
      .eq("id", existing.id)
      .select("id, full_name, email, phone, status")
      .single();
    if (error) throw error;
    return { action: "updated", row: data };
  }

  const { data, error } = await supabase
    .from("visitor_registrations")
    .insert(payload)
    .select("id, full_name, email, phone, status")
    .single();
  if (error) throw error;
  return { action: "inserted", row: data };
}

async function main() {
  console.log("Seeding comms test visitors…\n");
  for (const seed of SEED_ROWS) {
    const result = await upsertVisitor(seed);
    console.log(`${result.action}: ${result.row.full_name} <${result.row.email}> ${result.row.phone} [${result.row.status}]`);
    console.log(`  id: ${result.row.id}\n`);
  }
  console.log("Done. Filter Visitors → Confirmed in Admin → Communications to message them.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
