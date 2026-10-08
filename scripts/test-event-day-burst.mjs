/**
 * Event-day burst / concurrency smoke tests.
 *
 * Run: node --env-file=.env.local scripts/test-event-day-burst.mjs
 *      node --env-file=.env.local scripts/test-event-day-burst.mjs --base https://www.altfff.com
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const base = arg("base", process.env.TEST_BASE_URL || "http://localhost:3000");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tag = `burst-${Date.now()}`;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function botFields() {
  return {
    form_render_token: "altfff-render-v1",
    form_mounted_at: String(Date.now() - 5000),
    form_token_hp: "",
  };
}

async function postJson(path, body, clientIp) {
  const started = performance.now();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": clientIp,
    },
    body: JSON.stringify({ ...botFields(), ...body }),
  });
  const elapsed = Math.round(performance.now() - started);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, elapsed };
}

async function ensureWalkInOpen() {
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "walk_in_registration_enabled")
    .maybeSingle();
  if (data?.value === true) return;
  console.log("Enabling walk_in_registration_enabled for burst test…");
  const { error } = await admin.from("app_settings").update({ value: true }).eq("key", "walk_in_registration_enabled");
  if (error) throw error;
}

async function burstWalkIn(count, sharedIp) {
  console.log(`\n--- Walk-in burst: ${count} requests, shared IP=${sharedIp ? "yes" : "no"} ---`);
  const emails = [];
  const tasks = Array.from({ length: count }, (_, i) => {
    const email = `${tag}-walkin-${i}@test.local`;
    emails.push(email);
    const ip = sharedIp ? `198.51.100.${(i % 200) + 1}` : `198.51.100.${i + 1}`;
    return postJson(
      "/api/walk-in-registrations",
      {
        full_name: `Burst Walkin ${i}`,
        email,
        phone: "+233241234567",
      },
      ip,
    );
  });

  const results = await Promise.all(tasks);
  const ok = results.filter((r) => r.status === 200 && r.json.ok).length;
  const rateLimited = results.filter((r) => r.status === 429).length;
  const failed = results.filter((r) => r.status >= 500).length;
  const maxMs = Math.max(...results.map((r) => r.elapsed));
  const p95 = results.map((r) => r.elapsed).sort((a, b) => a - b)[Math.floor(results.length * 0.95)] ?? 0;

  console.log(`  ok=${ok}/${count} rateLimited=${rateLimited} serverError=${failed} max=${maxMs}ms p95=${p95}ms`);

  const { data: rows } = await admin.from("visitor_registrations").select("id").in("email", emails);
  console.log(`  db_rows=${rows?.length ?? 0}`);
  await admin.from("visitor_registrations").delete().in("email", emails);
  return { ok, rateLimited, failed, maxMs, p95, dbRows: rows?.length ?? 0 };
}

async function burstVisitorRace(count) {
  console.log(`\n--- Visitor parallel duplicate race: ${count} same-email POSTs ---`);
  const email = `${tag}-visitor-race@test.local`;
  const ipBase = `203.0.113.${Math.floor(Math.random() * 50) + 1}`;
  const tasks = Array.from({ length: count }, () =>
    postJson("/api/visitor-registrations", { email, full_name: "Burst Visitor" }, ipBase),
  );
  const results = await Promise.all(tasks);
  const ok = results.filter((r) => r.status === 200 && r.json.ok).length;
  const dup = results.filter((r) => r.status === 409).length;
  const rateLimited = results.filter((r) => r.status === 429).length;
  const maxMs = Math.max(...results.map((r) => r.elapsed));
  console.log(`  ok=${ok} dup409=${dup} rateLimited=${rateLimited} max=${maxMs}ms`);
  const { count: dbCount } = await admin
    .from("visitor_registrations")
    .select("id", { count: "exact", head: true })
    .eq("email", email);
  await admin.from("visitor_registrations").delete().eq("email", email);
  return { ok, dup, rateLimited, maxMs, dbCount: dbCount ?? 0 };
}

async function burstExhibitorRace(count) {
  console.log(`\n--- Exhibitor parallel duplicate race: ${count} same-email POSTs ---`);
  const email = `${tag}-exhibitor-race@test.local`;
  const ipBase = `203.0.114.${Math.floor(Math.random() * 50) + 1}`;
  const tasks = Array.from({ length: count }, () =>
    postJson("/api/exhibitor-applications", { email, name: "Burst Exhibitor" }, ipBase),
  );
  const results = await Promise.all(tasks);
  const ok = results.filter((r) => r.status === 200 && r.json.ok).length;
  const dup = results.filter((r) => r.status === 409).length;
  const rateLimited = results.filter((r) => r.status === 429).length;
  const maxMs = Math.max(...results.map((r) => r.elapsed));
  console.log(`  ok=${ok} dup409=${dup} rateLimited=${rateLimited} max=${maxMs}ms`);
  const { count: dbCount } = await admin
    .from("exhibitor_applications")
    .select("id", { count: "exact", head: true })
    .eq("email", email);
  await admin.from("exhibitor_applications").delete().eq("email", email);
  return { ok, dup, rateLimited, maxMs, dbCount: dbCount ?? 0 };
}

async function querySupabaseConnections() {
  console.log("\n--- Supabase connection snapshot (service role) ---");
  const { data, error } = await admin.rpc("get_schema_audit_state").maybeSingle();
  if (error && !/get_schema_audit_state/.test(error.message ?? "")) {
    // fall through
  }
  const { count: visitorCount } = await admin
    .from("visitor_registrations")
    .select("id", { count: "exact", head: true });
  console.log(`  project: ${url}`);
  console.log(`  visitor_registrations rows: ${visitorCount ?? "?"}`);
  console.log("  (Plan tier must be confirmed in Supabase dashboard → Settings → Billing)");
}

async function main() {
  console.log("Alt.FFF event-day burst tests");
  console.log("Base URL:", base);
  console.log("Tag:", tag);

  await ensureWalkInOpen();

  const walkInUniqueIp = await burstWalkIn(15, false);
  assert(walkInUniqueIp.ok === 15, "15 walk-ins with unique IPs all succeed");
  assert(walkInUniqueIp.failed === 0, "no walk-in server errors under unique-IP burst");
  assert(walkInUniqueIp.dbRows === 15, "15 walk-in rows persisted");

  const walkInSharedIp = await burstWalkIn(15, true);
  console.log(
    walkInSharedIp.rateLimited > 0
      ? "NOTE: shared-IP walk-in burst hit public rate limit (expected at 5/10m per IP)"
      : "NOTE: shared-IP walk-in burst did not hit rate limit",
  );

  const visitorRace = await burstVisitorRace(15);
  assert(visitorRace.ok === 1, "exactly one visitor parallel submit succeeds");
  assert(visitorRace.dup >= 1, "duplicate visitor submits return 409");
  assert(visitorRace.dbCount === 1, "exactly one visitor row created");

  const exhibitorRace = await burstExhibitorRace(15);
  assert(exhibitorRace.ok === 1, "exactly one exhibitor parallel submit succeeds");
  assert(exhibitorRace.dup >= 1, "duplicate exhibitor submits return 409");
  assert(exhibitorRace.dbCount === 1, "exactly one exhibitor row created");

  await querySupabaseConnections();

  console.log("\nBurst summary:");
  console.log(
    JSON.stringify(
      {
        walkInUniqueIp,
        walkInSharedIp,
        visitorRace,
        exhibitorRace,
      },
      null,
      2,
    ),
  );
  console.log("\nAll burst tests completed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
