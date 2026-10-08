// Shared bot-protection contract - field names, the expected JS token, and
// the server-side evaluation logic all live here, imported by BOTH the
// client component (src/components/BotProtection.tsx) and the four public
// API routes, so the two sides can never drift apart. No "use client"
// directive and no React here - this must stay importable from route
// handlers.
//
// HISTORY: two generations of classic honeypot ("hidden text field must be
// empty") both caught real humans. Gen 1 used real-word field names
// ("website"/"company") that browser autofill filled. Gen 2 renamed the
// field to a meaningless token with autocomplete="off" - and a real user's
// form-filler browser extension STILL filled it (confirmed via the
// server-side [honeypot] log; autocomplete="off" is advisory in Chrome and
// ignored outright by many extensions). Conclusion: an empty-decoy check is
// unreliable as a hard signal against real-world browsers. This module
// replaces it with combined signals:
//
//   A. JS-set token (JS_TOKEN_FIELD_NAME, readOnly input): starts empty in
//      the raw HTML and is populated to JS_TOKEN_VALUE by React state a
//      tick after mount. The server REQUIRES it - a crude bot POSTing the
//      raw form or scripting the endpoint without executing the page won't
//      have it. readOnly matters: extensions and autofill do not write to
//      readOnly inputs, so nothing can corrupt it for humans.
//   B. The decoy (DECOY_FIELD_NAME, NOT readOnly - that's the bait) is
//      demoted to a soft signal: filled + valid token = the known
//      autofill/extension false-positive, ACCEPT and log; filled + missing
//      token = genuine bot signature, drop.
//   C. Minimum-time: MOUNT_TIME_FIELD_NAME (readOnly, JS-set) records when
//      the form mounted; arriving under MIN_SUBMIT_MS is treated as a bot
//      signal only in COMBINATION with the filled decoy, never alone (and
//      negative elapsed - client clock ahead of server - is ignored, clock
//      skew must never contribute to rejecting a human).

export const JS_TOKEN_FIELD_NAME = "form_render_token";
export const JS_TOKEN_VALUE = "altfff-render-v1";
export const DECOY_FIELD_NAME = "form_token_hp";
export const MOUNT_TIME_FIELD_NAME = "form_mounted_at";
export const MIN_SUBMIT_MS = 2000;

export type BotVerdict = {
  verdict: "accept" | "accept_with_warning" | "reject";
  reason: string;
};

export function evaluateBotSignals(body: Record<string, unknown>): BotVerdict {
  const tokenRaw = body[JS_TOKEN_FIELD_NAME];
  const tokenValid = typeof tokenRaw === "string" && tokenRaw === JS_TOKEN_VALUE;

  const decoyRaw = body[DECOY_FIELD_NAME];
  const decoyFilled = typeof decoyRaw === "string" && decoyRaw.trim().length > 0;

  const mountedRaw = body[MOUNT_TIME_FIELD_NAME];
  const mountedAt = typeof mountedRaw === "string" ? Number.parseInt(mountedRaw, 10) : NaN;
  const elapsed = Number.isFinite(mountedAt) && mountedAt > 0 ? Date.now() - mountedAt : NaN;
  const tooFast = Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_SUBMIT_MS;

  if (!tokenValid) {
    return {
      verdict: "reject",
      reason: decoyFilled ? "decoy filled and JS token missing/invalid" : "JS token missing/invalid",
    };
  }
  if (decoyFilled && tooFast) {
    return { verdict: "reject", reason: `decoy filled and submitted under ${MIN_SUBMIT_MS}ms from mount` };
  }
  if (decoyFilled) {
    return { verdict: "accept_with_warning", reason: "decoy filled but JS token valid" };
  }
  return { verdict: "accept", reason: "clean" };
}
