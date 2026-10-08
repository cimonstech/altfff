/**
 * Email domain MX validation + typo suggestion checks.
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-email-domain-validation.mjs
 *   node --env-file=.env.local scripts/test-email-domain-validation.mjs --base http://localhost:3000
 */
import { randomUUID } from "crypto";
import { spawnSync } from "child_process";

const args = process.argv.slice(2);

function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const base = arg("base", process.env.TEST_BASE_URL || "http://localhost:3000");

function botFields() {
  return {
    form_render_token: "altfff-render-v1",
    form_mounted_at: String(Date.now()),
  };
}

async function postContact(email) {
  return fetch(`${base}/api/contact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `email-domain-test-${randomUUID()}`,
    },
    body: JSON.stringify({
      firstName: "MX",
      lastName: "Test",
      email,
      message: "Email domain validation test.",
      ...botFields(),
    }),
  });
}

function runUnitTests() {
  const result = spawnSync("npx", ["tsx", "scripts/test-email-domain-validation-unit.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error("Unit tests failed");
  }
  return result.stdout || "";
}

async function main() {
  console.log("Alt.FFF email domain validation tests\n");

  console.log("1–4) Unit tests (MX reject/pass, fail-open, typo suggestion)");
  const unitOut = runUnitTests();
  console.log(unitOut.trim().split("\n").map((l) => `   ${l}`).join("\n"));
  console.log("   PASS\n");

  console.log("5) API: POST /api/contact with yshoo.vom is rejected");
  const badRes = await postContact("ugochukwuhapiness@yshoo.vom");
  const badJson = await badRes.json().catch(() => ({}));
  console.log("   HTTP", badRes.status, badJson.error ?? badJson);
  if (badRes.status !== 400 || badJson.ok !== false) {
    process.exit(1);
  }
  console.log("   PASS");

  console.log("6) API: POST /api/contact with genuine domain succeeds");
  const goodEmail = `mx-test-${randomUUID().slice(0, 8)}@gmail.com`;
  const start = Date.now();
  const goodRes = await postContact(goodEmail);
  const elapsed = Date.now() - start;
  const goodJson = await goodRes.json().catch(() => ({}));
  console.log("   HTTP", goodRes.status, goodJson.ok ? "ok" : goodJson, `(${elapsed}ms)`);
  if (!goodRes.ok || !goodJson.ok) {
    process.exit(1);
  }
  if (elapsed > 8000) {
    console.error("FAIL: submission took too long — check MX timeout");
    process.exit(1);
  }
  console.log("   PASS");

  console.log("\nAll email domain validation checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
