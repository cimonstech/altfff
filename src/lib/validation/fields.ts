import { z } from "zod";

/** Trim strings; treat blank as undefined so optional fields stay optional. */
export function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

const MAX_SHORT = 200;
const MAX_MEDIUM = 500;
const MAX_LONG = 5000;
const MAX_EMAIL = 254;

function requiredString(label: string, max: number) {
  return z.preprocess(
    emptyToUndefined,
    z
      .string({
        error: (issue) =>
          issue.input === undefined ? `${label} is required.` : `${label} must be text.`,
      })
      .max(max, { error: `${label} must be ${max} characters or fewer.` }),
  );
}

function optionalString(label: string, max: number) {
  return z.preprocess(
    emptyToUndefined,
    z.string().max(max, { error: `${label} must be ${max} characters or fewer.` }).optional(),
  );
}

export const requiredShortText = (label: string) => requiredString(label, MAX_SHORT);
export const optionalShortText = (label = "This field") => optionalString(label, MAX_SHORT);
export const requiredMediumText = (label: string) => requiredString(label, MAX_MEDIUM);
export const optionalMediumText = (label = "This field") => optionalString(label, MAX_MEDIUM);
export const requiredLongText = (label: string) => requiredString(label, MAX_LONG);

export const requiredEmail = z.preprocess(
  emptyToUndefined,
  z
    .email({
      error: (issue) =>
        issue.input === undefined
          ? "Please enter your email address."
          : "Please enter a valid email address.",
    })
    .max(MAX_EMAIL, { error: `Email must be ${MAX_EMAIL} characters or fewer.` }),
);

/**
 * PhoneInput submits E.164 (e.g. +233241234567) or "". Plausible digit
 * count only - no libphonenumber re-implementation.
 */
const E164 = /^\+[1-9]\d{6,14}$/;

export const requiredPhone = z.preprocess(
  emptyToUndefined,
  z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "Please enter your phone number."
          : "Please enter a valid phone number.",
    })
    .regex(E164, { error: "Please enter a valid phone number." }),
);

export const optionalPhone = z.preprocess(
  emptyToUndefined,
  z.string().regex(E164, { error: "Please enter a valid phone number." }).optional(),
);

/** Empty select → undefined; otherwise must be one of `allowed` when provided. */
export function optionalSelect<T extends string>(allowed?: readonly [T, ...T[]]) {
  if (!allowed) {
    return optionalShortText("Selection");
  }
  return z.preprocess(
    emptyToUndefined,
    z.enum(allowed, {
      error: () => "Please select a valid option.",
    }).optional(),
  );
}
