/**
 * Remove automation / smoke-test form submissions from Supabase.
 *
 * Preview:  node --env-file=.env.local scripts/cleanup-test-data.mjs
 * Delete:    node --env-file=.env.local scripts/cleanup-test-data.mjs --execute
 */
import { createClient } from "@supabase/supabase-js";

const execute = process.argv.includes("--execute");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const TEST_EMAIL_PREFIXES = [
  "dl-test-",
  "mx-test-",
  "enum-test-",
  "exhibitor-gate-",
  "sponsor-gate-",
  "visitor-gate-",
  "contact-gate-",
  "exhibitor-sec-",
  "sponsor-sec-",
  "visitor-sec-",
  "contact-sec-",
  "walkin-test-",
  "gate-",
  "visitor-req-",
  "visitor-domain-",
  "visitor-no-mc-",
  "mc-merge-optout-",
  "rt-probe-",
  "invite-redirect-",
  "vetting-test-",
  "guard-test-",
  "decline-test-",
  "burst-",
  "staff-verify-",
  "checkin-",
  "race15-",
  "race2-",
  "shared-",
  "shared30-",
  "diag-",
];

const TEST_NAME_RE =
  /^(Burst Walkin|Burst Visitor|Shared |Diag |Guard Test |Race Visitor|Race Exhibitor|Staff Verify)/i;

export function isTestSubmissionEmail(email) {
  if (!email || typeof email !== "string") return false;
  const e = email.trim().toLowerCase();
  if (e.endsWith("@example.com") || e.endsWith("@test.local")) return true;
  if (e.startsWith("gate-") && e.endsWith("@example.com")) return true;
  return TEST_EMAIL_PREFIXES.some((prefix) => e.startsWith(prefix));
}

export function isTestVisitorRow(row) {
  if (isTestSubmissionEmail(row.email)) return true;
  const name = typeof row.full_name === "string" ? row.full_name.trim() : "";
  return TEST_NAME_RE.test(name);
}

const FORM_TABLES = [
  { table: "exhibitor_applications", emailField: "email", matchRow: (row) => isTestSubmissionEmail(row.email) },
  { table: "sponsor_inquiries", emailField: "email", matchRow: (row) => isTestSubmissionEmail(row.email) },
  { table: "contact_messages", emailField: "email", matchRow: (row) => isTestSubmissionEmail(row.email) },
  {
    table: "visitor_registrations",
    emailField: "email",
    matchRow: isTestVisitorRow,
  },
];

async function fetchAll(table) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await admin.from(table).select("*").range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function deleteNotes(table, ids) {
  if (!ids.length) return 0;
  const { error, count } = await admin
    .from("entity_notes")
    .delete({ count: "exact" })
    .eq("entity_table", table)
    .in("entity_id", ids);
  if (error) throw error;
  return count ?? 0;
}

async function deleteActivity(table, ids) {
  if (!ids.length) return 0;
  const { error, count } = await admin
    .from("activity_logs")
    .delete({ count: "exact" })
    .eq("target_table", table)
    .in("target_id", ids);
  if (error) throw error;
  return count ?? 0;
}

async function deleteRows(table, ids) {
  if (!ids.length) return 0;
  const { error, count } = await admin.from(table).delete({ count: "exact" }).in("id", ids);
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  console.log(execute ? "EXECUTE — deleting test data" : "DRY RUN — preview only (pass --execute to delete)");
  const summary = [];

  for (const { table, matchRow } of FORM_TABLES) {
    const rows = await fetchAll(table);
    const testRows = rows.filter(matchRow);
    summary.push({ table, test: testRows.length, total: rows.length });

    console.log(`\n${table}: ${testRows.length} test / ${rows.length} total`);
    for (const row of testRows.slice(0, 8)) {
      console.log(
        `  - ${row.email}${row.full_name ? ` (${row.full_name})` : ""}${row.source ? ` [${row.source}]` : ""}${row.checked_in_at ? " ✓checked-in" : ""}`,
      );
    }
    if (testRows.length > 8) console.log(`  … and ${testRows.length - 8} more`);

    if (!execute || testRows.length === 0) continue;

    const ids = testRows.map((row) => row.id);
    const notes = await deleteNotes(table, ids);
    const activity = await deleteActivity(table, ids);
    const deleted = await deleteRows(table, ids);
    console.log(`  deleted rows=${deleted}, entity_notes=${notes}, activity_logs=${activity}`);
  }

  const { count: walkIns } = await admin
    .from("visitor_registrations")
    .select("id", { count: "exact", head: true })
    .eq("source", "walk_in");
  const { count: checkedIn } = await admin
    .from("visitor_registrations")
    .select("id", { count: "exact", head: true })
    .not("checked_in_at", "is", null);
  const { count: visitors } = await admin
    .from("visitor_registrations")
    .select("id", { count: "exact", head: true });

  console.log("\nSummary:", summary);
  console.log("\nAfter run — visitor_registrations:", { total: visitors, walk_ins: walkIns, checked_in: checkedIn });

  if (!execute) {
    console.log("\nNo rows deleted. Re-run with --execute when the preview looks correct.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
