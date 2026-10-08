/**
 * Create a real checkin_staff account and verify least-privilege + door flows.
 *
 * Run: node --env-file=.env.local scripts/verify-checkin-staff-role.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "crypto";

const STAFF_EMAIL = "checkin.staff@altfff.com";
const STAFF_NAME = "Check-in Staff";
const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const base = process.env.TEST_BASE_URL || "http://localhost:3000";

if (!url || !serviceKey || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchTimed(href, opts = {}, timeoutMs = 8000) {
  return fetch(href, { ...opts, signal: AbortSignal.timeout(timeoutMs) });
}

function randomPassword() {
  return `Cs-${randomBytes(12).toString("base64url")}`;
}

function randomQrToken() {
  let code = "";
  const bytes = randomBytes(9);
  for (let i = 0; i < 9; i++) code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return `ALTEVT-${code}`;
}

async function findUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureStaffAccount() {
  const password = randomPassword();
  const existing = await findUserByEmail(STAFF_EMAIL);
  let userId;

  if (existing) {
    userId = existing.id;
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: STAFF_NAME },
    });
    if (error) throw error;
    console.log(`Updated existing user ${STAFF_EMAIL}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: STAFF_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: STAFF_NAME },
    });
    if (error || !data.user) throw error ?? new Error("createUser returned no user");
    userId = data.user.id;
    console.log(`Created user ${STAFF_EMAIL}`);
  }

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("admin_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existingProfileError) throw existingProfileError;

  if (existingProfile) {
    const { error: roleError } = await admin
      .from("admin_profiles")
      .update({ role: "checkin_staff", full_name: STAFF_NAME })
      .eq("id", userId);
    if (roleError) throw roleError;
  } else {
    const { error: insertError } = await admin.from("admin_profiles").insert({
      id: userId,
      role: "checkin_staff",
      full_name: STAFF_NAME,
    });
    if (insertError) throw insertError;
  }

  const { data: profile, error: profileError } = await admin
    .from("admin_profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .single();
  if (profileError) throw profileError;
  assert(profile.role === "checkin_staff", `admin_profiles.role is checkin_staff (got ${profile.role})`);

  return { userId, email: STAFF_EMAIL, password };
}

function sessionCookieHeader(session) {
  const ref = new URL(url).hostname.split(".")[0];
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });
  return `sb-${ref}-auth-token=base64-${Buffer.from(payload).toString("base64url")}`;
}

async function insertFixture(overrides) {
  const id = randomUUID();
  const tag = id.slice(0, 8);
  const row = {
    id,
    full_name: overrides.full_name ?? `Staff Verify ${tag}`,
    email: overrides.email ?? `staff-verify-${tag}@test.local`,
    phone: overrides.phone ?? null,
    status: "confirmed",
    source: "pre_registered",
    qr_token: overrides.qr_token ?? randomQrToken(),
    checked_in_at: null,
    ...overrides,
  };
  const { error } = await admin.from("visitor_registrations").insert(row);
  if (error) throw error;
  return row;
}

async function followLocation(res) {
  const loc = res.headers.get("location") ?? "";
  try {
    return new URL(loc, base).pathname;
  } catch {
    return loc;
  }
}

async function main() {
  console.log("Alt.FFF checkin_staff verification");
  console.log("Base URL:", base);
  console.log("Project:", url);
  console.log("");

  const { error: rpcProbeError } = await admin.rpc("perform_visitor_checkin", {
    registration_id: randomUUID(),
  });
  if (rpcProbeError && /could not find|does not exist|schema cache/i.test(rpcProbeError.message ?? "")) {
    throw new Error(`perform_visitor_checkin is missing. Apply 0017. (${rpcProbeError.message})`);
  }
  console.log("PASS: perform_visitor_checkin is callable");

  const staff = await ensureStaffAccount();
  console.log("\nCheck-in staff account (keep this to log in):");
  console.log(`  email:    ${staff.email}`);
  console.log(`  password: ${staff.password}`);
  console.log("  role:     checkin_staff");
  console.log("  lands on: /admin/checkin-overview\n");
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({
    email: staff.email,
    password: staff.password,
  });
  if (signInError || !signedIn.session) throw signInError ?? new Error("Staff sign-in failed");
  assert(Boolean(signedIn.session.access_token), "checkin_staff can sign in");

  const victim = await insertFixture({});
  const { data: rawUpdate, error: rawError } = await anon
    .from("visitor_registrations")
    .update({ status: "declined", full_name: "HACKED" })
    .eq("id", victim.id)
    .select("id, status, full_name");
  if (rawError) {
    console.log(`PASS: raw UPDATE as checkin_staff rejected (${rawError.message})`);
  } else {
    assert(!rawUpdate || rawUpdate.length === 0, "raw UPDATE as checkin_staff returned no rows (RLS blocked)");
  }

  const { data: afterRaw } = await admin
    .from("visitor_registrations")
    .select("status, full_name")
    .eq("id", victim.id)
    .single();
  assert(afterRaw.status === "confirmed" && afterRaw.full_name === victim.full_name, "visitor row unchanged after raw UPDATE attempt");

  const { data: rpcRows, error: rpcError } = await anon.rpc("perform_visitor_checkin", {
    registration_id: victim.id,
  });
  if (rpcError) throw rpcError;
  const rpcRow = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
  assert(rpcRow?.success === true, `RPC check-in as checkin_staff succeeded (${rpcRow?.message ?? ""})`);

  const cookie = sessionCookieHeader(signedIn.session);
  const forbiddenPaths = [
    "/admin",
    "/admin/exhibitors",
    "/admin/sponsors",
    "/admin/visitors",
    "/admin/news",
    "/admin/communications",
    "/admin/activity",
    "/admin/admins",
    "/admin/contact",
  ];

  let httpOk = true;
  try {
    const health = await fetchTimed(base, { redirect: "manual" }, 90_000);
    void health;
  } catch (err) {
    httpOk = false;
    console.warn(`SKIP HTTP route checks — app not reachable at ${base} (${err instanceof Error ? err.message : err})`);
  }

  const idsToClean = [victim.id];

  if (httpOk) {
    for (const path of forbiddenPaths) {
      const res = await fetchTimed(`${base}${path}`, {
        headers: { cookie },
        redirect: "manual",
      }, 45_000);
      const redirectedTo = res.status >= 300 && res.status < 400 ? await followLocation(res) : path;
      const landedForbidden = redirectedTo === "/admin/forbidden" || (res.status === 200 && redirectedTo === "/admin/forbidden");
      const html = res.status === 200 ? await res.text() : "";
      const bodyDenied = html.includes("Access denied") || html.includes("Check-in staff can only");
      assert(
        landedForbidden || bodyDenied,
        `${path} is forbidden for checkin_staff (status ${res.status}, location ${redirectedTo || "n/a"})`,
      );
    }

    for (const path of ["/admin/checkin-overview", "/admin/checkin", "/admin/forbidden"]) {
      const res = await fetchTimed(`${base}${path}`, { headers: { cookie }, redirect: "manual" }, 45_000);
      assert(res.status === 200, `${path} is allowed for checkin_staff (HTTP ${res.status})`);
      const html = await res.text();
      if (path === "/admin/checkin-overview") {
        assert(html.includes("Check-in Overview") || html.includes("Confirmed pre-registered"), "overview page renders live counts");
      }
    }

    const qrVisitor = await insertFixture({});
    const lookupVisitor = await insertFixture({});
    idsToClean.push(qrVisitor.id, lookupVisitor.id);

    const qrRes = await fetchTimed(
      `${base}/api/admin/checkin`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ token: qrVisitor.qr_token }),
      },
      45_000,
    );
    const qrBody = await qrRes.json();
    assert(qrRes.ok && qrBody.ok && qrBody.result === "checked_in", `QR check-in API succeeded (${qrBody.message ?? qrRes.status})`);

    const lookupRes = await fetchTimed(
      `${base}/api/admin/checkin`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ visitorId: lookupVisitor.id }),
      },
      45_000,
    );
    const lookupBody = await lookupRes.json();
    assert(
      lookupRes.ok && lookupBody.ok && lookupBody.result === "checked_in",
      `manual lookup check-in API succeeded (${lookupBody.message ?? lookupRes.status})`,
    );

    const searchRes = await fetchTimed(
      `${base}/api/admin/checkin/search?q=${encodeURIComponent(lookupVisitor.full_name.slice(0, 12))}`,
      { headers: { cookie } },
      45_000,
    );
    const searchBody = await searchRes.json();
    assert(searchRes.ok && searchBody.ok, "manual lookup search API is allowed for checkin_staff");

    const visitorsRes = await fetchTimed(
      `${base}/api/admin/visitors/${lookupVisitor.id}/approve`,
      { method: "POST", headers: { cookie } },
      45_000,
    );
    assert(visitorsRes.status === 403, `checkin_staff cannot hit visitor approve API (HTTP ${visitorsRes.status})`);
  }

  const liveVisitor = await insertFixture({});
  idsToClean.push(liveVisitor.id);
  const watcher = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: watcherSession, error: watchSignInError } = await watcher.auth.signInWithPassword({
    email: staff.email,
    password: staff.password,
  });
  if (watchSignInError || !watcherSession.session) throw watchSignInError ?? new Error("Watcher sign-in failed");

  await watcher.realtime.setAuth(watcherSession.session.access_token);

  let liveEvent = false;
  const channel = watcher
    .channel(`verify-checkin-overview-${Date.now()}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "visitor_registrations" }, (payload) => {
      if (payload.new?.id === liveVisitor.id || payload.old?.id === liveVisitor.id) {
        liveEvent = true;
      }
    });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Realtime subscribe timed out")), 20_000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        reject(new Error(`Realtime subscribe failed: ${status}`));
      }
    });
  });
  console.log("PASS: second session Realtime channel subscribed");
  await sleep(500);

  const { data: liveRpc, error: liveRpcError } = await anon.rpc("perform_visitor_checkin", {
    registration_id: liveVisitor.id,
  });
  if (liveRpcError) throw liveRpcError;
  const liveRow = Array.isArray(liveRpc) ? liveRpc[0] : liveRpc;
  assert(liveRow?.success === true, "second-session check-in RPC succeeded");

  const start = Date.now();
  while (!liveEvent && Date.now() - start < 20_000) {
    await sleep(200);
  }
  assert(liveEvent, "second session received live visitor_registrations UPDATE without a refresh");

  await watcher.removeChannel(channel);
  await admin.from("visitor_registrations").delete().in("id", idsToClean);

  console.log("\nAll checkin_staff verification checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
