/**
 * Security + gate verification for per-form toggles (migrations 0013 + 0015).
 *
 * Proves server-side enforcement with raw HTTP requests (no browser UI).
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-public-forms-security.mjs
 *   node --env-file=.env.local scripts/test-public-forms-security.mjs --base http://localhost:3000
 *
 * Optional env for admin bypass tests:
 *   FORM_TOGGLE_TEST_ADMIN_EMAIL / FORM_TOGGLE_TEST_ADMIN_PASSWORD
 *     — any real admin account that is NOT cimonstechnologies@gmail.com
 *   FORM_TOGGLE_AUTHORIZED_ADMIN_EMAIL / FORM_TOGGLE_AUTHORIZED_ADMIN_PASSWORD
 *     — cimonstechnologies@gmail.com (positive toggle test)
 */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "crypto";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const base = arg("base", process.env.TEST_BASE_URL || "http://localhost:3000");
const CLOSED_MESSAGE = "Applications are currently closed. Please check back soon.";
const TOGGLE_PATH = "/api/admin/settings/public-forms";
const AUTHORIZED_EMAIL = "cimonstechnologies@gmail.com";

const SETTING_KEYS = {
  sponsor: "sponsor_form_enabled",
  exhibitor: "exhibitor_form_enabled",
  visit: "visit_form_enabled",
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const service = createClient(url, serviceKey, { auth: { persistSession: false } });

async function ensureMigration() {
  const { data, error } = await service
    .from("app_settings")
    .select("key")
    .eq("key", SETTING_KEYS.sponsor)
    .maybeSingle();
  if (error || !data) {
    console.error("Migration 0015 not applied — run supabase/migrations/0015_public_forms_toggles.sql first.");
    process.exit(1);
  }
}

async function setFormStates(states) {
  for (const [form, enabled] of Object.entries(states)) {
    const { error } = await service
      .from("app_settings")
      .update({ value: enabled })
      .eq("key", SETTING_KEYS[form]);
    if (error) {
      console.error(`Failed to set ${SETTING_KEYS[form]}:`, error.message);
      process.exit(1);
    }
  }
}

async function setAllEnabled(enabled) {
  await setFormStates({ sponsor: enabled, exhibitor: enabled, visit: enabled });
}

function botFields() {
  return {
    form_render_token: "altfff-render-v1",
    form_mounted_at: String(Date.now()),
  };
}

async function postJson(path, payload, headers = {}) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `forms-security-${randomUUID()}`,
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}

async function patchToggle(body, cookieHeader) {
  return fetch(`${base}${TOGGLE_PATH}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function getToggle(cookieHeader) {
  return fetch(`${base}${TOGGLE_PATH}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  });
}

async function signInAdmin(email, password) {
  const cookieJar = new Map();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return [...cookieJar.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) cookieJar.set(name, value);
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Admin sign-in failed for ${email}: ${error.message}`);

  const cookieHeader = [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  return cookieHeader;
}

async function postExhibitor(extra = {}) {
  return postJson("/api/exhibitor-applications", {
    ...botFields(),
    email: `exhibitor-sec-${randomUUID().slice(0, 8)}@example.com`,
    name: "Security Test Exhibitor",
    ...extra,
  });
}

async function postSponsor(extra = {}) {
  return postJson("/api/sponsor-inquiries", {
    ...botFields(),
    email: `sponsor-sec-${randomUUID().slice(0, 8)}@example.com`,
    fullName: "Security Test Sponsor",
    phone: "+233241234567",
    hearAbout: "google_web",
    linkedin: "@sec-test",
    company: "Sec Co",
    jobTitle: "Director",
    businessNature: "Testing",
    ...extra,
  });
}

async function postVisitor(extra = {}) {
  return postJson("/api/visitor-registrations", {
    ...botFields(),
    email: `visitor-sec-${randomUUID().slice(0, 8)}@example.com`,
    full_name: "Security Test Visitor",
    phone: "+233241234567",
    social_media_website: "https://example.com",
    country: "Ghana",
    interest: "materials",
    business_type: "b2b",
    heard_about_us: "google_web",
    ...extra,
  });
}

async function postContact() {
  return postJson("/api/contact", {
    ...botFields(),
    firstName: "Sec",
    lastName: "Contact",
    email: `contact-sec-${randomUUID().slice(0, 8)}@example.com`,
    message: "Security gate contact smoke test.",
  });
}

async function expectClosed403(label, res) {
  const json = await res.json().catch(() => ({}));
  if (res.status !== 403 || json.ok !== false || json.error !== CLOSED_MESSAGE) {
    throw new Error(`${label}: expected 403 closed, got ${res.status} ${JSON.stringify(json)}`);
  }
}

async function expectAccepted(label, res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(`${label}: expected success, got ${res.status} ${JSON.stringify(json)}`);
  }
}

async function expectStatus(label, res, status) {
  const json = await res.json().catch(() => ({}));
  if (res.status !== status) {
    throw new Error(`${label}: expected HTTP ${status}, got ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function testAnonymousToggleRejected() {
  console.log("A) Unauthenticated toggle PATCH/GET rejected");
  for (const form of ["sponsor", "exhibitor", "visit"]) {
    const patch = await patchToggle({ form, enabled: false });
    await expectStatus(`PATCH ${form} (no session)`, patch, 401);
  }
  const get = await getToggle();
  await expectStatus("GET (no session)", get, 401);
  console.log("   PASS");
}

async function testOtherAdminToggleRejected() {
  const email = process.env.FORM_TOGGLE_TEST_ADMIN_EMAIL;
  const password = process.env.FORM_TOGGLE_TEST_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("B) Other-admin toggle rejection — SKIPPED (set FORM_TOGGLE_TEST_ADMIN_EMAIL/PASSWORD)");
    return;
  }
  if (email === AUTHORIZED_EMAIL) {
    throw new Error("FORM_TOGGLE_TEST_ADMIN_EMAIL must not be cimonstechnologies@gmail.com");
  }

  console.log("B) Non-authorized admin toggle PATCH/GET rejected (raw HTTP with session cookie)");
  const cookies = await signInAdmin(email, password);

  const get = await getToggle(cookies);
  await expectStatus("GET (other admin)", get, 403);

  for (const form of ["sponsor", "exhibitor", "visit"]) {
    const patch = await patchToggle({ form, enabled: false }, cookies);
    await expectStatus(`PATCH ${form} (other admin)`, patch, 403);
  }
  console.log("   PASS");
}

async function testAuthorizedAdminToggleWorks() {
  const email = process.env.FORM_TOGGLE_AUTHORIZED_ADMIN_EMAIL || AUTHORIZED_EMAIL;
  const password = process.env.FORM_TOGGLE_AUTHORIZED_ADMIN_PASSWORD;
  if (!password) {
    console.log("C) Authorized admin toggle — SKIPPED (set FORM_TOGGLE_AUTHORIZED_ADMIN_PASSWORD)");
    return;
  }

  console.log("C) Authorized admin can PATCH toggle (raw HTTP with session cookie)");
  const cookies = await signInAdmin(email, password);
  const get = await getToggle(cookies);
  const getJson = await expectStatus("GET (authorized admin)", get, 200);
  if (!getJson.ok || !getJson.forms) throw new Error("Authorized GET missing forms payload");

  const patch = await patchToggle({ form: "exhibitor", enabled: true }, cookies);
  const patchJson = await expectStatus("PATCH exhibitor (authorized admin)", patch, 200);
  if (!patchJson.ok || patchJson.form !== "exhibitor") {
    throw new Error(`Authorized PATCH failed: ${JSON.stringify(patchJson)}`);
  }
  console.log("   PASS");
}

async function testClosedFormRejectsBeforeAnythingElse() {
  console.log("D) Closed form rejects anonymous POST before bot/rate logic (empty body)");
  await setFormStates({ sponsor: true, exhibitor: false, visit: true });

  const res = await postJson("/api/exhibitor-applications", {}, {});
  await expectClosed403("exhibitor empty POST while closed", res);

  // No bot token, no fields — if we got here with 403 closed message, gate ran first.
  console.log("   PASS");
}

async function testIndependentPublicGates() {
  console.log("E) Independent public POST gates + contact always open");

  for (const formToClose of ["exhibitor", "sponsor", "visit"]) {
    await setFormStates({ sponsor: true, exhibitor: true, visit: true, [formToClose]: false });

    const routes = [
      ["exhibitor", postExhibitor],
      ["sponsor", postSponsor],
      ["visit", postVisitor],
    ];

    for (const [form, fn] of routes) {
      const res = await fn();
      if (form === formToClose) await expectClosed403(`${form} closed`, res);
      else await expectAccepted(`${form} open`, res);
    }

    await expectAccepted("contact", await postContact());
  }

  console.log("   PASS");
}

async function main() {
  await ensureMigration();
  await setAllEnabled(true);

  await testAnonymousToggleRejected();
  await testOtherAdminToggleRejected();
  await testAuthorizedAdminToggleWorks();
  await testClosedFormRejectsBeforeAnythingElse();
  await testIndependentPublicGates();

  await setAllEnabled(true);

  console.log("\nAll automated security/gate checks passed.");
  console.log("Manual UI checks still recommended:");
  console.log("- Toggle row hidden on Overview for non-authorized admins");
  console.log("- Activity Log entries name the specific form toggled");
  console.log("- Exhibitor CTA shows closed notice modal when exhibitor is off");
}

main().catch((err) => {
  console.error("FAIL:", err.message || err);
  process.exit(1);
});
