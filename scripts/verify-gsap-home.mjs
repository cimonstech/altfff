/** Post-fix GSAP + CSP verification on a single page. */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3010/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const cspErrors = [];

page.on("pageerror", (err) => {
  if (/content security policy|unsafe-eval|refused to/i.test(err.message)) cspErrors.push(err.message);
});
page.on("console", (msg) => {
  const t = msg.text();
  if (/content security policy|unsafe-eval|refused to evaluate/i.test(t)) cspErrors.push(t);
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.waitForTimeout(8000);
await page.evaluate(() => {
  const el = document.querySelector("[data-count]");
  el?.scrollIntoView({ block: "center" });
  window.scrollBy(0, window.innerHeight);
});
await page.waitForTimeout(3000);

const stats = await page.evaluate(() =>
  [...document.querySelectorAll("[data-count]")].map((el) => ({
    count: el.getAttribute("data-count"),
    text: el.textContent,
  })),
);
const nav = await page.evaluate(() => {
  const bar = document.querySelector("header");
  if (!bar) return null;
  const s = getComputedStyle(bar);
  return { clipPath: s.clipPath, transform: s.transform };
});
const tickerOverflow = await page.evaluate(() => {
  const t = document.querySelector("[aria-hidden].overflow-hidden");
  if (!t) return null;
  const r = t.getBoundingClientRect();
  return { width: r.width, scrollWidth: t.scrollWidth, overflow: getComputedStyle(t).overflow };
});

console.log("URL:", url);
console.log("CSP violations:", cspErrors.length ? cspErrors : "(none)");
console.log("Stats after scroll:", JSON.stringify(stats));
console.log("Nav:", JSON.stringify(nav));
console.log("Ticker:", JSON.stringify(tickerOverflow));

await browser.close();
