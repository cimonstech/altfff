import { z } from "zod";
import {
  optionalMediumText,
  optionalPhone,
  optionalSelect,
  optionalShortText,
  requiredEmail,
} from "./fields";
import { optionalNewsletterCheckbox } from "./newsletter";

/** Matches ExhibitApplicationForm FloatingSelect "space" option values. */
export const EXHIBITOR_SPACE_VALUES = ["standard", "medium", "premium", "innovation"] as const;

export const EXHIBITOR_PACKAGE_MAP: Record<(typeof EXHIBITOR_SPACE_VALUES)[number], string> = {
  standard: "standard_booth",
  medium: "medium_booth",
  premium: "premium_booth",
  innovation: "innovation_pod",
};

/**
 * Exhibitor application - only `email` is required in the UI/API today;
 * every other field stays optional with format/length checks when present.
 */
export const exhibitorApplicationSchema = z.object({
  email: requiredEmail,
  name: optionalShortText("Full name"),
  phone: optionalPhone,
  company: optionalShortText("Company name"),
  title: optionalShortText("Job title"),
  nature: optionalMediumText("Nature of business"),
  based: optionalShortText("Business location"),
  country: optionalShortText("Country"),
  space: optionalSelect(EXHIBITOR_SPACE_VALUES),
  hear: optionalShortText("How you heard about us"),
  newsletter: optionalNewsletterCheckbox,
});

export type ExhibitorApplicationInput = z.infer<typeof exhibitorApplicationSchema>;
