/** Capture phone flag img-src CSP violations on public forms. */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const paths = ["/exhibiting", "/sponsorship", "/visit"];

const browser = await chromium.launch({ headless: true });

for (const path of paths) {
  const page = await browser.newPage();
  const consoleMsgs = [];
  const failedImages = [];

  page.on("console", (msg) => {
    const t = msg.text();
    if (/img-src|Refused to load the image|content security policy/i.test(t)) {
      consoleMsgs.push(`[${msg.type()}] ${t}`);
    }
  });
  page.on("response", (res) => {
    const url = res.url();
    if (/country-flag|purecatamphetamine|flag.*\.svg/i.test(url)) {
      failedImages.push({ url, status: res.status() });
    }
  });

  console.log(`\n=== ${base}${path} ===`);
  try {
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.evaluate(() => {
      const phone = document.querySelector(".PhoneInputCountryIcon, .alt-phone-input");
      phone?.scrollIntoView({ block: "center" });
    });
    await page.waitForSelector(".PhoneInputCountryIconImg", { timeout: 60_000 });
    await page.waitForTimeout(2000);

    const flagInfo = await page.evaluate(() => {
      const img = document.querySelector(".PhoneInputCountryIconImg");
      if (!img) return { found: false };
      if (img.tagName === "IMG") {
        return {
          found: true,
          tag: "IMG",
          src: img.getAttribute("src"),
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          complete: img.complete,
        };
      }
      return { found: true, tag: img.tagName, innerHTML: img.innerHTML.slice(0, 120) };
    });

    console.log("Flag element:", JSON.stringify(flagInfo));
    console.log("Flag network:", failedImages.length ? failedImages : "(no flag URL requests captured)");
    console.log("CSP console:", consoleMsgs.length ? consoleMsgs : "(none)");
  } catch (e) {
    console.error("FAILED:", e.message);
  }
  await page.close();
}

await browser.close();
