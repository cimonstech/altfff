/**
 * Verify heard-about + country enum enforcement on public form APIs.
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-form-select-enums.mjs
 *   node --env-file=.env.local scripts/test-form-select-enums.mjs --base http://localhost:3000
 */
import { randomUUID } from "crypto";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const base = arg("base", process.env.TEST_BASE_URL || "http://localhost:3000");
const testIp = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

function botFields() {
  return {
    form_render_token: "altfff-render-v1",
    form_mounted_at: String(Date.now() - 5000),
    form_token_hp: "",
  };
}

async function postJson(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": testIp,
    },
    body: JSON.stringify({ ...botFields(), ...body }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

const validExhibitor = {
  email: `enum-test-ex-${randomUUID()}@example.com`,
  name: "Enum Test Exhibitor",
  hear: "instagram",
  country: "Ghana",
};

const validSponsor = {
  email: `enum-test-sp-${randomUUID()}@example.com`,
  fullName: "Enum Test Sponsor",
  phone: "+233241234567",
  hearAbout: "linkedin",
  linkedin: "enum-test",
  company: "Enum Co",
  jobTitle: "Director",
  businessNature: "Testing",
  country: "Ghana",
};

const validVisitor = {
  email: `enum-test-vi-${randomUUID()}@example.com`,
  full_name: "Enum Test Visitor",
  heard_about_us: "whatsapp",
  country: "Nigeria",
};

async function expectRejected(path, body, field) {
  const { status, json } = await postJson(path, body);
  assert(status === 400, `${path} rejects invalid ${field} (HTTP ${status})`);
  assert(
    json.fieldErrors && typeof json.fieldErrors[field] === "string",
    `${path} returns fieldErrors.${field}`,
  );
}

async function expectOtherRequiresDetail(path, body, mainField, otherField) {
  const { status, json } = await postJson(path, body);
  assert(status === 400, `${path} rejects Other without detail`);
  assert(
    json.fieldErrors && typeof json.fieldErrors[otherField] === "string",
    `${path} returns fieldErrors.${otherField} for Other follow-up`,
  );
}

async function main() {
  console.log(`Alt.FFF form enum tests (${base})\n`);

  await expectRejected("/api/exhibitor-applications", {
    ...validExhibitor,
    hear: "not-a-real-source",
  }, "hear");

  await expectRejected("/api/exhibitor-applications", {
    ...validExhibitor,
    country: "Atlantis",
  }, "country");

  await expectOtherRequiresDetail(
    "/api/exhibitor-applications",
    { ...validExhibitor, hear: "other" },
    "hear",
    "hear_other",
  );

  await expectOtherRequiresDetail(
    "/api/exhibitor-applications",
    { ...validExhibitor, country: "Other" },
    "country",
    "country_other",
  );

  await expectRejected("/api/sponsor-inquiries", {
    ...validSponsor,
    hearAbout: "billboard",
  }, "hearAbout");

  await expectRejected("/api/sponsor-inquiries", {
    ...validSponsor,
    country: "Narnia",
  }, "country");

  await expectOtherRequiresDetail(
    "/api/sponsor-inquiries",
    { ...validSponsor, hearAbout: "other" },
    "hearAbout",
    "hearAbout_other",
  );

  await expectRejected("/api/visitor-registrations", {
    ...validVisitor,
    heard_about_us: "flyer",
  }, "heard_about_us");

  await expectRejected("/api/visitor-registrations", {
    ...validVisitor,
    country: "Made Up Land",
  }, "country");

  await expectOtherRequiresDetail(
    "/api/visitor-registrations",
    { ...validVisitor, heard_about_us: "other" },
    "heard_about_us",
    "heard_about_us_other",
  );

  const ok = await postJson("/api/exhibitor-applications", {
    ...validExhibitor,
    hear: "other",
    hear_other: "A friend mentioned it",
    country: "Other",
    country_other: "Togo",
  });
  assert(ok.status === 200, "valid Other follow-ups accepted on exhibitor route");

  console.log("\nAll form enum checks passed.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
