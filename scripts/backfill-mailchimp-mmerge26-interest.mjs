/**
 * One-time backfill: visitor_registrations.interest -> Mailchimp MMERGE26
 * ONLY for rows with newsletter_opt_in = true and non-null interest.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-mailchimp-mmerge26-interest.mjs
 *   node --env-file=.env.local scripts/backfill-mailchimp-mmerge26-interest.mjs --dry-run
 *
 * Optional: BACKFILL_PACE_MS=600 (default) delay between Mailchimp API calls per row.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.MAILCHIMP_API_KEY?.trim();
const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX?.trim();
const audienceId = process.env.MAILCHIMP_AUDIENCE_ID?.trim();
const paceMs = Number.parseInt(process.env.BACKFILL_PACE_MS ?? "600", 10);

if (!url || !serviceKey || !apiKey || !serverPrefix || !audienceId) {
  console.error("Missing Supabase or Mailchimp env vars.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const auth = Buffer.from(`anystring:${apiKey}`).toString("base64");
const memberBase = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members`;

function subscriberHash(email) {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeInterest(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function mailchimpFetch(path, options = {}, attempt = 0) {
  const res = await fetch(`${memberBase}/${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 429 && attempt < 5) {
    const retryAfter = Number.parseInt(res.headers.get("retry-after") ?? "5", 10);
    const waitMs = (Number.isFinite(retryAfter) ? retryAfter : 5) * 1000;
    console.warn(`[rate-limit] HTTP 429 — waiting ${waitMs}ms before retry (${attempt + 1}/5)`);
    await sleep(waitMs);
    return mailchimpFetch(path, options, attempt + 1);
  }

  return res;
}

async function getMemberMerge26(email) {
  const hash = subscriberHash(email);
  const res = await mailchimpFetch(hash, { method: "GET" });
  if (res.status === 404) {
    return { ok: false, reason: "not_found" };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, reason: `lookup_http_${res.status}`, detail: text.slice(0, 300) };
  }
  const body = await res.json();
  const current = body.merge_fields?.MMERGE26 ?? "";
  return { ok: true, current: typeof current === "string" ? current.trim() : String(current ?? "") };
}

async function patchMerge26(email, interest) {
  const hash = subscriberHash(email);
  const res = await mailchimpFetch(hash, {
    method: "PATCH",
    body: JSON.stringify({ merge_fields: { MMERGE26: interest } }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, reason: `patch_http_${res.status}`, detail: text.slice(0, 300) };
  }
  return { ok: true };
}

async function main() {
  console.log(`Alt.FFF MMERGE26 interest backfill${dryRun ? " (DRY RUN)" : ""}\n`);
  console.log(`Pacing: ${paceMs}ms between Mailchimp lookups/updates per row\n`);

  const { data: rows, error } = await supabase
    .from("visitor_registrations")
    .select("id,email,interest,newsletter_opt_in,created_at")
    .eq("newsletter_opt_in", true)
    .not("interest", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabase query failed:", error.message);
    process.exit(1);
  }

  const candidates = (rows ?? []).filter((row) => normalizeInterest(row.interest).length > 0);

  // Safety: prove we never pulled opt-out rows from the query itself.
  const optOutInBatch = candidates.filter((row) => row.newsletter_opt_in !== true);
  if (optOutInBatch.length > 0) {
    console.error("ABORT: query returned rows with newsletter_opt_in !== true");
    process.exit(1);
  }

  const { count: optOutWithInterest } = await supabase
    .from("visitor_registrations")
    .select("*", { count: "exact", head: true })
    .eq("newsletter_opt_in", false)
    .not("interest", "is", null);

  console.log(`Matched (newsletter_opt_in=true, interest set): ${candidates.length}`);
  console.log(`Opt-out rows with interest (must stay untouched): ${optOutWithInterest ?? "?"}\n`);

  const stats = {
    updated: 0,
    skippedAlreadyCorrect: 0,
    skippedDryRunWouldUpdate: 0,
    failed: 0,
  };
  const failures = [];
  const updatedSamples = [];

  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i];
    const email = row.email?.trim().toLowerCase();
    const interest = normalizeInterest(row.interest);

    if (!email || !email.includes("@")) {
      stats.failed++;
      failures.push({ email: row.email ?? "(missing)", reason: "invalid_email", interest });
      continue;
    }

    const lookup = await getMemberMerge26(email);
    await sleep(paceMs);

    if (!lookup.ok) {
      stats.failed++;
      failures.push({
        email,
        reason: lookup.reason,
        detail: lookup.detail,
        interest,
      });
      continue;
    }

    if (lookup.current === interest) {
      stats.skippedAlreadyCorrect++;
      continue;
    }

    if (dryRun) {
      stats.skippedDryRunWouldUpdate++;
      if (updatedSamples.length < 3) {
        updatedSamples.push({ email, interest, previous: lookup.current || "(empty)" });
      }
      continue;
    }

    const patch = await patchMerge26(email, interest);
    await sleep(paceMs);

    if (!patch.ok) {
      stats.failed++;
      failures.push({
        email,
        reason: patch.reason,
        detail: patch.detail,
        interest,
      });
      continue;
    }

    stats.updated++;
    if (updatedSamples.length < 3) {
      updatedSamples.push({ email, interest, previous: lookup.current || "(empty)" });
    }

    if ((i + 1) % 10 === 0 || i + 1 === candidates.length) {
      console.log(`Progress ${i + 1}/${candidates.length} — updated ${stats.updated}, skipped ${stats.skippedAlreadyCorrect}, failed ${stats.failed}`);
    }
  }

  console.log("\n=== Final counts ===");
  console.log(`Matched criteria:              ${candidates.length}`);
  console.log(`Updated MMERGE26:            ${stats.updated}`);
  console.log(`Skipped (already correct):   ${stats.skippedAlreadyCorrect}`);
  if (dryRun) {
    console.log(`Would update (dry run):      ${stats.skippedDryRunWouldUpdate}`);
  }
  console.log(`Failed:                      ${stats.failed}`);
  console.log(`Opt-out rows never queried:  ${optOutWithInterest ?? "?"} (unchanged by design)`);

  if (updatedSamples.length > 0) {
    console.log("\n=== Spot-check samples ===");
    for (const sample of updatedSamples) {
      if (dryRun) {
        console.log(`${sample.email}: would set MMERGE26="${sample.interest}" (was "${sample.previous}")`);
        continue;
      }
      const verify = await getMemberMerge26(sample.email);
      const shown = verify.ok ? verify.current : `(verify failed: ${verify.reason})`;
      console.log(`${sample.email}: MMERGE26="${shown}" (expected "${sample.interest}")`);
    }
  }

  if (failures.length > 0) {
    console.log("\n=== Failures ===");
    for (const f of failures) {
      console.log(JSON.stringify(f));
    }
  }

  if (stats.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
