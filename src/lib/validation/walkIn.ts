import { z } from "zod";
import {
  optionalShortText,
  requiredEmail,
  requiredPhone,
  requiredShortText,
} from "./fields";
import { optionalNewsletterCheckbox } from "./newsletter";

/** On-site walk-in registration — minimal fields for door-side sign-up. */
export const walkInRegistrationSchema = z.object({
  full_name: requiredShortText("Full name"),
  email: requiredEmail,
  phone: requiredPhone,
  company_name: optionalShortText("Company or what you do"),
  newsletter: optionalNewsletterCheckbox,
});

export type WalkInRegistrationInput = z.infer<typeof walkInRegistrationSchema>;
