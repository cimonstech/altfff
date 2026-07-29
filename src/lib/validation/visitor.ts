import { z } from "zod";
import {
  emptyToUndefined,
  optionalPhone,
  optionalSelect,
  optionalShortText,
  requiredEmail,
  requiredShortText,
} from "./fields";
import { optionalNewsletterCheckbox } from "./newsletter";

/** Matches VisitRegisterForm INTEREST_OPTIONS values. */
export const VISITOR_INTEREST_VALUES = [
  "materials",
  "leaders",
  "learning",
  "business",
  "other",
] as const;

const optionalNumberAttending = z.preprocess((value) => {
  const cleared = emptyToUndefined(value);
  if (cleared === undefined) return undefined;
  if (typeof cleared !== "string") return cleared;
  const parsed = Number.parseInt(cleared, 10);
  return Number.isFinite(parsed) ? parsed : cleared;
}, z
  .number({ error: "Please enter a valid number attending." })
  .int({ error: "Please enter a whole number." })
  .min(1, { error: "Number attending must be at least 1." })
  .max(99, { error: "Number attending must be 99 or fewer." })
  .optional());

/**
 * Shared field set for both visitor forms + the API. Email is the only
 * field the API requires (preserving current server behaviour). Modal and
 * /visit page schemas tighten requiredness to match each UI.
 */
const visitorBaseFields = {
  email: requiredEmail,
  phone: optionalPhone,
  number_attending: optionalNumberAttending,
  heard_about_us: optionalShortText("How you heard about us"),
  company_name: optionalShortText("Company name"),
  job_title: optionalShortText("Job title"),
  country: optionalShortText("Country"),
  interest: optionalSelect(VISITOR_INTEREST_VALUES),
  newsletter: optionalNewsletterCheckbox,
};

/** API + modal (VisitorRegisterForm) - email required only. */
export const visitorRegistrationSchema = z.object({
  ...visitorBaseFields,
  full_name: optionalShortText("Full name"),
});

/**
 * /visit inline form - email + full name required in the UI today.
 * Same field names as the modal/API so payloads stay compatible.
 */
export const visitPageRegistrationSchema = z.object({
  ...visitorBaseFields,
  full_name: requiredShortText("Full name"),
});

export type VisitorRegistrationInput = z.infer<typeof visitorRegistrationSchema>;
export type VisitPageRegistrationInput = z.infer<typeof visitPageRegistrationSchema>;
