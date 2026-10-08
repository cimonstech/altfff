"use client";

import { useCallback, useRef } from "react";

/**
 * Synchronous submit guard — React `setState("submitting")` disables the
 * button only on the next render, so a rapid double-click can still fire
 * two handlers before that happens. This ref blocks immediately.
 */
export function useFormSubmitGuard() {
  const submittingRef = useRef(false);

  const beginSubmit = useCallback(() => {
    if (submittingRef.current) return false;
    submittingRef.current = true;
    return true;
  }, []);

  const endSubmit = useCallback(() => {
    submittingRef.current = false;
  }, []);

  return { beginSubmit, endSubmit };
}
