/**
 * Verify NOT NULL on full_name (migration 0011).
 * Run: node --env-file=.env.local scripts/verify-name-not-null.mjs
 *
 * Before Step 1: expect null-row count > 0 and migration-not-ready message.
 * After Step 1 + migration applied: expect constraint violations on null inserts.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const tag = `not-null-verify-${Date.now()}`;

async function countNullNames() {
  const [exhibitors, visitors] = await Promise.all([
    supabase.from("exhibitor_applications").select("id, email", { count: "exact" }).is("full_name", null),
    supabase.from("visitor_registrations").select("id, email", { count: "exact" }).is("full_name", null),
  ]);
  return {
    exhibitorNullCount: exhibitors.count ?? 0,
    visitorNullCount: visitors.count ?? 0,
    exhibitorNullRows: exhibitors.data ?? [],
    visitorNullRows: visitors.data ?? [],
  };
}

async function tryNullInsert(table) {
  const email = `${tag}-${table}@test.local`;
  const payload =
    table === "exhibitor_applications"
      ? { id: randomUUID(), email, full_name: null, status: "new" }
      : { id: randomUUID(), email, full_name: null, status: "registered" };

  const { error } = await supabase.from(table).insert(payload);
  await supabase.from(table).delete().eq("email", email);
  return error;
}

async function main() {
  console.log("=== Migration 0011 readiness ===");
  const nulls = await countNullNames();
  console.log(`Exhibitor null full_name rows: ${nulls.exhibitorNullCount}`);
  if (nulls.exhibitorNullRows.length) {
    for (const row of nulls.exhibitorNullRows) {
      console.log(`  - ${row.id} (${row.email})`);
    }
  }
  console.log(`Visitor null full_name rows: ${nulls.visitorNullCount}`);

  if (nulls.exhibitorNullCount > 0 || nulls.visitorNullCount > 0) {
    console.log("\nNOT READY: resolve null rows (Step 1) before applying migration 0011.");
  } else {
    console.log("\nREADY: no null full_name rows — migration 0011 can be applied.");
  }

  console.log("\n=== Database constraint backstop (null insert probe) ===");
  for (const table of ["exhibitor_applications", "visitor_registrations"]) {
    const error = await tryNullInsert(table);
    if (!error) {
      console.log(`${table}: INSERT with null full_name SUCCEEDED (NOT NULL not enforced yet)`);
      continue;
    }
    const msg = `${error.code ?? ""} ${error.message}`.toLowerCase();
    if (msg.includes("not-null") || msg.includes("23502") || msg.includes("null value")) {
      console.log(`${table}: REJECTED null full_name (${error.code}: ${error.message})`);
    } else {
      console.log(`${table}: unexpected error (${error.code}: ${error.message})`);
    }
  }

  const migrationPath = new URL("../supabase/migrations/0011_exhibitor_visitor_name_not_null.sql", import.meta.url);
  console.log("\nMigration file present:", migrationPath.pathname);
  readFileSync(migrationPath, "utf8");
  console.log("Migration SQL loaded OK.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
