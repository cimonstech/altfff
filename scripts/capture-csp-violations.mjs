/**
 * One-off: load public pages and collect CSP / console errors.
 * Usage: node scripts/capture-csp-violations.mjs [baseUrl]
 */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const paths = ["/", "/about", "/exhibiting"];

const browser = await chromium.launch({ headless: true });

for (const path of paths) {
  const page = await browser.newPage();
  const messages = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (/content security policy|csp|refused to/i.test(text) || msg.type() === "error") {
      messages.push({ type: msg.type(), text });
    }
  });
  page.on("pageerror", (err) => messages.push({ type: "pageerror", text: err.message }));

  const url = `${base}${path}`;
  console.log(`\n=== ${url} ===`);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.waitForTimeout(4000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    const stats = await page.evaluate(() =>
      [...document.querySelectorAll("[data-count]")].map((el) => ({
        count: el.getAttribute("data-count"),
        text: el.textContent,
      })),
    );
    const navClip = await page.evaluate(() => {
      const bar = document.querySelector("header");
      if (!bar) return null;
      const s = getComputedStyle(bar);
      return { clipPath: s.clipPath, transform: s.transform };
    });

    console.log("CSP/GSAP errors:");
    if (messages.length === 0) console.log("  (none)");
    else messages.forEach((m) => console.log(`  [${m.type}] ${m.text}`));
    console.log("Stats:", JSON.stringify(stats));
    console.log("Nav:", JSON.stringify(navClip));
  } catch (e) {
    console.error("FAILED:", e.message);
  }
  await page.close();
}

await browser.close();
