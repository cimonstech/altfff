import { z } from "zod";

/** Require a short follow-up when a select is set to the "other" sentinel value. */
export function withOtherFollowUpRefinement<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  mainField: keyof T & string,
  otherField: keyof T & string,
  otherValue: string,
  message: string,
) {
  return schema.superRefine((data, ctx) => {
    if (data[mainField] === otherValue) {
      const other = data[otherField];
      if (typeof other !== "string" || other.trim().length === 0) {
        ctx.addIssue({ code: "custom", message, path: [otherField] });
      }
    }
  });
}
