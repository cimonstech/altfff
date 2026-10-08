"use client";

import { useState } from "react";
import { FloatingField } from "@/components/FormFields";
import EmailTypoSuggestion from "@/components/EmailTypoSuggestion";

type Props = {
  id: string;
  name?: string;
  label: string;
  required?: boolean;
  error?: string;
  onFilledChange?: (id: string, filled: boolean) => void;
  onBlurValidate?: (fieldName: string) => void;
  typoHint?: boolean;
};

/** Email input with optional non-blocking typo suggestion for common providers. */
export default function EmailFloatingField({
  id,
  name,
  label,
  required,
  error,
  onFilledChange,
  onBlurValidate,
  typoHint = true,
}: Props) {
  const [emailForHint, setEmailForHint] = useState("");
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);

  const handleBlur = (fieldName: string) => {
    onBlurValidate?.(fieldName);
    const input = document.getElementById(id) as HTMLInputElement | null;
    setEmailForHint(input?.value ?? "");
    setDismissedSuggestion(false);
  };

  return (
    <div>
      <FloatingField
        id={id}
        name={name}
        label={label}
        required={required}
        type="email"
        error={error}
        onFilledChange={onFilledChange}
        onBlurValidate={handleBlur}
      />
      {typoHint && (
        <EmailTypoSuggestion
          email={emailForHint}
          inputId={id}
          dismissed={dismissedSuggestion}
          onDismiss={() => setDismissedSuggestion(true)}
        />
      )}
    </div>
  );
}
