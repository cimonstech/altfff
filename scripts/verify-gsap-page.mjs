/** Post-fix CSP check + GSAP signal on a given path. */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3010";
const path = process.argv[3] ?? "/about";
const url = `${base}${path}`;
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
await page.waitForTimeout(5000);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2000);

const nav = await page.evaluate(() => {
  const bar = document.querySelector("header");
  if (!bar) return null;
  const s = getComputedStyle(bar);
  return { clipPath: s.clipPath.slice(0, 40), hasPath: s.clipPath.includes("path(") };
});

const gsapReveal = await page.evaluate((pagePath) => {
  const sel =
    pagePath === "/about"
      ? ".about-intro-line, .about-hero-in"
      : pagePath === "/exhibiting"
        ? ".register-in, .reason-card"
        : "[data-count]";
  const els = [...document.querySelectorAll(sel)].slice(0, 3);
  return els.map((el) => ({
    tag: el.className,
    opacity: getComputedStyle(el).opacity,
    transform: getComputedStyle(el).transform,
  }));
}, path);

console.log("URL:", url);
console.log("CSP violations:", cspErrors.length ? cspErrors : "(none)");
console.log("Nav chamfer:", JSON.stringify(nav));
console.log("GSAP targets:", JSON.stringify(gsapReveal));

await browser.close();
