/**
 * Verify independent per-form gates (requires migrations 0013 + 0015 applied).
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-public-forms-gate.mjs
 *   node --env-file=.env.local scripts/test-public-forms-gate.mjs --base http://localhost:3000
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const base = arg("base", "http://localhost:3000");
const CLOSED_MESSAGE = "Applications are currently closed. Please check back soon.";

const SETTING_KEYS = {
  sponsor: "sponsor_form_enabled",
  exhibitor: "exhibitor_form_enabled",
  visit: "visit_form_enabled",
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function ensureSettingsTable() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key")
    .eq("key", SETTING_KEYS.sponsor)
    .maybeSingle();
  if (error) {
    console.error("Failed to read app_settings:", error.message);
    process.exit(1);
  }
  if (!data) {
    console.error(
      "Migration 0015 not applied — run supabase/migrations/0015_public_forms_toggles.sql first.",
    );
    process.exit(1);
  }
}

async function setFormStates(states) {
  for (const [form, enabled] of Object.entries(states)) {
    const key = SETTING_KEYS[form];
    const { error } = await supabase.from("app_settings").update({ value: enabled }).eq("key", key);
    if (error) {
      console.error(`Failed to set ${key}:`, error.message);
      process.exit(1);
    }
  }
}

async function setAllEnabled(enabled) {
  await setFormStates({
    sponsor: enabled,
    exhibitor: enabled,
    visit: enabled,
  });
}

function botFields() {
  return {
    form_render_token: "altfff-render-v1",
    form_mounted_at: String(Date.now()),
  };
}

async function postJson(path, payload) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `public-forms-gate-${randomUUID()}`,
    },
    body: JSON.stringify({ ...botFields(), ...payload }),
  });
}

async function postExhibitor() {
  return postJson("/api/exhibitor-applications", {
    email: `exhibitor-gate-${randomUUID().slice(0, 8)}@example.com`,
    name: "Gate Test Exhibitor",
  });
}

async function postSponsor() {
  return postJson("/api/sponsor-inquiries", {
    email: `sponsor-gate-${randomUUID().slice(0, 8)}@example.com`,
    fullName: "Gate Test Sponsor",
    phone: "+233241234567",
    hearAbout: "google_web",
    linkedin: "@gate-test",
    company: "Gate Co",
    jobTitle: "Director",
    businessNature: "Testing",
  });
}

async function postVisitor() {
  return postJson("/api/visitor-registrations", {
    email: `visitor-gate-${randomUUID().slice(0, 8)}@example.com`,
    full_name: "Gate Test Visitor",
    phone: "+233241234567",
    social_media_website: "https://example.com",
    country: "Ghana",
    interest: "materials",
    business_type: "b2b",
    heard_about_us: "google_web",
  });
}

async function postContact() {
  return postJson("/api/contact", {
    firstName: "Gate",
    lastName: "Contact",
    email: `contact-gate-${randomUUID().slice(0, 8)}@example.com`,
    message: "Public forms gate contact smoke test.",
  });
}

async function fetchPage(path) {
  return fetch(`${base}${path}`, { headers: { Accept: "text/html" } });
}

async function expectRejected(label, res) {
  const json = await res.json().catch(() => ({}));
  if (res.status !== 403 || json.ok !== false || json.error !== CLOSED_MESSAGE) {
    console.error(`FAIL: expected 403 with closed message for ${label}`, res.status, json);
    process.exit(1);
  }
}

async function expectAccepted(label, res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    console.error(`FAIL: expected success for ${label}`, res.status, json);
    process.exit(1);
  }
}

async function testIndependentGate(formToClose) {
  const states = { sponsor: true, exhibitor: true, visit: true, [formToClose]: false };
  await setFormStates(states);

  const checks = [
    ["exhibitor", postExhibitor],
    ["sponsor", postSponsor],
    ["visit", postVisitor],
  ];

  for (const [form, fn] of checks) {
    const res = await fn();
    if (form === formToClose) {
      await expectRejected(`${form} (closed)`, res);
    } else {
      await expectAccepted(`${form} (still open)`, res);
    }
  }

  const contactRes = await postContact();
  await expectAccepted("contact", contactRes);

  if (formToClose === "visit") {
    const visitHtml = await (await fetchPage("/visit")).text();
    if (!visitHtml.includes(CLOSED_MESSAGE)) {
      console.error("FAIL: /visit missing closed notice when visit form is off");
      process.exit(1);
    }
  } else {
    const visitHtml = await (await fetchPage("/visit")).text();
    if (visitHtml.includes(CLOSED_MESSAGE)) {
      console.error("FAIL: /visit shows closed notice while visit form is still open");
      process.exit(1);
    }
  }

  if (formToClose === "sponsor") {
    const sponsorHtml = await (await fetchPage("/sponsorship")).text();
    if (!sponsorHtml.includes(CLOSED_MESSAGE)) {
      console.error("FAIL: /sponsorship missing closed notice when sponsor form is off");
      process.exit(1);
    }
  } else {
    const sponsorHtml = await (await fetchPage("/sponsorship")).text();
    if (sponsorHtml.includes(CLOSED_MESSAGE)) {
      console.error("FAIL: /sponsorship shows closed notice while sponsor form is still open");
      process.exit(1);
    }
  }
}

async function main() {
  await ensureSettingsTable();

  console.log("1) All forms ON — every gated API accepts, contact accepts");
  await setAllEnabled(true);
  await expectAccepted("exhibitor", await postExhibitor());
  await expectAccepted("sponsor", await postSponsor());
  await expectAccepted("visitor", await postVisitor());
  await expectAccepted("contact", await postContact());
  console.log("   PASS");

  console.log("2) Only exhibitor OFF — exhibitor rejected, sponsor + visitor + contact OK");
  await testIndependentGate("exhibitor");
  console.log("   PASS");

  console.log("3) Only sponsor OFF — sponsor rejected, exhibitor + visitor + contact OK");
  await testIndependentGate("sponsor");
  console.log("   PASS");

  console.log("4) Only visit OFF — visitor rejected, exhibitor + sponsor + contact OK");
  await testIndependentGate("visit");
  console.log("   PASS");

  console.log("5) All forms OFF — all three gated APIs reject, contact still OK");
  await setAllEnabled(false);
  await expectRejected("exhibitor", await postExhibitor());
  await expectRejected("sponsor", await postSponsor());
  await expectRejected("visitor", await postVisitor());
  await expectAccepted("contact", await postContact());
  console.log("   PASS");

  console.log("\nAll automated independent gate checks passed.");
  console.log("Manual checks still required:");
  console.log("- Three toggles invisible on /admin Overview for non-cimonstechnologies@gmail.com admins");
  console.log("- PATCH /api/admin/settings/public-forms returns 403 for other admins");
  console.log("- cimonstechnologies@gmail.com can toggle each form independently; Activity Log names the form");
  console.log("- Exhibitor CTA opens closed notice modal when only exhibitor is off");

  await setAllEnabled(true);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
