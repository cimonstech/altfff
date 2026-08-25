"use client";

import { useMemo } from "react";
import { suggestCommonEmailDomain } from "@/lib/emailTypoSuggestion";

type Props = {
  email: string;
  inputId: string;
  dismissed: boolean;
  onDismiss: () => void;
};

export default function EmailTypoSuggestion({ email, inputId, dismissed, onDismiss }: Props) {
  const suggestion = useMemo(() => suggestCommonEmailDomain(email), [email]);

  if (dismissed || !suggestion) return null;

  const suggestedDomain = suggestion.split("@")[1] ?? suggestion;

  const applySuggestion = () => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) {
      input.value = suggestion;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    onDismiss();
  };

  return (
    <div
      className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-indigo/20 bg-indigo/5 px-3 py-2 text-xs text-indigo"
      role="status"
    >
      <span>
        Did you mean <span className="font-semibold">{suggestedDomain}</span>?
      </span>
      <button
        type="button"
        onClick={applySuggestion}
        className="font-semibold underline underline-offset-2 hover:text-indigo/80"
      >
        Use {suggestion}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-auto text-indigo/70 hover:text-indigo"
        aria-label="Dismiss email suggestion"
      >
        Dismiss
      </button>
    </div>
  );
}
