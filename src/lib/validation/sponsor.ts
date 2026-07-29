import { z } from "zod";
import {
  optionalShortText,
  requiredEmail,
  requiredMediumText,
  requiredPhone,
  requiredShortText,
} from "./fields";
import { optionalNewsletterCheckbox } from "./newsletter";

/**
 * Sponsorship enquiry - required fields match SponsorshipForm.tsx
 * (and the existing API check) exactly. Country stays optional.
 */
export const sponsorInquirySchema = z.object({
  email: requiredEmail,
  fullName: requiredShortText("Full name"),
  phone: requiredPhone,
  hearAbout: requiredShortText("How you heard about us"),
  linkedin: requiredShortText("LinkedIn handle"),
  company: requiredShortText("Company name"),
  jobTitle: requiredShortText("Job title"),
  country: optionalShortText("Country"),
  businessNature: requiredMediumText("Nature of business"),
  newsletter: optionalNewsletterCheckbox,
});

export type SponsorInquiryInput = z.infer<typeof sponsorInquirySchema>;
