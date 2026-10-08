/**
 * Realtime self-heal test for AdminSidebar badge subscriptions.
 *
 * Simulates a transport drop (same class of failure as Fast Refresh / socket 1006),
 * waits through reconnect backoff without refreshing, then triggers a badge change
 * from a second context and checks the first session updates live.
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-realtime-reconnect.mjs
 *   node --env-file=.env.local scripts/test-realtime-reconnect.mjs --base http://localhost:3000
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { chromium } from "playwright";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const base = arg("base", process.env.TEST_BASE_URL || "http://localhost:3000");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createAdminSession(baseUrl) {
  const ref = new URL(url).hostname.split(".")[0];
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: users, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1 });
  if (usersError || !users.users[0]?.email) throw new Error("No admin user found.");

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: users.users[0].email,
  });
  if (linkError || !link.properties?.hashed_token) {
    throw new Error(linkError?.message ?? "Magic link generation failed.");
  }

  const { data: verified, error: verifyError } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError || !verified.session) {
    throw new Error(verifyError?.message ?? "Could not verify admin session.");
  }

  const session = verified.session;
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });
  const cookieName = `sb-${ref}-auth-token`;
  const cookieValue = `base64-${Buffer.from(payload).toString("base64url")}`;

  return {
    cookies: [
      {
        name: cookieName,
        value: cookieValue,
        domain: new URL(baseUrl).hostname,
        path: "/",
        sameSite: "Lax",
      },
    ],
  };
}

function visitorBadgeText(html) {
  const match = html.match(/Visitor Registrations[\s\S]{0,400}?(\d{1,3}|99\+)/i);
  return match ? match[1] : null;
}

async function readVisitorBadge(page) {
  return page.evaluate(() => {
    const link = [...document.querySelectorAll("a")].find((a) => a.getAttribute("href") === "/admin/visitors");
    if (!link) return null;
    const badge = link.querySelector("span.rounded-full");
    return badge?.textContent?.trim() ?? "0";
  });
}

async function waitForProbe(page, predicate, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const probe = await page.evaluate(() => window.__altfffSidebarRealtimeProbe ?? null);
    if (probe && predicate(probe)) return probe;
    await sleep(500);
  }
  throw new Error(`Timed out waiting for probe: ${label}`);
}

async function insertVisitorRegistration() {
  const email = `rt-probe-${randomUUID().slice(0, 8)}@example.com`;
  const res = await fetch(`${base}/api/visitor-registrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `rt-probe-${randomUUID()}`,
    },
    body: JSON.stringify({
      email,
      full_name: "Realtime Probe Visitor",
      phone: "+233241234567",
      form_render_token: "altfff-render-v1",
      form_mounted_at: String(Date.now()),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(`Visitor insert failed: HTTP ${res.status} ${JSON.stringify(json)}`);
  }
}

async function main() {
  console.log("Alt.FFF AdminSidebar Realtime self-heal test");
  console.log("Base URL:", base);

  const session = await createAdminSession(base);
  const browser = await chromium.launch({ headless: true });
  const sessionA = await browser.newContext();
  await sessionA.addCookies(session.cookies);
  const sessionB = await browser.newContext();
  const pageA = await sessionA.newPage();
  const pageB = await sessionB.newPage();

  const logsA = [];
  pageA.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[AdminSidebar]")) logsA.push(text);
  });

  try {
    console.log("\n1) Open session A on /admin (cookie auth, no manual refresh used later)…");
    await pageA.goto(`${base}/admin`, { waitUntil: "networkidle", timeout: 120_000 });

    await waitForProbe(pageA, (p) => p.subscribed === true, 30_000, "initial SUBSCRIBED");
    const badgeBefore = await readVisitorBadge(pageA);
    console.log("   Session A subscribed. Visitor badge before:", badgeBefore ?? "hidden/0");

    console.log("\n2) Drop Realtime transport (simulates dev socket 1006 / Fast Refresh blip)…");
    await pageA.evaluate(() => window.__altfffSidebarRealtimeProbe?.disconnectTransport());
    await waitForProbe(pageA, (p) => p.subscribed === false, 10_000, "channel dropped");
    console.log("   Channel dropped. Waiting up to 35s for self-heal (no refresh)…");

    await waitForProbe(pageA, (p) => p.subscribed === true, 35_000, "resubscribe after backoff");
    console.log("   Session A resubscribed.");
    console.log("   Sidebar console lines:", logsA.slice(-6));

    console.log("\n3) Session B submits a new visitor registration (triggers badge table)…");
    await insertVisitorRegistration();

    console.log("4) Poll session A badge for live update without refresh…");
    let liveUpdate = false;
    const target = badgeBefore && badgeBefore !== "0" ? Number(badgeBefore) + 1 : 1;
    for (let i = 0; i < 20; i++) {
      const current = await readVisitorBadge(pageA);
      if (current && current !== "0" && Number(current) >= target) {
        liveUpdate = true;
        console.log("   Badge updated live to:", current);
        break;
      }
      await sleep(500);
    }

    if (!liveUpdate) {
      const finalBadge = await readVisitorBadge(pageA);
      const finalProbe = await pageA.evaluate(() => window.__altfffSidebarRealtimeProbe ?? null);
      console.error("\nFAIL: Session A badge did not update without refresh.");
      console.error("   Final badge:", finalBadge, "| probe:", finalProbe);
      console.error("   Sidebar logs:", logsA);
      process.exit(1);
    }

    console.log("\nPASS: Reconnect self-healed and badge updated live with zero manual refresh.");
    console.log("Evidence:");
    console.log(" - Probe showed subscribed=false after disconnect, then subscribed=true after backoff");
    console.log(" - Console included resubscribe line:", logsA.some((l) => l.includes("subscribed")));
    console.log(" - Visitor badge incremented in session A after session B API submit");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
