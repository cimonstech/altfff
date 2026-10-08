/**
 * Verify check-in name/email lookup eligibility and single-use update.
 * Run: node --env-file=.env.local scripts/test-checkin-manual-lookup.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const tag = `checkin-lookup-${Date.now()}`;

function escapeCheckInSearch(raw) {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/[,()]/g, " ");
}

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function searchConfirmed(q) {
  const term = escapeCheckInSearch(q);
  const { data, error } = await supabase
    .from("visitor_registrations")
    .select("id, full_name, email, status, source, checked_in_at")
    .eq("status", "confirmed")
    .eq("source", "pre_registered")
    .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  if (error) throw error;
  return (data ?? []).filter((row) => row.email?.includes(tag) || row.full_name?.includes("Lookup"));
}

async function main() {
  const confirmedId = randomUUID();
  const pendingId = randomUUID();
  const declinedId = randomUUID();
  const walkInId = randomUUID();
  const ids = [confirmedId, pendingId, declinedId, walkInId];

  const { count: beforeCount, error: beforeErr } = await supabase
    .from("visitor_registrations")
    .select("id", { count: "exact", head: true });
  if (beforeErr) throw beforeErr;

  const { error: insErr } = await supabase.from("visitor_registrations").insert([
    {
      id: confirmedId,
      full_name: "Lookup Confirmed Ada",
      email: `${tag}-confirmed@test.local`,
      phone: "+233551111111",
      status: "confirmed",
      source: "pre_registered",
      qr_token: `ALTEVT-LOOKUP${tag.slice(-4)}`.slice(0, 16),
    },
    {
      id: pendingId,
      full_name: "Lookup Pending Bea",
      email: `${tag}-pending@test.local`,
      status: "registered",
      source: "pre_registered",
    },
    {
      id: declinedId,
      full_name: "Lookup Declined Cee",
      email: `${tag}-declined@test.local`,
      status: "declined",
      source: "pre_registered",
    },
    {
      id: walkInId,
      full_name: "Lookup Walkin Dee",
      email: `${tag}-walkin@test.local`,
      status: "confirmed",
      source: "walk_in",
    },
  ]);
  assert(!insErr, `insert fixtures (${insErr?.message ?? "ok"})`);

  const byName = await searchConfirmed("Lookup Confirmed Ada");
  assert(byName.some((r) => r.id === confirmedId), "confirmed pre-registered visitor appears in name search");
  assert(!byName.some((r) => r.id === pendingId), "pending registered visitor is not in search");
  assert(!byName.some((r) => r.id === declinedId), "declined visitor is not in search");

  const byEmail = await searchConfirmed(`${tag}-confirmed@test.local`);
  assert(byEmail.some((r) => r.id === confirmedId), "confirmed visitor appears in email search");

  const pendingSearch = await searchConfirmed("Lookup Pending Bea");
  assert(pendingSearch.length === 0, "searching a pending name returns no confirmed matches");

  const declinedSearch = await searchConfirmed("Lookup Declined Cee");
  assert(declinedSearch.length === 0, "searching a declined name returns no confirmed matches");

  const walkInSearch = await searchConfirmed("Lookup Walkin Dee");
  assert(walkInSearch.length === 0, "walk-in confirmed visitor is not in lost-QR search");

  const now = new Date().toISOString();
  const { data: first, error: firstErr } = await supabase
    .from("visitor_registrations")
    .update({ checked_in_at: now, checked_in_by_email: "door-staff@altfff.com" })
    .eq("id", confirmedId)
    .eq("status", "confirmed")
    .is("checked_in_at", null)
    .select("id, checked_in_at, qr_token")
    .maybeSingle();
  assert(!firstErr && first?.checked_in_at, "first check-in of existing row succeeds");

  const { data: tokenAfter } = await supabase
    .from("visitor_registrations")
    .select("qr_token")
    .eq("id", confirmedId)
    .single();
  assert(tokenAfter?.qr_token === first.qr_token, "check-in does not rotate qr_token");

  const { data: second } = await supabase
    .from("visitor_registrations")
    .update({ checked_in_at: new Date().toISOString() })
    .eq("id", confirmedId)
    .eq("status", "confirmed")
    .is("checked_in_at", null)
    .select("id");
  assert(!second || second.length === 0, "second check-in is blocked (already checked in)");

  const { count: afterCount, error: afterErr } = await supabase
    .from("visitor_registrations")
    .select("id", { count: "exact", head: true });
  if (afterErr) throw afterErr;
  assert((afterCount ?? 0) === (beforeCount ?? 0) + 4, "no extra visitor_registrations rows were created by check-in");

  await supabase.from("visitor_registrations").delete().in("id", ids);
  console.log("\nAll check-in lookup eligibility checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
