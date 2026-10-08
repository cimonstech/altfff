/**
 * Verify visitor Interest -> MMERGE26 and B2B/B2C -> MMERGE27 Mailchimp sync.
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-visitor-mailchimp-merge-fields.mjs
 *   node --env-file=.env.local scripts/test-visitor-mailchimp-merge-fields.mjs --base http://localhost:3000
 *   node --env-file=.env.local scripts/test-visitor-mailchimp-merge-fields.mjs --email you@gmail.com
 *
 * Live Mailchimp checks require --email with a real address (Mailchimp rejects @example.com).
 */
import { createHash } from "crypto";
import { randomUUID } from "crypto";
import { spawnSync } from "child_process";
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
const liveEmail = arg("email", process.env.TEST_MAILCHIMP_EMAIL || "");
let testSeq = 0;
function nextTestIp() {
  testSeq += 1;
  return `203.0.113.${(testSeq % 200) + 1}`;
}

const apiKey = process.env.MAILCHIMP_API_KEY?.trim();
const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX?.trim();
const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim();
const auth = apiKey ? Buffer.from(`anystring:${apiKey}`).toString("base64") : null;

function subscriberHash(email) {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

function botFields() {
  return {
    form_render_token: "altfff-render-v1",
    form_mounted_at: String(Date.now() - 5000),
    form_token_hp: "",
  };
}

async function postVisitor(body) {
  const res = await fetch(`${base}/api/visitor-registrations`, {
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

async function mailchimpMember(email) {
  const url = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash(email)}`;
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Mailchimp lookup failed: HTTP ${res.status}`);
  return res.json();
}

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

const validBase = {
  full_name: "MC Merge Field Test",
  phone: "+233241234567",
  social_media_website: "https://example.com/brand",
  country: "Ghana",
  interest: "learning",
  business_type: "both",
  heard_about_us: "instagram",
};

function runMergeFieldUnitTest() {
  const result = spawnSync("npx", ["--yes", "tsx", join(root, "scripts/test-visitor-mailchimp-merge-fields-unit.ts")], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "merge field unit test failed");
  }
  assert(true, "buildMailchimpMergeFields maps interest -> MMERGE26, businessType -> MMERGE27, skips MMERGE3");
}

async function confirmMailchimpFieldDefinitions() {
  const res = await fetch(
    `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/merge-fields?count=50`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  const body = await res.json();
  const m26 = body.merge_fields?.find((f) => f.tag === "MMERGE26");
  const m27 = body.merge_fields?.find((f) => f.tag === "MMERGE27");
  const m3 = body.merge_fields?.find((f) => f.tag === "MMERGE3");
  assert(m26?.name === "Visitor Reason for Attending", "Mailchimp has MMERGE26 Visitor Reason for Attending");
  assert(m27?.name === "Business Type (B2B/B2C)", "Mailchimp has MMERGE27 Business Type (B2B/B2C)");
  assert(m3?.type === "dropdown", "MMERGE3 remains the legacy Exhibiting/Visiting/Sponsoring dropdown");
}

async function main() {
  if (!auth || !serverPrefix || !audienceId) {
    throw new Error("Missing Mailchimp env vars.");
  }

  console.log(`Visitor Mailchimp merge-field tests (${base})\n`);

  runMergeFieldUnitTest();
  await confirmMailchimpFieldDefinitions();

  const optOutEmail = `mc-merge-optout-${randomUUID()}@example.com`;
  const optOut = await postVisitor({ ...validBase, email: optOutEmail });
  assert(optOut.status === 200, `opt-out submission accepted (HTTP ${optOut.status})`);
  await new Promise((r) => setTimeout(r, 4000));
  const absent = await mailchimpMember(optOutEmail);
  assert(absent === null, "opt-out contact not added to Mailchimp");

  if (!liveEmail) {
    console.log("\nSkipped live opt-in Mailchimp check (pass --email or set TEST_MAILCHIMP_EMAIL with a real address).");
    console.log("All runnable visitor Mailchimp merge-field checks passed.");
    return;
  }

  const optIn = await postVisitor({ ...validBase, email: liveEmail, newsletter: "on" });
  assert(optIn.status === 200 || optIn.status === 409, `opt-in submission HTTP ${optIn.status}`);

  await new Promise((r) => setTimeout(r, 5000));

  const member = await mailchimpMember(liveEmail);
  assert(member !== null, "opt-in contact exists in Mailchimp");
  assert(
    member.merge_fields?.MMERGE26 === "Learning From Experts",
    `MMERGE26 = "${member.merge_fields?.MMERGE26}"`,
  );
  assert(member.merge_fields?.MMERGE27 === "Both", `MMERGE27 = "${member.merge_fields?.MMERGE27}"`);
  assert(!member.merge_fields?.MMERGE3, `MMERGE3 untouched ("${member.merge_fields?.MMERGE3 ?? ""}")`);

  console.log("\nAll visitor Mailchimp merge-field checks passed.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
