import { z } from "zod";
import {
  COUNTRY_OTHER_VALUE,
  COUNTRY_SELECTABLE_VALUES,
} from "@/lib/countries";
import {
  HEARD_ABOUT_OTHER_VALUE,
  HEARD_ABOUT_VALUES,
} from "@/lib/heardAboutSources";
import {
  emptyToUndefined,
  optionalPhone,
  optionalSelect,
  optionalShortText,
  requiredEmail,
  requiredShortText,
} from "./fields";
import { optionalNewsletterCheckbox } from "./newsletter";
import { withOtherFollowUpRefinement } from "./selectWithOther";

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
  full_name: requiredShortText("Full name"),
  phone: optionalPhone,
  number_attending: optionalNumberAttending,
  heard_about_us: optionalSelect(HEARD_ABOUT_VALUES),
  heard_about_us_other: optionalShortText("How you heard about us"),
  company_name: optionalShortText("Company name"),
  job_title: optionalShortText("Job title"),
  country: optionalSelect(COUNTRY_SELECTABLE_VALUES),
  country_other: optionalShortText("Country name"),
  interest: optionalSelect(VISITOR_INTEREST_VALUES),
  newsletter: optionalNewsletterCheckbox,
};

const visitorRegistrationBaseSchema = z.object(visitorBaseFields);

const visitorRegistrationWithOtherRefinements = withOtherFollowUpRefinement(
  withOtherFollowUpRefinement(
    visitorRegistrationBaseSchema,
    "country",
    "country_other",
    COUNTRY_OTHER_VALUE,
    "Please enter your country.",
  ),
  "heard_about_us",
  "heard_about_us_other",
  HEARD_ABOUT_OTHER_VALUE,
  "Please tell us how you heard about Alt.FFF.",
);

/** API + modal (VisitorRegisterForm) — email and full name required. */
export const visitorRegistrationSchema = visitorRegistrationWithOtherRefinements;

/**
 * /visit inline form - email + full name required in the UI today.
 * Same field names as the modal/API so payloads stay compatible.
 */
export const visitPageRegistrationSchema = visitorRegistrationWithOtherRefinements;

export type VisitorRegistrationInput = z.infer<typeof visitorRegistrationSchema>;
export type VisitPageRegistrationInput = z.infer<typeof visitPageRegistrationSchema>;
