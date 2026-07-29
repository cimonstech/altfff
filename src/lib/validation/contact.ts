import { z } from "zod";
import {
  optionalPhone,
  optionalShortText,
  requiredEmail,
  requiredLongText,
  requiredShortText,
} from "./fields";
import { optionalNewsletterCheckbox } from "./newsletter";

/** Contact form - matches ContactForm.tsx requiredness exactly. */
export const contactSchema = z.object({
  firstName: requiredShortText("First name"),
  lastName: requiredShortText("Last name"),
  email: requiredEmail,
  phone: optionalPhone,
  message: requiredLongText("Message"),
  newsletter: optionalNewsletterCheckbox,
});

export type ContactInput = z.infer<typeof contactSchema>;
