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
  optionalShortText,
  requiredEmail,
  requiredMediumText,
  requiredPhone,
  requiredSelect,
  requiredShortText,
  optionalSelect,
} from "./fields";
import { optionalNewsletterCheckbox } from "./newsletter";
import { withOtherFollowUpRefinement } from "./selectWithOther";

const sponsorInquiryBaseSchema = z.object({
  email: requiredEmail,
  fullName: requiredShortText("Full name"),
  phone: requiredPhone,
  hearAbout: requiredSelect(HEARD_ABOUT_VALUES, "How you heard about us"),
  hearAbout_other: optionalShortText("How you heard about us"),
  linkedin: requiredShortText("LinkedIn handle"),
  company: requiredShortText("Company name"),
  jobTitle: requiredShortText("Job title"),
  country: optionalSelect(COUNTRY_SELECTABLE_VALUES),
  country_other: optionalShortText("Country name"),
  businessNature: requiredMediumText("Nature of business"),
  newsletter: optionalNewsletterCheckbox,
});

/**
 * Sponsorship enquiry - required fields match SponsorshipForm.tsx
 * (and the existing API check) exactly. Country stays optional.
 */
export const sponsorInquirySchema = withOtherFollowUpRefinement(
  withOtherFollowUpRefinement(
    sponsorInquiryBaseSchema,
    "country",
    "country_other",
    COUNTRY_OTHER_VALUE,
    "Please enter your country.",
  ),
  "hearAbout",
  "hearAbout_other",
  HEARD_ABOUT_OTHER_VALUE,
  "Please tell us how you heard about Alt.FFF.",
);

export type SponsorInquiryInput = z.infer<typeof sponsorInquirySchema>;
