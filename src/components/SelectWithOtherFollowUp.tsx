"use client";

import { useState } from "react";
import { FloatingField, FloatingSelect } from "@/components/FormFields";

type SelectOption = { value: string; text: string; disabled?: boolean };

/** Select with a conditional short-text follow-up when `otherValue` is chosen. */
export function SelectWithOtherFollowUp({
  selectId,
  selectName,
  selectLabel,
  selectOptions,
  selectRequired,
  otherId,
  otherName,
  otherLabel,
  otherValue,
  selectError,
  otherError,
  onBlurValidate,
  onFilledChange,
}: {
  selectId: string;
  selectName?: string;
  selectLabel: string;
  selectOptions: SelectOption[];
  selectRequired?: boolean;
  otherId: string;
  otherName?: string;
  otherLabel: string;
  otherValue: string;
  selectError?: string;
  otherError?: string;
  onBlurValidate?: (fieldName: string) => void;
  onFilledChange?: (id: string, filled: boolean) => void;
}) {
  const [showOther, setShowOther] = useState(false);
  const resolvedSelectName = selectName ?? selectId;
  const resolvedOtherName = otherName ?? otherId;

  const handleSelectValueChange = (value: string) => {
    setShowOther(value === otherValue);
    onBlurValidate?.(resolvedSelectName);
    if (value === otherValue) {
      onBlurValidate?.(resolvedOtherName);
    }
  };

  return (
    <>
      <FloatingSelect
        id={selectId}
        name={selectName}
        label={selectLabel}
        required={selectRequired}
        options={selectOptions}
        error={selectError}
        onFilledChange={onFilledChange}
        onBlurValidate={onBlurValidate}
        onValueChange={handleSelectValueChange}
      />
      {showOther && (
        <FloatingField
          id={otherId}
          name={otherName}
          label={otherLabel}
          required
          error={otherError}
          onFilledChange={onFilledChange}
          onBlurValidate={onBlurValidate}
          validateOnChange
        />
      )}
    </>
  );
}
