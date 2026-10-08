/**
 * Compare live Supabase schema state (policies, columns, RLS, realtime,
 * indexes, constraints) against migrations 0001-0009.
 *
 * Requires migration 0010_schema_audit_rpc.sql applied (get_schema_audit_state RPC).
 *
 * Run: node --env-file=.env.local scripts/check-migrations.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { buildExpectedManifest, diffManifest } from "./lib/parse-migration-manifest.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exitCode = 1;
} else {
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function main() {
    console.log("Alt.FFF migration verification");
    console.log("Project:", url);
    console.log("Expected source: supabase/migrations/0001-0009\n");

    const expected = buildExpectedManifest();

    const { data, error } = await supabase.rpc("get_schema_audit_state");
    if (error) {
      if (error.message?.includes("get_schema_audit_state") || error.code === "PGRST202") {
        console.error(
          "RPC get_schema_audit_state not found. Apply supabase/migrations/0010_schema_audit_rpc.sql first.",
        );
      } else {
        console.error("RPC failed:", error.message);
      }
      return 2;
    }

    const issues = diffManifest(expected, data);

    console.log(`Expected policies: ${expected.policies.length}`);
    console.log(`Live policies:     ${(data.policies ?? []).length}`);
    console.log(`Expected tables:   ${expected.tables.length}`);
    console.log(`Live tables:       ${(data.tables ?? []).length}`);
    console.log(`Expected realtime: ${expected.realtime_tables.length}`);
    console.log(`Live realtime:     ${(data.realtime_tables ?? []).length}\n`);

    if (issues.length === 0) {
      console.log("PASS: Live schema matches migration manifest (0001-0009).");
      return 0;
    }

    console.error(`FAIL: ${issues.length} drift issue(s):\n`);
    const grouped = {};
    for (const issue of issues) {
      if (!grouped[issue.kind]) grouped[issue.kind] = [];
      grouped[issue.kind].push(issue.detail);
    }
    for (const [kind, details] of Object.entries(grouped)) {
      console.error(`  ${kind}:`);
      for (const d of details) console.error(`    - ${d}`);
    }
    return 1;
  }

  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 2;
    });
}
