/**
 * Create check-in staff auth accounts (checkin1@ … checkin5@) with a shared password.
 *
 * Run:
 *   node --env-file=.env.local scripts/create-checkin-staff-accounts.mjs
 *   node --env-file=.env.local scripts/create-checkin-staff-accounts.mjs --execute
 *
 * Without --execute, prints what would be created (dry run).
 */
import { createClient } from "@supabase/supabase-js";

const DEFAULT_PASSWORD = "*altfff2026";
const DOMAIN = "altfff.com";
const COUNT = 5;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const execute = process.argv.includes("--execute");
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function staffEmail(n) {
  return `checkin${n}@${DOMAIN}`;
}

function staffName(n) {
  return `Check-in Staff ${n}`;
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

async function ensureStaffAccount(n) {
  const email = staffEmail(n);
  const fullName = staffName(n);
  const existing = await findUserByEmail(email);

  if (!execute) {
    console.log(`[dry run] ${existing ? "update" : "create"} ${email} (${fullName}) role=checkin_staff`);
    return { email, fullName, action: existing ? "update" : "create" };
  }

  let userId;
  if (existing) {
    userId = existing.id;
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    console.log(`Updated ${email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) throw error ?? new Error(`createUser returned no user for ${email}`);
    userId = data.user.id;
    console.log(`Created ${email}`);
  }

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("admin_profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (existingProfileError) throw existingProfileError;

  if (existingProfile) {
    const { error: roleError } = await admin
      .from("admin_profiles")
      .update({ role: "checkin_staff", full_name: fullName })
      .eq("id", userId);
    if (roleError) throw roleError;
  } else {
    const { error: insertError } = await admin.from("admin_profiles").insert({
      id: userId,
      role: "checkin_staff",
      full_name: fullName,
    });
    if (insertError) throw insertError;
  }

  const { data: profile, error: profileError } = await admin
    .from("admin_profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .single();
  if (profileError) throw profileError;
  if (profile.role !== "checkin_staff") {
    throw new Error(`${email}: expected role checkin_staff, got ${profile.role}`);
  }

  return { email, fullName, action: existing ? "updated" : "created" };
}

async function main() {
  console.log(`Alt.FFF check-in staff accounts (${execute ? "EXECUTE" : "dry run"})`);
  console.log(`Password: ${DEFAULT_PASSWORD}`);
  console.log("");

  const results = [];
  for (let n = 1; n <= COUNT; n++) {
    results.push(await ensureStaffAccount(n));
  }

  console.log("");
  console.log("Accounts:");
  for (let n = 1; n <= COUNT; n++) {
    console.log(`  ${staffEmail(n)}  /  ${DEFAULT_PASSWORD}`);
  }

  if (!execute) {
    console.log("\nDry run only. Re-run with --execute to apply.");
  } else {
    console.log(`\nDone — ${results.length} account(s) ready. Sign in at /admin/login`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
