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
  optionalMediumText,
  optionalPhone,
  optionalSelect,
  optionalShortText,
  requiredShortText,
  requiredEmail,
} from "./fields";
import { optionalNewsletterCheckbox } from "./newsletter";
import { withOtherFollowUpRefinement } from "./selectWithOther";

/** Legacy booth preference values — kept for API/admin/Mailchimp on older submissions. */
export const EXHIBITOR_SPACE_VALUES = ["standard", "medium", "premium", "innovation"] as const;

export const EXHIBITOR_PACKAGE_MAP: Record<(typeof EXHIBITOR_SPACE_VALUES)[number], string> = {
  standard: "standard_booth",
  medium: "medium_booth",
  premium: "premium_booth",
  innovation: "innovation_pod",
};

const exhibitorApplicationBaseSchema = z.object({
  email: requiredEmail,
  name: requiredShortText("Full name"),
  phone: optionalPhone,
  company: optionalShortText("Company name"),
  title: optionalShortText("Job title"),
  nature: optionalMediumText("Nature of business"),
  based: optionalShortText("Business location"),
  country: optionalSelect(COUNTRY_SELECTABLE_VALUES),
  country_other: optionalShortText("Country name"),
  space: optionalSelect(EXHIBITOR_SPACE_VALUES),
  hear: optionalSelect(HEARD_ABOUT_VALUES),
  hear_other: optionalShortText("How you heard about us"),
  newsletter: optionalNewsletterCheckbox,
});

/**
 * Exhibitor application — email and full name required; other fields optional.
 */
export const exhibitorApplicationSchema = withOtherFollowUpRefinement(
  withOtherFollowUpRefinement(
    exhibitorApplicationBaseSchema,
    "country",
    "country_other",
    COUNTRY_OTHER_VALUE,
    "Please enter your country.",
  ),
  "hear",
  "hear_other",
  HEARD_ABOUT_OTHER_VALUE,
  "Please tell us how you heard about Alt.FFF.",
);

export type ExhibitorApplicationInput = z.infer<typeof exhibitorApplicationSchema>;
