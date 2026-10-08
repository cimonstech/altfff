"use client";

import { VISITOR_BUSINESS_TYPES } from "@/lib/visitorBusinessType";

export function VisitorBusinessTypeField({
  idPrefix,
  error,
  onBlurValidate,
}: {
  idPrefix: string;
  error?: string;
  onBlurValidate?: (fieldName: string) => void;
}) {
  return (
    <fieldset className="mt-4 border-0 p-0">
      <legend className="text-xs font-semibold uppercase tracking-wide text-ink/50">
        B2B/B2C <span className="text-madder">*</span>
      </legend>
      <div className="mt-3 space-y-3">
        {VISITOR_BUSINESS_TYPES.map((option) => {
          const inputId = `${idPrefix}-business-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-hairline bg-surface/40 px-3 py-3 transition-colors hover:border-ink/20"
            >
              <input
                id={inputId}
                type="radio"
                name="business_type"
                value={option.value}
                className="mt-0.5 h-4 w-4 shrink-0 border-hairline text-gold focus:ring-gold"
                onBlur={() => onBlurValidate?.("business_type")}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{option.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink/70">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-xs text-madder" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
