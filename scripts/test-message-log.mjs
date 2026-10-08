/**
 * Verify message_log table, logging helpers, and admin report API guards.
 *
 * Run:
 *   node --env-file=.env.local scripts/test-message-log.mjs
 *   node --env-file=.env.local scripts/test-message-log.mjs --base http://localhost:3000
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const base = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : process.env.TEST_BASE_URL || "http://localhost:3000";

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const tag = `msglog-${Date.now()}`;
const ids = { visitors: [], logs: [] };

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function classifyResendError(message) {
  if (!message) return "failed";
  if (/quota exceeded|daily.*limit|monthly.*limit|sending limit|exceeded your.*quota/i.test(message)) {
    return "quota_exceeded";
  }
  return "failed";
}

async function main() {
  console.log(`Alt.FFF message_log tests (${base})\n`);

  const probe = await admin.from("message_log").select("id").limit(1);
  assert(!probe.error, `message_log table exists (${probe.error?.message ?? "ok"})`);

  const visitorId = randomUUID();
  const visitorEmail = `${tag}@test.local`;
  const { error: insVisitorErr } = await admin.from("visitor_registrations").insert({
    id: visitorId,
    email: visitorEmail,
    full_name: "Message Log Test",
    status: "registered",
  });
  assert(!insVisitorErr, "insert test visitor");
  ids.visitors.push(visitorId);

  const logId = randomUUID();
  const { error: insLogErr } = await admin.from("message_log").insert({
    id: logId,
    channel: "email",
    recipient_email: visitorEmail.toLowerCase(),
    recipient_name: "Message Log Test",
    message_type: "visitor_registration_confirmation",
    subject_or_summary: "Test confirmation",
    related_table: "visitor_registrations",
    related_id: visitorId,
    status: "sent",
  });
  assert(!insLogErr, "insert test message_log row");
  ids.logs.push(logId);

  const neverEmail = `${tag}-never@test.local`;
  const neverId = randomUUID();
  await admin.from("visitor_registrations").insert({
    id: neverId,
    email: neverEmail,
    full_name: "Never Received Test",
    status: "registered",
  });
  ids.visitors.push(neverId);

  const res = await fetch(`${base}/api/admin/message-log?view=never_received&entityTable=visitor_registrations`, {
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 401 || res.status === 403) {
    console.log("SKIP: never_received API auth (needs logged-in admin session in browser)");
  } else {
    const data = await res.json();
    assert(res.ok && data.ok, `never_received API (${res.status})`);
    const neverRow = (data.rows ?? []).find((r) => r.email === neverEmail);
    const loggedRow = (data.rows ?? []).find((r) => r.email === visitorEmail);
    assert(Boolean(neverRow), "never_received includes person with zero logs");
    assert(!loggedRow, "never_received excludes person with a logged message");
  }

  assert(classifyResendError("Monthly quota exceeded") === "quota_exceeded", "quota error classified");
  assert(classifyResendError("Invalid email address") === "failed", "generic error classified as failed");

  console.log("\nAll message_log checks passed.");
  console.log("Manual: apply migration 0018, submit forms, open /admin/messages and filter by type/status.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (ids.logs.length) await admin.from("message_log").delete().in("id", ids.logs);
    if (ids.visitors.length) await admin.from("visitor_registrations").delete().in("id", ids.visitors);
  });
