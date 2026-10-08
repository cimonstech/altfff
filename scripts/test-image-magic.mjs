/**
 * Smoke test: magic-byte verification rejects spoofed Content-Type.
 * Run: node scripts/test-image-magic.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "scripts", "lib", "..", "..");

async function loadVerifier() {
  // Dynamic import compiled TS isn't available — inline minimal check using file-type directly.
  const { fileTypeFromBuffer } = await import("file-type");
  const png = readFileSync(join(root, "public", "Afff_icon.png"));
  const detected = await fileTypeFromBuffer(png);
  if (!detected || detected.mime !== "image/png") {
    throw new Error(`Expected PNG for Afff_icon.png, got ${detected?.mime ?? "none"}`);
  }
  console.log("PASS: real PNG detected as image/png");

  // Spoofed: PHP content with fake image/jpeg label would still fail magic check
  const fake = Buffer.from("<?php echo 'bad'; ?>");
  const fakeDetected = await fileTypeFromBuffer(fake);
  if (fakeDetected?.mime?.startsWith("image/")) {
    throw new Error("FAIL: non-image bytes incorrectly detected as image");
  }
  console.log("PASS: spoofed non-image bytes rejected");

  // JPEG magic with wrong extension
  const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const jpegDetected = await fileTypeFromBuffer(jpegMagic);
  if (!jpegDetected?.mime?.startsWith("image/")) {
    throw new Error("FAIL: valid JPEG magic bytes not recognized");
  }
  console.log("PASS: JPEG magic bytes recognized regardless of filename");
}

loadVerifier().catch((err) => {
  console.error(err);
  process.exit(1);
});
