import { z } from "zod";
import {
  optionalPhone,
  optionalShortText,
  requiredEmail,
  requiredLongText,
  requiredShortText,
} from "./fields";

/** Contact form - matches ContactForm.tsx requiredness exactly. */
export const contactSchema = z.object({
  firstName: requiredShortText("First name"),
  lastName: requiredShortText("Last name"),
  email: requiredEmail,
  phone: optionalPhone,
  message: requiredLongText("Message"),
});

export type ContactInput = z.infer<typeof contactSchema>;
