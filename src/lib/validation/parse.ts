import type { ZodError, ZodType } from "zod";

/** First error message per top-level field - enough for inline UI + API. */
export function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) {
      out[key] = issue.message;
    }
  }
  return out;
}

export type ParseSuccess<T> = { ok: true; data: T };
export type ParseFailure = { ok: false; fieldErrors: Record<string, string> };

export function parseWithSchema<T>(
  schema: ZodType<T>,
  data: unknown,
): ParseSuccess<T> | ParseFailure {
  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, fieldErrors: fieldErrorsFromZod(result.error) };
}

/**
 * Blur helper: re-parse the whole payload, but only surface/clear the
 * error for `field` so other empty required fields stay quiet until submit.
 */
export function errorForField(
  schema: ZodType,
  field: string,
  data: unknown,
): string | undefined {
  const result = schema.safeParse(data);
  if (result.success) return undefined;
  return fieldErrorsFromZod(result.error)[field];
}
