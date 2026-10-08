/**
 * Verify LinkedIn Insight Tag loads under CSP on public pages and is absent on /admin.
 * Usage: node scripts/verify-linkedin-csp.mjs [baseUrl]
 */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";

async function check(browser, path, expectLinkedIn) {
  const page = await browser.newPage();
  const cspErrors = [];
  const linkedInRequests = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (/content security policy|csp|refused to/i.test(text)) {
      cspErrors.push(text);
    }
  });
  page.on("request", (req) => {
    const url = req.url();
    if (/licdn\.com|ads\.linkedin\.com/.test(url)) {
      linkedInRequests.push(url);
    }
  });

  const res = await page.goto(`${base}${path}`, { waitUntil: "load", timeout: 120_000 });

  if (expectLinkedIn) {
    await page.waitForFunction(
      () =>
        typeof window.lintrk === "function" &&
        [...document.scripts].some((s) =>
          s.src.includes("snap.licdn.com/li.lms-analytics/insight.min.js"),
        ),
      { timeout: 30_000 },
    );
    await page.waitForTimeout(2000);
  } else {
    await page.waitForTimeout(5000);
  }

  const cspHeader = res?.headers()["content-security-policy"] ?? "";
  const hasLinkedInCsp =
    /snap\.licdn\.com/.test(cspHeader) && /px\.ads\.linkedin\.com/.test(cspHeader);
  const hasInsightScript = await page.evaluate(() =>
    [...document.scripts].some((s) => s.src.includes("snap.licdn.com/li.lms-analytics/insight.min.js")),
  );
  const initScriptCount = await page.evaluate(
    () => document.querySelectorAll('script[id^="linkedin-insight"]').length,
  );
  const lintrkDefined = await page.evaluate(() => typeof window.lintrk === "function");

  console.log(`\n=== ${path} (expectLinkedIn=${expectLinkedIn}) ===`);
  console.log("CSP header includes LinkedIn domains:", hasLinkedInCsp);
  console.log(
    "LinkedIn network requests:",
    linkedInRequests.length ? linkedInRequests.slice(0, 5) : "(none)",
  );
  console.log("insight.min.js in DOM:", hasInsightScript);
  console.log("Next linkedin-insight scripts:", initScriptCount);
  console.log("window.lintrk defined:", lintrkDefined);
  console.log("CSP console violations:", cspErrors.length ? cspErrors : "(none)");

  const ok = expectLinkedIn
    ? hasLinkedInCsp &&
      hasInsightScript &&
      initScriptCount >= 2 &&
      lintrkDefined &&
      linkedInRequests.length > 0 &&
      cspErrors.length === 0
    : initScriptCount === 0 &&
      !hasInsightScript &&
      linkedInRequests.length === 0 &&
      cspErrors.length === 0;

  console.log("RESULT:", ok ? "PASS" : "FAIL");
  await page.close();
  return ok;
}

const browser = await chromium.launch({ headless: true });
const publicOk = await check(browser, "/", true);
const adminOk = await check(browser, "/admin/login", false);
await browser.close();

if (!publicOk || !adminOk) {
  process.exit(1);
}

console.log("\nAll LinkedIn CSP checks passed.");
