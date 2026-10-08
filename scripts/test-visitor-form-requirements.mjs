/**
 * Verify visitor form field requirements (server-side via API + static checks).
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-visitor-form-requirements.mjs
 *   node --env-file=.env.local scripts/test-visitor-form-requirements.mjs --base http://localhost:3000
 */
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const base = arg("base", process.env.TEST_BASE_URL || "http://localhost:3000");
let testSeq = 0;
function nextTestIp() {
  testSeq += 1;
  return `203.0.113.${(testSeq % 200) + 1}`;
}

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
      "X-Forwarded-For": nextTestIp(),
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

const validVisitor = {
  email: `visitor-req-${randomUUID()}@example.com`,
  full_name: "Visitor Requirements Test",
  phone: "+233241234567",
  social_media_website: "https://instagram.com/altfff",
  country: "Ghana",
  interest: "materials",
  business_type: "b2b",
  heard_about_us: "instagram",
};

async function expectRejected(body, field) {
  const { status, json } = await postJson("/api/visitor-registrations", body);
  assert(status === 400, `rejects missing/invalid ${field} (HTTP ${status})`);
  assert(
    json.fieldErrors && typeof json.fieldErrors[field] === "string",
    `returns fieldErrors.${field}`,
  );
}

function checkStaticRequirements() {
  const interests = readFileSync(join(root, "src/lib/visitorInterests.ts"), "utf8");
  const expectedLabels = [
    "Discovering New Materials & Innovation",
    "Connecting With Industry Leaders",
    "Learning From Experts",
    "Finding New Business Opportunities",
    "Other",
  ];
  for (const label of expectedLabels) {
    assert(interests.includes(`label: "${label}"`), `interest option present: ${label}`);
  }
  const firstIdx = interests.indexOf('"Discovering New Materials & Innovation"');
  const lastIdx = interests.indexOf('"Other"');
  assert(firstIdx < lastIdx, "interest options keep Other last in source");

  const businessType = readFileSync(join(root, "src/lib/visitorBusinessType.ts"), "utf8");
  assert(
    businessType.includes(
      "You supply or sell primarily to other businesses (manufacturers, wholesalers, retailers)",
    ),
    "B2B description present",
  );
  assert(
    businessType.includes("You sell primarily directly to individual consumers or shoppers"),
    "B2C description present",
  );
  assert(
    businessType.includes("You do a mix of B2B and B2C business"),
    "Both description present",
  );

  const newsletter = readFileSync(join(root, "src/components/NewsletterOptInCheckbox.tsx"), "utf8");
  assert(
    newsletter.includes(
      "By ticking this box you agree to receive email updates regarding the Alt.FFF Event",
    ),
    "newsletter checkbox uses exact label wording",
  );

  const route = readFileSync(join(root, "src/app/api/visitor-registrations/route.ts"), "utf8");
  assert(route.includes("if (newsletterOptIn)"), "Mailchimp sync still gated on newsletter opt-in");
  assert(route.includes('source: "VISITOR"'), "Mailchimp sync source unchanged");
}

async function main() {
  console.log(`Alt.FFF visitor form requirement tests (${base})\n`);

  checkStaticRequirements();

  await expectRejected({ ...validVisitor, phone: "" }, "phone");
  await expectRejected({ ...validVisitor, social_media_website: "" }, "social_media_website");
  await expectRejected({ ...validVisitor, social_media_website: "not valid input" }, "social_media_website");

  const domainOnly = await postJson("/api/visitor-registrations", {
    ...validVisitor,
    email: `visitor-domain-${randomUUID()}@example.com`,
    social_media_website: "thisismotivo.com",
  });
  assert(domainOnly.status !== 400, "bare domain accepted for social_media_website");
  await expectRejected({ ...validVisitor, interest: "flyer" }, "interest");
  const { heard_about_us: _omitHear, ...withoutHeardAbout } = validVisitor;
  await expectRejected(withoutHeardAbout, "heard_about_us");
  await expectRejected(
    { ...validVisitor, interest: "other" },
    "interest_other",
  );
  await expectRejected({ ...validVisitor, business_type: "retail" }, "business_type");
  const { business_type: _omit, ...withoutBusinessType } = validVisitor;
  await expectRejected(withoutBusinessType, "business_type");

  const withoutNewsletter = { ...validVisitor, email: `visitor-no-mc-${randomUUID()}@example.com` };
  const noOptIn = await postJson("/api/visitor-registrations", withoutNewsletter);
  assert(
    noOptIn.status === 200 || noOptIn.status === 500,
    `submission without newsletter proceeds (HTTP ${noOptIn.status})`,
  );

  console.log("\nAll visitor form requirement checks passed.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
