import { z } from "zod";
import { emptyToUndefined } from "./fields";

/** Optional newsletter checkbox — present as a non-empty string when checked. */
export const optionalNewsletterCheckbox = z.preprocess(
  emptyToUndefined,
  z.string().max(20, { error: "Invalid newsletter value." }).optional(),
);
