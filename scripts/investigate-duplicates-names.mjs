/**
 * Investigate duplicate registrations and null names.
 * Run: node --env-file=.env.local scripts/investigate-duplicates-names.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return "";
  return phone.replace(/\D/g, "");
}

async function fetchAll(table, select) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function findDuplicateGroups(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return [...map.entries()].filter(([, g]) => g.length > 1);
}

function gapSeconds(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 1000;
}

function summarizeDuplicates(label, groups) {
  console.log(`\n=== ${label} duplicate groups: ${groups.length} ===`);
  for (const [key, group] of groups.slice(0, 20)) {
    const sorted = [...group].sort(
      (x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime(),
    );
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(gapSeconds(sorted[i - 1].created_at, sorted[i].created_at));
    }
    const minGap = gaps.length ? Math.min(...gaps) : null;
    const maxGap = gaps.length ? Math.max(...gaps) : null;
    console.log({
      key,
      count: group.length,
      statuses: sorted.map((r) => r.status),
      created_at: sorted.map((r) => r.created_at),
      minGapSeconds: minGap,
      maxGapSeconds: maxGap,
      likelyDoubleSubmit: minGap != null && minGap <= 5,
    });
  }
  if (groups.length > 20) console.log(`... and ${groups.length - 20} more groups`);
}

async function main() {
  const visitors = await fetchAll(
    "visitor_registrations",
    "id, email, phone, full_name, status, created_at",
  );
  const exhibitors = await fetchAll(
    "exhibitor_applications",
    "id, email, phone, full_name, status, created_at",
  );

  console.log(`Total visitor_registrations: ${visitors.length}`);
  console.log(`Total exhibitor_applications: ${exhibitors.length}`);

  const visitorEmailDups = findDuplicateGroups(visitors, (r) => normalizeEmail(r.email));
  const visitorPhoneDups = findDuplicateGroups(visitors, (r) => normalizePhone(r.phone));
  const exhibitorEmailDups = findDuplicateGroups(exhibitors, (r) => normalizeEmail(r.email));
  const exhibitorPhoneDups = findDuplicateGroups(exhibitors, (r) => normalizePhone(r.phone));

  summarizeDuplicates("Visitor email", visitorEmailDups);
  summarizeDuplicates("Visitor phone", visitorPhoneDups);
  summarizeDuplicates("Exhibitor email", exhibitorEmailDups);
  summarizeDuplicates("Exhibitor phone", exhibitorPhoneDups);

  const visitorsMissingName = visitors.filter((r) => !r.full_name || !String(r.full_name).trim());
  const exhibitorsMissingName = exhibitors.filter((r) => !r.full_name || !String(r.full_name).trim());

  console.log(`\n=== Names missing in DB ===`);
  console.log(`Visitors with null/empty full_name: ${visitorsMissingName.length} / ${visitors.length}`);
  console.log(`Exhibitors with null/empty full_name: ${exhibitorsMissingName.length} / ${exhibitors.length}`);

  console.log(`\nSample visitors missing name (up to 5):`);
  for (const r of visitorsMissingName.slice(0, 5)) {
    console.log({ id: r.id, email: r.email, status: r.status, created_at: r.created_at, full_name: r.full_name });
  }

  console.log(`\nSample exhibitors missing name (up to 5):`);
  for (const r of exhibitorsMissingName.slice(0, 5)) {
    console.log({ id: r.id, email: r.email, status: r.status, created_at: r.created_at, full_name: r.full_name });
  }

  console.log(`\nSample visitors WITH name (up to 3):`);
  for (const r of visitors.filter((x) => x.full_name).slice(0, 3)) {
    console.log({ id: r.id, email: r.email, full_name: r.full_name, status: r.status });
  }

  console.log(`\nSample exhibitors WITH name (up to 3):`);
  for (const r of exhibitors.filter((x) => x.full_name).slice(0, 3)) {
    console.log({ id: r.id, email: r.email, full_name: r.full_name, status: r.status });
  }

  // Cross-check duplicate pairs with name presence
  if (visitorEmailDups.length) {
    const [, group] = visitorEmailDups[0];
    console.log(`\nFirst visitor email duplicate group detail:`);
    for (const r of group) {
      console.log({ id: r.id, full_name: r.full_name, status: r.status, created_at: r.created_at, phone: r.phone });
    }
  }
  if (exhibitorEmailDups.length) {
    const [, group] = exhibitorEmailDups[0];
    console.log(`\nFirst exhibitor email duplicate group detail:`);
    for (const r of group) {
      console.log({ id: r.id, full_name: r.full_name, status: r.status, created_at: r.created_at, phone: r.phone });
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
