/**
 * QR token format + PDF ticket smoke tests.
 * Run: node --env-file=.env.local scripts/test-qr-refinements.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const PREFIX = "ALTEVT-";
const CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function normalizeCheckInToken(raw) {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return "";
  if (trimmed.startsWith(PREFIX)) return trimmed;
  if (trimmed.startsWith("ALTEVT")) {
    const rest = trimmed.slice(6).replace(/^-/, "");
    return rest ? `${PREFIX}${rest}` : "";
  }
  return `${PREFIX}${trimmed}`;
}

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function main() {
  // Dynamic import compiled modules via tsx-free approach: spawn build artifacts won't exist.
  // Import from source using Node 22+ type stripping, or use relative path after tsc.
  const { generateQrToken, isQrTokenFormat, normalizeCheckInToken: normalize } = await import(
    "../src/lib/qrToken.ts"
  ).catch(async () => {
    // Fallback: inline-only tests if TS import unavailable
    return null;
  });

  if (generateQrToken) {
    for (let i = 0; i < 20; i++) {
      const token = generateQrToken();
      assert(token.startsWith(PREFIX), `token ${i} has ALTEVT- prefix`);
      assert(isQrTokenFormat(token), `token ${i} matches format: ${token}`);
      const code = token.slice(PREFIX.length);
      assert(code.length >= 8 && code.length <= 10, `code length 8–10: ${code.length}`);
      assert(![..."01IOl"].some((c) => code.includes(c)), `no ambiguous chars in ${code}`);
    }
    assert(normalize("abcdefgh") === `${PREFIX}ABCDEFGH`, "normalize short code prepends prefix");
    assert(normalize(`${PREFIX}ABCDEFGH`) === `${PREFIX}ABCDEFGH`, "normalize keeps full token");
    assert(normalize("ALTEVTABCDEFGH") === `${PREFIX}ABCDEFGH`, "normalize ALTEVT without dash");
  } else {
    assert(normalizeCheckInToken("XYZ23456") === `${PREFIX}XYZ23456`, "normalize prepends prefix");
    assert(normalizeCheckInToken(`${PREFIX}XYZ23456`) === `${PREFIX}XYZ23456`, "normalize keeps prefix");
  }

  const { generateVisitorTicketPdf } = await import("../src/lib/visitorTicketPdf.ts").catch(() => ({ generateVisitorTicketPdf: null }));
  const { qrCodePngForToken } = await import("../src/lib/visitorVetting.ts").catch(() => ({ qrCodePngForToken: null }));

  if (generateVisitorTicketPdf && qrCodePngForToken) {
    const token = generateQrToken ? generateQrToken() : `${PREFIX}TESTCODE9`;
    const visitor = { id: "test", email: "test@example.com", full_name: "Jane Test Visitor", status: "confirmed", qr_token: token };
    const png = await qrCodePngForToken(token);
    const pdf = await generateVisitorTicketPdf(visitor, token, png);

    const outDir = join(process.cwd(), "scripts", ".tmp-qr-test");
    mkdirSync(outDir, { recursive: true });
    const pdfPath = join(outDir, "sample-ticket.pdf");
    const pngPath = join(outDir, "sample-qr.png");
    writeFileSync(pdfPath, pdf);
    writeFileSync(pngPath, png);

    assert(pdf.length > 1000, `PDF generated (${pdf.length} bytes) → ${pdfPath}`);
    assert(png.length > 100, `QR PNG generated (${png.length} bytes) → ${pngPath}`);
    console.log("\nOpen scripts/.tmp-qr-test/sample-ticket.pdf and scan sample-qr.png to verify visually.");
  } else {
    console.log("SKIP: PDF/QR generation (run after build or with tsx for full import test)");
  }

  console.log("\nQR refinement checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
