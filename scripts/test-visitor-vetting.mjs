/**
 * One-off verification for migration 0009 + check-in edge cases.
 * Run: node --env-file=.env.local scripts/test-visitor-vetting.mjs
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
const tag = `vetting-test-${Date.now()}`;

async function cleanup(ids) {
  if (ids.length) await supabase.from("visitor_registrations").delete().in("id", ids);
}

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function main() {
  const ids = [];

  // 1. Migration columns exist
  const probe = await supabase.from("visitor_registrations").select("qr_token, qr_issued_at, checked_in_at, checked_in_by, checked_in_by_email").limit(1);
  assert(!probe.error, `migration columns queryable (${probe.error?.message ?? "ok"})`);

  // 2. declined status accepted
  const pendingId = randomUUID();
  const { error: insPending } = await supabase.from("visitor_registrations").insert({
    id: pendingId,
    email: `${tag}-pending@test.local`,
    full_name: "Test Pending",
    status: "registered",
  });
  assert(!insPending, "insert registered visitor");
  ids.push(pendingId);

  const declinedId = randomUUID();
  const { error: insDeclined } = await supabase.from("visitor_registrations").insert({
    id: declinedId,
    email: `${tag}-declined@test.local`,
    full_name: "Test Declined",
    status: "declined",
  });
  assert(!insDeclined, "insert declined visitor (new status)");
  ids.push(declinedId);

  const token = `ALTEVT-TESTCODE9`;
  const approvedId = randomUUID();
  const { error: insApproved } = await supabase.from("visitor_registrations").insert({
    id: approvedId,
    email: `${tag}-approved@test.local`,
    full_name: "Test Approved",
    status: "confirmed",
    qr_token: token,
    qr_issued_at: new Date().toISOString(),
  });
  assert(!insApproved, "insert confirmed visitor with qr_token");
  ids.push(approvedId);

  // Simulate check-in lookup logic
  async function lookup(tokenValue) {
    const { data } = await supabase
      .from("visitor_registrations")
      .select("id, status, checked_in_at, full_name")
      .eq("qr_token", tokenValue)
      .maybeSingle();
    return data;
  }

  const noMatch = await lookup("not-a-real-token-garbage");
  assert(!noMatch, "garbage token → no row");

  const pendingByFakeToken = await lookup(randomUUID());
  assert(!pendingByFakeToken, "unknown token → no row");

  const declinedLookup = await supabase
    .from("visitor_registrations")
    .select("status")
    .eq("id", declinedId)
    .single();
  assert(declinedLookup.data?.status === "declined", "declined visitor status persisted");

  const pendingLookup = await supabase.from("visitor_registrations").select("status").eq("id", pendingId).single();
  assert(pendingLookup.data?.status === "registered", "pending visitor not approved");

  // First check-in
  const now = new Date().toISOString();
  const { data: firstCheckIn, error: checkErr } = await supabase
    .from("visitor_registrations")
    .update({
      checked_in_at: now,
      checked_in_by_email: "test-admin@altfff.com",
    })
    .eq("id", approvedId)
    .eq("status", "confirmed")
    .is("checked_in_at", null)
    .select("checked_in_at")
    .single();
  assert(!checkErr && firstCheckIn?.checked_in_at, "first check-in succeeds");

  // Double check-in blocked (conditional update returns nothing)
  const { data: secondCheckIn } = await supabase
    .from("visitor_registrations")
    .update({ checked_in_at: new Date().toISOString() })
    .eq("id", approvedId)
    .is("checked_in_at", null)
    .select("id");
  assert(!secondCheckIn?.length, "second check-in update blocked when already checked in");

  const { data: after } = await supabase.from("visitor_registrations").select("checked_in_at").eq("id", approvedId).single();
  assert(!!after?.checked_in_at, "checked_in_at still set after duplicate attempt");

  // Approve flow fields
  const approveToken = `ALTEVT-APPROVE99`;
  const { error: approveErr } = await supabase
    .from("visitor_registrations")
    .update({
      status: "confirmed",
      qr_token: approveToken,
      qr_issued_at: new Date().toISOString(),
    })
    .eq("id", pendingId)
    .eq("status", "registered");
  assert(!approveErr, "approve update (registered → confirmed + qr)");

  const approvedRow = await lookup(approveToken);
  assert(approvedRow?.status === "confirmed", "approved visitor findable by qr_token");

  console.log("\nAll automated DB checks passed.");
  console.log("Manual steps still required: Resend QR email, camera scan at /admin/checkin, admin Approve/Decline UI.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await supabase.from("visitor_registrations").delete().like("email", `${tag}%`);
  });
