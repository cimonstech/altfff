/**
 * End-to-end walk-in registration smoke test (requires migrations 0012 + 0013 applied).
 *
 * Temporarily enables walk-in registration via service role if it is closed.
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-walk-in.mjs
 *   node --env-file=.env.local scripts/test-walk-in.mjs --base http://localhost:3000 --email you@example.com --phone +233XXXXXXXXX --newsletter
 *   node --env-file=.env.local scripts/test-walk-in.mjs --no-newsletter
 *
 * Checks DB row (source=walk_in, status=confirmed, no qr_token) via service role.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const base = arg("base", "http://localhost:3000");
const newsletter = !args.includes("--no-newsletter");
const email = arg("email", `walkin-test-${randomUUID().slice(0, 8)}@example.com`);
const phone = arg("phone", "+233241234567");
const fullName = arg("name", "Walk-in Test User");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function ensureMigration() {
  const { error } = await supabase.from("visitor_registrations").select("source").limit(1);
  if (error?.message?.includes("source")) {
    console.error("Migration 0012 not applied — run supabase/migrations/0012_visitor_source.sql first.");
    process.exit(1);
  }
  if (error) {
    console.error("Schema check failed:", error.message);
    process.exit(1);
  }

  const { error: settingsError } = await supabase.from("app_settings").select("key").limit(1);
  if (settingsError) {
    console.error("Migration 0013 not applied — run supabase/migrations/0013_app_settings.sql first.");
    process.exit(1);
  }
}

async function ensureWalkInOpen() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "walk_in_registration_enabled")
    .maybeSingle();
  if (error) {
    console.error("Failed to read walk-in gate:", error.message);
    process.exit(1);
  }
  if (data?.value === true) return;
  console.log("Enabling walk_in_registration_enabled for this test run…");
  const { error: updateError } = await supabase
    .from("app_settings")
    .update({ value: true })
    .eq("key", "walk_in_registration_enabled");
  if (updateError) {
    console.error("Failed to enable walk-in registration:", updateError.message);
    process.exit(1);
  }
}

async function main() {
  await ensureMigration();
  await ensureWalkInOpen();

  const body = {
    full_name: fullName,
    email,
    phone,
    company_name: "Walk-in test co",
    ...(newsletter ? { newsletter: "on" } : {}),
    form_render_token: "altfff-render-v1",
    form_mounted_at: String(Date.now()),
  };

  console.log("POST", `${base}/api/walk-in-registrations`);
  console.log("email:", email, "| newsletter:", newsletter);

  const res = await fetch(`${base}/api/walk-in-registrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `walkin-test-${randomUUID()}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  console.log("HTTP", res.status, json);

  if (!res.ok || !json.ok) {
    process.exit(1);
  }

  const { data: row, error } = await supabase
    .from("visitor_registrations")
    .select("id, email, full_name, source, status, qr_token, newsletter_opt_in")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error || !row) {
    console.error("DB lookup failed:", error?.message ?? "row not found");
    process.exit(1);
  }

  console.log("\nDB row:", row);

  const checks = [
    ["source === walk_in", row.source === "walk_in"],
    ["status === confirmed", row.status === "confirmed"],
    ["qr_token is null", row.qr_token == null],
    ["newsletter_opt_in matches", row.newsletter_opt_in === newsletter],
  ];

  let failed = false;
  for (const [label, ok] of checks) {
    console.log(ok ? "PASS" : "FAIL", label);
    if (!ok) failed = true;
  }

  if (failed) process.exit(1);
  console.log("\nAll DB checks passed. Confirm email/SMS/Mailchimp manually for real addresses.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
