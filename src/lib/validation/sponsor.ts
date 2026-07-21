import { z } from "zod";
import {
  emptyToUndefined,
  optionalShortText,
  requiredEmail,
  requiredMediumText,
  requiredPhone,
  requiredShortText,
} from "./fields";

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
  // Checkbox: FormData includes it as a non-empty string (usually "on") when checked.
  newsletter: z.preprocess(
    emptyToUndefined,
    z.string().max(20, { error: "Invalid newsletter value." }).optional(),
  ),
});

export type SponsorInquiryInput = z.infer<typeof sponsorInquirySchema>;
