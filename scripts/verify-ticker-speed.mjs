/** Compare ticker scroll speed (px/s) between pages. */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const paths = ["/", "/news", "/exhibiting"];

async function measureSpeed(page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("div.overflow-hidden.bg-ink .flex.w-max")].some(
        (e) => e.offsetParent !== null,
      ),
    { timeout: 90000 },
  );
  await page.waitForTimeout(3000);
  const readX = () =>
    page.evaluate(() => {
      const els = [...document.querySelectorAll("div.overflow-hidden.bg-ink .flex.w-max")];
      const el = els.find((e) => e.offsetParent !== null) ?? els[0];
      if (!el) return null;
      const m = getComputedStyle(el).transform;
      if (!m || m === "none") return 0;
      return new DOMMatrix(m).m41;
    });
  const before = await readX();
  await page.waitForTimeout(3000);
  const after = await readX();
  if (before === null) return null;
  return Math.abs(after - before) / 3;
}

const browser = await chromium.launch({ headless: true });
const speeds = {};
for (const path of paths) {
  const page = await browser.newPage();
  console.log(`\n=== ${base}${path} ===`);
  try {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 180000 });
    const pxPerSec = await measureSpeed(page);
    speeds[path] = pxPerSec;
    console.log(`Ticker speed: ~${pxPerSec?.toFixed(1) ?? "n/a"} px/s`);
  } catch (e) {
    console.error("FAILED:", e.message);
  }
  await page.close();
}
if (speeds["/"] && speeds["/news"]) {
  const ratio = speeds["/news"] / speeds["/"];
  console.log(`\nNews vs home ratio: ${ratio.toFixed(2)}x (target ~1.0)`);
}
await browser.close();
