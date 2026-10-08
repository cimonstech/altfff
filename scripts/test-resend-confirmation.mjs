/**
 * Verify resend confirmation API: same qr_token, activity log, status guards.
 *
 * Run:
 *   node --env-file=.env.local scripts/test-resend-confirmation.mjs
 *   node --env-file=.env.local scripts/test-resend-confirmation.mjs --base http://localhost:3000
 *
 * Optional admin session for live API call:
 *   RESEND_TEST_ADMIN_EMAIL / RESEND_TEST_ADMIN_PASSWORD
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const base = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : process.env.TEST_BASE_URL || "http://localhost:3000";

if (!url || !serviceKey || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const tag = `resend-test-${Date.now()}`;
const ids = [];

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function insertVisitor(row) {
  const { error } = await admin.from("visitor_registrations").insert(row);
  if (error) throw error;
  ids.push(row.id);
}

async function adminSessionCookie() {
  const email = process.env.RESEND_TEST_ADMIN_EMAIL;
  const password = process.env.RESEND_TEST_ADMIN_PASSWORD;
  if (!email || !password) return null;

  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Admin sign-in failed: ${error?.message ?? "no session"}`);

  const projectRef = new URL(url).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const payload = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  });
  return `${cookieName}=${encodeURIComponent(payload)}`;
}

async function postResend(visitorId, cookie) {
  const res = await fetch(`${base}/api/admin/visitors/${visitorId}/resend-confirmation`, {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : {},
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log(`Alt.FFF resend confirmation tests (${base})\n`);

  const confirmedId = randomUUID();
  const token = "ALTEVT-RESENDTEST";
  await insertVisitor({
    id: confirmedId,
    email: `${tag}-confirmed@test.local`,
    full_name: "Resend Test Confirmed",
    status: "confirmed",
    qr_token: token,
    qr_issued_at: new Date().toISOString(),
    source: "pre_registered",
  });

  const pendingId = randomUUID();
  await insertVisitor({
    id: pendingId,
    email: `${tag}-pending@test.local`,
    full_name: "Resend Test Pending",
    status: "registered",
    source: "pre_registered",
  });

  const declinedId = randomUUID();
  await insertVisitor({
    id: declinedId,
    email: `${tag}-declined@test.local`,
    full_name: "Resend Test Declined",
    status: "declined",
    source: "pre_registered",
  });

  const cookie = await adminSessionCookie();
  if (!cookie) {
    console.log("SKIP: live API checks (set RESEND_TEST_ADMIN_EMAIL/PASSWORD for full route test)\n");
  } else {
    const pendingRes = await postResend(pendingId, cookie);
    assert(pendingRes.status === 409, `registered visitor blocked (${pendingRes.status})`);

    const declinedRes = await postResend(declinedId, cookie);
    assert(declinedRes.status === 409, `declined visitor blocked (${declinedRes.status})`);

    const before = await admin.from("visitor_registrations").select("qr_token, status").eq("id", confirmedId).single();
    assert(before.data?.qr_token === token, "qr_token before resend");

    const resendRes = await postResend(confirmedId, cookie);
    assert(resendRes.status === 200 && resendRes.json.ok, `confirmed resend succeeds (${resendRes.status})`);
    assert(resendRes.json.emailSent === true, "resend reports emailSent=true");

    const after = await admin.from("visitor_registrations").select("qr_token, status").eq("id", confirmedId).single();
    assert(after.data?.qr_token === token, "qr_token unchanged after resend");
    assert(after.data?.status === "confirmed", "status unchanged after resend");

    const { data: logs } = await admin
      .from("activity_logs")
      .select("action, actor_email, target_id, details")
      .eq("target_id", confirmedId)
      .eq("action", "visitor_confirmation_resent")
      .order("created_at", { ascending: false })
      .limit(1);

    assert(logs?.length === 1, "activity log entry recorded");
    assert(logs[0].details?.email_sent === true, "activity log records email_sent=true");
    assert(typeof logs[0].actor_email === "string" && logs[0].actor_email.length > 0, "activity log attributes acting admin");
  }

  console.log("\nAll automated resend confirmation checks passed.");
  console.log("Manual: confirmed visitor shows Resend button; registered/declined do not; scan resent QR at /admin/checkin.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (ids.length) {
      await admin.from("activity_logs").delete().in("target_id", ids);
      await admin.from("visitor_registrations").delete().in("id", ids);
    }
  });
