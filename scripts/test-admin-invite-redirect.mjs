/**
 * Diagnose admin invite redirect_to — does NOT send email unless --send is passed.
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-admin-invite-redirect.mjs
 *   node --env-file=.env.local scripts/test-admin-invite-redirect.mjs --send you@example.com
 */
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const SITE_URL_CANONICAL = "https://www.altfff.com";

function getSiteUrlFromEnv() {
  const fromEnv = process.env.SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production") {
    return SITE_URL_CANONICAL;
  }

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    return `https://${vercelHost}`.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

async function probeRedirect(label, redirectTo, { expectMatch = true } = {}) {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testEmail = `invite-redirect-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: testEmail,
    options: { redirectTo, data: { full_name: "Redirect Test" } },
  });

  if (error) {
    throw new Error(`${label}: generateLink failed — ${error.message}`);
  }

  const actionLink = data?.properties?.action_link;
  const parsedRedirect = actionLink ? new URL(actionLink).searchParams.get("redirect_to") : null;
  const matched = parsedRedirect === redirectTo;

  console.log(`\n=== ${label} ===`);
  console.log("redirectTo sent:   ", redirectTo);
  console.log("redirect_to in link:", parsedRedirect);

  if (expectMatch) {
    if (!matched) {
      throw new Error(`${label}: expected redirect_to=${redirectTo}, got ${parsedRedirect}`);
    }
    console.log("result: PASS");
    return;
  }

  if (matched) {
    throw new Error(`${label}: expected mismatch but redirect_to matched`);
  }
  console.log("result: PASS (expected mismatch — documents Supabase fallback behaviour)");
}

console.log("=== Admin invite redirect diagnostic ===");
console.log("Supabase project:", url);
console.log("SITE_URL env:", process.env.SITE_URL ?? "(unset)");
console.log("NODE_ENV:", process.env.NODE_ENV ?? "(unset)");
console.log("getSiteUrl() from env:", getSiteUrlFromEnv());

// Reproduces the production bug when SITE_URL is missing on a deployed build.
await probeRedirect(
  "Broken: localhost redirect (what production was sending)",
  "http://localhost:3000/admin/set-password",
  { expectMatch: false },
);

// What production should send after the getSiteUrl() fix (or with SITE_URL set).
await probeRedirect(
  "Fixed: canonical production redirect",
  `${SITE_URL_CANONICAL}/admin/set-password`,
);

const sendEmail = arg("send");
if (sendEmail) {
  const siteUrl =
    process.env.NODE_ENV === "production" && !process.env.SITE_URL?.trim()
      ? SITE_URL_CANONICAL
      : getSiteUrlFromEnv();
  const redirectTo = `${siteUrl}/admin/set-password`;

  console.log(`\n--send: calling inviteUserByEmail for ${sendEmail}`);
  console.log("redirectTo:", redirectTo);

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(sendEmail, {
    data: { full_name: "Redirect Test" },
    redirectTo,
  });
  if (inviteError) {
    console.error("inviteUserByEmail failed:", inviteError.message);
    process.exit(1);
  }
  console.log("Invite email sent — decode redirect_to in the verify link and click through.");
} else {
  console.log("\nNo email sent (pass --send email@example.com to send a real invite).");
}

console.log("\nAll redirect checks passed.");
