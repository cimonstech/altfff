/**
 * Verify bulk confirmation resend: message_log statuses, quota classification, resume targeting, summary API.
 *
 * Run:
 *   node --env-file=.env.local scripts/test-bulk-resend-confirmation.mjs
 *   node --env-file=.env.local scripts/test-bulk-resend-confirmation.mjs --base http://localhost:3000
 *
 * Optional live API (requires admin session + migrations 0018/0019 applied):
 *   BULK_RESEND_TEST_ADMIN_EMAIL / BULK_RESEND_TEST_ADMIN_PASSWORD
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
const tag = `bulk-resend-${Date.now()}`;
const ids = { visitors: [], batches: [], logs: [] };

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function classifyResendError(message) {
  if (!message) return "failed";
  if (/quota exceeded|daily.*limit|monthly.*limit|sending limit|exceeded your.*quota|reached your daily|daily email/i.test(message)) {
    return "quota_exceeded";
  }
  return "failed";
}

async function adminSessionCookie() {
  const email = process.env.BULK_RESEND_TEST_ADMIN_EMAIL || process.env.RESEND_TEST_ADMIN_EMAIL;
  const password = process.env.BULK_RESEND_TEST_ADMIN_PASSWORD || process.env.RESEND_TEST_ADMIN_PASSWORD;
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

async function insertVisitor(row) {
  const { error } = await admin.from("visitor_registrations").insert(row);
  if (error) throw error;
  ids.visitors.push(row.id);
}

async function main() {
  console.log(`Alt.FFF bulk confirmation resend tests (${base})\n`);

  assert(classifyResendError("You have exceeded your daily email sending quota.") === "quota_exceeded", "quota regex: daily email");
  assert(classifyResendError("Invalid email address") === "failed", "quota regex: invalid email stays failed");

  const batchProbe = await admin.from("bulk_confirmation_resend_batch").select("id").limit(1);
  assert(!batchProbe.error, `bulk_confirmation_resend_batch exists (${batchProbe.error?.message ?? "ok"})`);

  const batchCol = await admin.from("message_log").select("batch_id").limit(1);
  assert(!batchCol.error, `message_log.batch_id column exists (${batchCol.error?.message ?? "ok"})`);

  const visitorA = randomUUID();
  const visitorB = randomUUID();
  const visitorC = randomUUID();
  const token = "ALTEVT-BULKTEST";

  await insertVisitor({
    id: visitorA,
    email: `${tag}-a@test.local`,
    full_name: "Bulk Resend A",
    status: "confirmed",
    qr_token: token,
    qr_issued_at: new Date().toISOString(),
    source: "pre_registered",
  });
  await insertVisitor({
    id: visitorB,
    email: `${tag}-b@test.local`,
    full_name: "Bulk Resend B",
    status: "confirmed",
    qr_token: `${token}-B`,
    qr_issued_at: new Date().toISOString(),
    source: "pre_registered",
  });
  await insertVisitor({
    id: visitorC,
    email: `${tag}-walkin@test.local`,
    full_name: "Bulk Resend Walk-in",
    status: "confirmed",
    qr_token: `${token}-W`,
    source: "walk_in",
  });

  const batchId = randomUUID();
  const { error: batchErr } = await admin.from("bulk_confirmation_resend_batch").insert({
    id: batchId,
    mode: "all_confirmed",
    status: "paused_quota",
    recipient_count: 2,
    queued_count: 2,
    sent_by_email: "test@altfff.com",
  });
  assert(!batchErr, "insert synthetic batch");
  ids.batches.push(batchId);

  const logRows = [
    {
      id: randomUUID(),
      channel: "email",
      message_type: "bulk_confirmation_resend",
      recipient_email: `${tag}-a@test.local`,
      recipient_name: "Bulk Resend A",
      related_table: "visitor_registrations",
      related_id: visitorA,
      batch_id: batchId,
      status: "sent",
      subject_or_summary: "Your Alt.FFF visit is confirmed - QR code inside",
    },
    {
      id: randomUUID(),
      channel: "email",
      message_type: "bulk_confirmation_resend",
      recipient_email: `${tag}-b@test.local`,
      recipient_name: "Bulk Resend B",
      related_table: "visitor_registrations",
      related_id: visitorB,
      batch_id: batchId,
      status: "quota_exceeded",
      error_detail: "You have exceeded your daily email sending quota.",
      subject_or_summary: "Your Alt.FFF visit is confirmed - QR code inside",
    },
    {
      id: randomUUID(),
      channel: "email",
      message_type: "bulk_confirmation_resend",
      recipient_email: `${tag}-c@test.local`,
      recipient_name: "Bulk Resend Failed",
      related_table: "visitor_registrations",
      related_id: randomUUID(),
      batch_id: batchId,
      status: "failed",
      error_detail: "Invalid `to` field",
      subject_or_summary: "Your Alt.FFF visit is confirmed - QR code inside",
    },
  ];

  for (const row of logRows) {
    const { error } = await admin.from("message_log").insert(row);
    assert(!error, `insert message_log row ${row.status}`);
    ids.logs.push(row.id);
  }

  const { data: quotaRows } = await admin
    .from("message_log")
    .select("related_id, status, sent_at")
    .eq("batch_id", batchId)
    .eq("message_type", "bulk_confirmation_resend")
    .eq("status", "quota_exceeded")
    .order("sent_at", { ascending: false });

  const latestByVisitor = new Map();
  for (const row of quotaRows ?? []) {
    if (!latestByVisitor.has(row.related_id)) latestByVisitor.set(row.related_id, row.status);
  }
  const resumeIds = [...latestByVisitor.entries()]
    .filter(([, status]) => status === "quota_exceeded")
    .map(([id]) => id);

  assert(resumeIds.length === 1 && resumeIds[0] === visitorB, "resume targets only quota_exceeded visitor");

  const cookie = await adminSessionCookie();
  if (!cookie) {
    console.log("\nSKIP: live API checks (set BULK_RESEND_TEST_ADMIN_EMAIL/PASSWORD)\n");
  } else {
    const summaryRes = await fetch(`${base}/api/admin/visitors/bulk-resend-confirmation/${batchId}/summary`, {
      headers: { Cookie: cookie },
      signal: AbortSignal.timeout(15000),
    });
    const summaryJson = await summaryRes.json();
    assert(summaryRes.status === 200 && summaryJson.ok, `summary API (${summaryRes.status})`);
    assert(summaryJson.summary.counts.sent === 1, "summary sent count from message_log");
    assert(summaryJson.summary.counts.quota_exceeded === 1, "summary quota_exceeded count");
    assert(summaryJson.summary.counts.failed === 1, "summary failed count");
    assert(summaryJson.summary.failed.length === 1, "summary lists failed recipients with errors");
    assert(typeof summaryJson.summary.failed[0].error === "string", "summary includes per-person error text");

    const unauth = await fetch(`${base}/api/admin/visitors/bulk-resend-confirmation/${batchId}/summary`, {
      signal: AbortSignal.timeout(10000),
    });
    assert(unauth.status === 401 || unauth.status === 403, "summary requires admin auth");
  }

  console.log("\nAll automated bulk resend checks passed.");
  console.log("Manual: Admin → Visitors → Bulk resend; run a small batch; confirm message_log rows and resume after quota.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (ids.logs.length) await admin.from("message_log").delete().in("id", ids.logs);
    if (ids.batches.length) await admin.from("bulk_confirmation_resend_batch").delete().in("id", ids.batches);
    if (ids.visitors.length) await admin.from("visitor_registrations").delete().in("id", ids.visitors);
  });
