/**
 * Verify duplicate-email guards and declined re-application allowance.
 * Run: node --env-file=.env.local scripts/test-registration-guards.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const tag = `guard-test-${Date.now()}`;
/** Fresh rate-limit bucket per run (Upstash keys on IP; node fetch otherwise shares "unknown"). */
const testClientIp = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

async function cleanupVisitor(id) {
  if (id) await supabase.from("visitor_registrations").delete().eq("id", id);
}
async function cleanupExhibitor(id) {
  if (id) await supabase.from("exhibitor_applications").delete().eq("id", id);
}

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function botFields() {
  return {
    form_render_token: "altfff-render-v1",
    form_mounted_at: String(Date.now() - 5000),
    form_token_hp: "",
  };
}

async function postJson(path, body, clientIp = testClientIp) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": clientIp,
    },
    body: JSON.stringify({ ...botFields(), ...body }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  const visitorEmail = `${tag}-visitor@test.local`;
  const exhibitorEmail = `${tag}-exhibitor@test.local`;
  let visitorId = null;
  let exhibitorId = null;

  try {
    // 1) Parallel duplicate POSTs — run first while rate-limit budget is fresh
    const raceEmail = `${tag}-race@test.local`;
    const raceBody = {
      email: raceEmail,
      full_name: "Race Visitor",
    };
    const [r1, r2] = await Promise.all([
      postJson("/api/visitor-registrations", raceBody),
      postJson("/api/visitor-registrations", raceBody),
    ]);
    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    assert(
      statuses[0] === 200 && statuses[1] === 409,
      `parallel visitor submits: one 200 one 409 (got ${statuses.join(",")})`,
    );
    const { count: raceCount } = await supabase
      .from("visitor_registrations")
      .select("id", { count: "exact", head: true })
      .eq("email", raceEmail);
    assert(raceCount === 1, `parallel visitor submits created exactly one row (${raceCount})`);
    await supabase.from("visitor_registrations").delete().eq("email", raceEmail);

    // 2) First visitor submission succeeds
    const v1 = await postJson("/api/visitor-registrations", {
      email: visitorEmail,
      full_name: "Guard Test Visitor",
    });
    assert(v1.status === 200 && v1.json.ok, `first visitor submit (${v1.status})`);

    const { data: vRow } = await supabase
      .from("visitor_registrations")
      .select("id")
      .eq("email", visitorEmail)
      .single();
    visitorId = vRow?.id ?? null;

    // 3) Duplicate visitor blocked
    const v2 = await postJson("/api/visitor-registrations", {
      email: visitorEmail,
      full_name: "Guard Test Visitor Again",
    });
    assert(v2.status === 409, `duplicate visitor blocked with 409 (${v2.status})`);
    assert(
      String(v2.json.error || "").includes("already registered"),
      "duplicate visitor message present",
    );

    // 4) Declined visitor can re-register
    if (visitorId) {
      await supabase.from("visitor_registrations").update({ status: "declined" }).eq("id", visitorId);
    }
    const v3 = await postJson("/api/visitor-registrations", {
      email: visitorEmail,
      full_name: "Guard Test Visitor Reapply",
    });
    assert(v3.status === 200 && v3.json.ok, `declined visitor re-register allowed (${v3.status})`);

    // 5) First exhibitor succeeds
    const e1 = await postJson("/api/exhibitor-applications", {
      email: exhibitorEmail,
      name: "Guard Test Exhibitor",
    });
    assert(e1.status === 200 && e1.json.ok, `first exhibitor submit (${e1.status})`);

    const { data: eRow } = await supabase
      .from("exhibitor_applications")
      .select("id")
      .eq("email", exhibitorEmail)
      .single();
    exhibitorId = eRow?.id ?? null;

    // 6) Duplicate exhibitor blocked
    const e2 = await postJson("/api/exhibitor-applications", {
      email: exhibitorEmail,
      name: "Guard Test Exhibitor Again",
    });
    assert(e2.status === 409, `duplicate exhibitor blocked with 409 (${e2.status})`);

    // 7) Cancelled exhibitor can re-apply
    if (exhibitorId) {
      await supabase.from("exhibitor_applications").update({ status: "cancelled" }).eq("id", exhibitorId);
    }
    const e3 = await postJson("/api/exhibitor-applications", {
      email: exhibitorEmail,
      name: "Guard Test Exhibitor Reapply",
    });
    assert(e3.status === 200 && e3.json.ok, `cancelled exhibitor re-apply allowed (${e3.status})`);

    // 8) Exhibitor without name rejected
    const eNoName = await postJson("/api/exhibitor-applications", {
      email: `${tag}-noname@test.local`,
    });
    assert(eNoName.status === 400, `exhibitor without name rejected (${eNoName.status})`);
  } finally {
    await supabase.from("visitor_registrations").delete().eq("email", visitorEmail);
    await supabase.from("exhibitor_applications").delete().eq("email", exhibitorEmail);
  }

  console.log("\nAll registration guard tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
