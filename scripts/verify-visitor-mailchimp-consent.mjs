/**
 * Cross-check visitor_registrations newsletter_opt_in vs Mailchimp audience.
 * Usage: node --env-file=.env.local scripts/verify-visitor-mailchimp-consent.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.MAILCHIMP_API_KEY?.trim();
const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX?.trim();
const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim();

if (!url || !key || !apiKey || !serverPrefix || !audienceId) {
  console.error("Missing Supabase or Mailchimp env vars.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const auth = Buffer.from(`anystring:${apiKey}`).toString("base64");

function subscriberHash(email) {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

async function mailchimpLookup(email) {
  const memberUrl = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash(email)}`;
  const res = await fetch(memberUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (res.status === 404) {
    return { exists: false, status: null, tags: [] };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mailchimp lookup failed for ${email}: HTTP ${res.status} ${text.slice(0, 200)}`);
  }

  const body = await res.json();
  const tagsRes = await fetch(`${memberUrl}/tags`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  let tags = (body.tags || []).map((t) => t.name);
  if (tagsRes.ok) {
    const tagsBody = await tagsRes.json();
    tags = (tagsBody.tags || []).map((t) => t.name);
  }

  return {
    exists: true,
    status: body.status,
    tags,
    timestamp_signup: body.timestamp_signup,
    last_changed: body.last_changed,
  };
}

const { data: optedOut, error: outErr } = await supabase
  .from("visitor_registrations")
  .select("id,email,full_name,newsletter_opt_in,created_at,source")
  .eq("newsletter_opt_in", false)
  .order("created_at", { ascending: false });

if (outErr) throw outErr;

const { data: optedIn, error: inErr } = await supabase
  .from("visitor_registrations")
  .select("id,email,full_name,newsletter_opt_in,created_at,source")
  .eq("newsletter_opt_in", true)
  .order("created_at", { ascending: false })
  .limit(10);

if (inErr) throw inErr;

const { count: totalCount } = await supabase
  .from("visitor_registrations")
  .select("*", { count: "exact", head: true });

const { count: optInCount } = await supabase
  .from("visitor_registrations")
  .select("*", { count: "exact", head: true })
  .eq("newsletter_opt_in", true);

const { count: optOutCount } = await supabase
  .from("visitor_registrations")
  .select("*", { count: "exact", head: true })
  .eq("newsletter_opt_in", false);

console.log("=== visitor_registrations summary ===");
console.log(`Total rows: ${totalCount}`);
console.log(`newsletter_opt_in = true:  ${optInCount}`);
console.log(`newsletter_opt_in = false: ${optOutCount}`);

console.log("\n=== ALL opt-out rows (${optedOut.length}) vs Mailchimp ===");
let optOutInMailchimp = 0;
let optOutWithVisitorTag = 0;
for (const row of optedOut) {
  const mc = await mailchimpLookup(row.email);
  const hasVisitorTag = mc.tags.includes("VISITOR");
  if (mc.exists) optOutInMailchimp++;
  if (hasVisitorTag) optOutWithVisitorTag++;
  console.log(
    JSON.stringify({
      email: row.email,
      name: row.full_name,
      registered_at: row.created_at,
      mailchimp_exists: mc.exists,
      mailchimp_status: mc.status,
      mailchimp_tags: mc.tags,
      has_visitor_tag: hasVisitorTag,
    }),
  );
}

console.log("\n=== Recent opt-in sample (10) vs Mailchimp ===");
let optInMissing = 0;
let optInMissingVisitorTag = 0;
for (const row of optedIn) {
  const mc = await mailchimpLookup(row.email);
  const hasVisitorTag = mc.tags.includes("VISITOR");
  if (!mc.exists) optInMissing++;
  if (!hasVisitorTag) optInMissingVisitorTag++;
  console.log(
    JSON.stringify({
      email: row.email,
      name: row.full_name,
      registered_at: row.created_at,
      mailchimp_exists: mc.exists,
      mailchimp_status: mc.status,
      mailchimp_tags: mc.tags,
      has_visitor_tag: hasVisitorTag,
    }),
  );
}

console.log("\n=== Summary ===");
console.log(`Opt-out rows in Mailchimp at all: ${optOutInMailchimp}/${optedOut.length}`);
console.log(`Opt-out rows with VISITOR tag: ${optOutWithVisitorTag}/${optedOut.length}`);
console.log(`Opt-in sample missing from Mailchimp: ${optInMissing}/${optedIn.length}`);
console.log(`Opt-in sample missing VISITOR tag: ${optInMissingVisitorTag}/${optedIn.length}`);
