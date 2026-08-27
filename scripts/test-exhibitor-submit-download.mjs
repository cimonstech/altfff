/**
 * Check whether submitting the exhibitor modal triggers a file download.
 * Usage: node scripts/test-exhibitor-submit-download.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { randomUUID } from "crypto";

const base = process.argv[2] ?? "http://localhost:3000";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const downloads = [];

page.on("download", (d) => {
  downloads.push(d.suggestedFilename());
});

await page.goto(`${base}/exhibiting`, { waitUntil: "networkidle", timeout: 120_000 });
await page.locator("#register button", { hasText: "Apply to exhibit" }).click();
await page.getByRole("dialog").waitFor({ timeout: 30_000 });
await page.locator('[role="dialog"] #email').waitFor({ state: "visible", timeout: 30_000 });

const email = `dl-test-${randomUUID().slice(0, 8)}@gmail.com`;
await page.locator('[role="dialog"] #email').fill(email);
await page.locator('[role="dialog"] #name').fill("Download Test");
await page.waitForTimeout(500);
const [response] = await Promise.all([
  page.waitForResponse((res) => res.url().includes("/api/exhibitor-applications"), { timeout: 30_000 }),
  page.locator('[role="dialog"] form button[type="submit"]').click(),
]);
const body = await response.json().catch(() => ({}));
console.log(`API status: ${response.status()}`, body.ok ? "ok" : body);

await page.waitForTimeout(8000);

const success = await page.getByText("Application received").count();
console.log(`Base: ${base}`);
console.log(`Success banner visible: ${success > 0}`);
console.log(`Downloads triggered: ${downloads.length ? downloads.join(", ") : "(none)"}`);
console.log(`Open pages after submit: ${context.pages().length}`);

await browser.close();
process.exit(downloads.length > 0 ? 1 : 0);
