"use client";

import { useCallback, useState } from "react";
import type { ZodType } from "zod";
import { errorForField, fieldErrorsFromZod } from "@/lib/validation/parse";

/**
 * Shared client-side Zod wiring for the public forms: per-field blur
 * errors + full-form submit validation against the same schemas the API
 * routes use.
 */
export function useZodFormErrors(schema: ZodType) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldErrors = useCallback(() => setFieldErrors({}), []);

  const validateField = useCallback(
    (field: string, data: Record<string, unknown>) => {
      const message = errorForField(schema, field, data);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (message) next[field] = message;
        else delete next[field];
        return next;
      });
    },
    [schema],
  );

  const validateAll = useCallback(
    (data: unknown): { ok: true } | { ok: false; fieldErrors: Record<string, string> } => {
      const result = schema.safeParse(data);
      if (result.success) {
        setFieldErrors({});
        return { ok: true };
      }
      const errors = fieldErrorsFromZod(result.error);
      setFieldErrors(errors);
      return { ok: false, fieldErrors: errors };
    },
    [schema],
  );

  /** Apply server-returned fieldErrors (defense in depth). */
  const applyServerFieldErrors = useCallback((errors: Record<string, string>) => {
    setFieldErrors(errors);
  }, []);

  return {
    fieldErrors,
    clearFieldErrors,
    validateField,
    validateAll,
    applyServerFieldErrors,
  };
}

/** Read FormData as a plain object (FormDataEntryValue → string). */
export function formDataToObject(form: HTMLFormElement): Record<string, unknown> {
  const raw = Object.fromEntries(new FormData(form));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] = typeof value === "string" ? value : String(value);
  }
  return out;
}
