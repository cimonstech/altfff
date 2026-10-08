"use client";

import { useEffect, useState } from "react";
import {
  JS_TOKEN_FIELD_NAME,
  JS_TOKEN_VALUE,
  DECOY_FIELD_NAME,
  MOUNT_TIME_FIELD_NAME,
} from "@/lib/botProtection";

/**
 * Shared bot-protection block for every public submission form - replaces
 * the old HoneypotField (see src/lib/botProtection.ts for the full history
 * of why the classic empty-honeypot check kept catching real humans and
 * what the combined-signal strategy is).
 *
 * Three hidden fields, all off-screen (never display:none - some bots skip
 * fields hidden that way), all outside the tab order and hidden from
 * assistive tech:
 *
 * - The JS token and mount timestamp start EMPTY in the server-rendered
 *   HTML and are populated by React state one effect-tick after mount -
 *   only a real browser that executed the page has them. Both are readOnly,
 *   which autofill and form-filler extensions leave alone, so nothing can
 *   corrupt them for a human.
 * - The decoy is deliberately NOT readOnly - it's the bait. The server
 *   treats it as a soft signal only (see evaluateBotSignals).
 */
export function BotProtection() {
  const [token, setToken] = useState("");
  const [mountedAt, setMountedAt] = useState("");

  useEffect(() => {
    setToken(JS_TOKEN_VALUE);
    setMountedAt(String(Date.now()));
  }, []);

  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-5000px" }}>
      <input type="text" name={JS_TOKEN_FIELD_NAME} value={token} readOnly autoComplete="off" tabIndex={-1} />
      <input type="text" name={MOUNT_TIME_FIELD_NAME} value={mountedAt} readOnly autoComplete="off" tabIndex={-1} />
      <input type="text" name={DECOY_FIELD_NAME} autoComplete="off" tabIndex={-1} defaultValue="" />
    </div>
  );
}
