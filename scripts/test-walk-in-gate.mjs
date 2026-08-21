/**
 * Verify walk-in registration gate (requires migrations 0012 + 0013 applied).
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-walk-in-gate.mjs
 *   node --env-file=.env.local scripts/test-walk-in-gate.mjs --base http://localhost:3000
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const base = arg("base", "http://localhost:3000");
const SETTING_KEY = "walk_in_registration_enabled";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function ensureSettingsTable() {
  const { error } = await supabase.from("app_settings").select("key").limit(1);
  if (error) {
    console.error("Migration 0013 not applied — run supabase/migrations/0013_app_settings.sql first.");
    process.exit(1);
  }
}

async function setEnabled(value) {
  const { error } = await supabase.from("app_settings").update({ value }).eq("key", SETTING_KEY);
  if (error) {
    console.error("Failed to set app setting:", error.message);
    process.exit(1);
  }
}

async function postWalkIn() {
  return fetch(`${base}/api/walk-in-registrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `walkin-gate-${randomUUID()}`,
    },
    body: JSON.stringify({
      full_name: "Gate Test",
      email: `gate-${randomUUID().slice(0, 8)}@example.com`,
      phone: "+233241234567",
      form_render_token: "altfff-render-v1",
      form_mounted_at: String(Date.now()),
    }),
  });
}

async function fetchWalkInPage() {
  return fetch(`${base}/walk-in`, { headers: { Accept: "text/html" } });
}

async function main() {
  await ensureSettingsTable();

  console.log("1) Gate OFF — API should reject");
  await setEnabled(false);
  const offApi = await postWalkIn();
  const offJson = await offApi.json().catch(() => ({}));
  console.log("   API:", offApi.status, offJson);
  if (offApi.status !== 403 || offJson.ok !== false) {
    console.error("FAIL: expected 403 when gate is closed");
    process.exit(1);
  }
  console.log("   PASS");

  console.log("2) Gate OFF — page should show closed message, not the form");
  const offPage = await fetchWalkInPage();
  const offHtml = await offPage.text();
  if (!offHtml.includes("Walk-in registration opens at the event")) {
    console.error("FAIL: closed message missing from /walk-in HTML");
    process.exit(1);
  }
  if (offHtml.includes("Register &amp; enter") || offHtml.includes("Register & enter")) {
    console.error("FAIL: submit button still present when gate is closed");
    process.exit(1);
  }
  console.log("   PASS");

  console.log("3) Gate ON — API should accept");
  await setEnabled(true);
  const onApi = await postWalkIn();
  const onJson = await onApi.json().catch(() => ({}));
  console.log("   API:", onApi.status, onJson);
  if (!onApi.ok || !onJson.ok) {
    console.error("FAIL: expected success when gate is open");
    process.exit(1);
  }
  console.log("   PASS");

  console.log("4) Gate ON — page should render the form");
  const onPage = await fetchWalkInPage();
  const onHtml = await onPage.text();
  if (!onHtml.includes("Register &amp; enter") && !onHtml.includes("Register & enter")) {
    console.error("FAIL: submit button missing when gate is open");
    process.exit(1);
  }
  console.log("   PASS");

  console.log("\nAll gate checks passed. Toggle via admin UI and confirm Activity Log separately.");
  await setEnabled(false);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
