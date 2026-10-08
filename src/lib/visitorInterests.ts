/** Canonical visitor "I am interested in" values — shared by forms + Zod enums. */
export const VISITOR_INTEREST_OTHER_VALUE = "other" as const;

export const VISITOR_INTERESTS = [
  { value: "materials", label: "Discovering New Materials & Innovation" },
  { value: "leaders", label: "Connecting With Industry Leaders" },
  { value: "learning", label: "Learning From Experts" },
  { value: "business", label: "Finding New Business Opportunities" },
  { value: VISITOR_INTEREST_OTHER_VALUE, label: "Other" },
] as const;

export type VisitorInterestValue = (typeof VISITOR_INTERESTS)[number]["value"];

export const VISITOR_INTEREST_VALUES = VISITOR_INTERESTS.map((s) => s.value) as unknown as readonly [
  VisitorInterestValue,
  ...VisitorInterestValue[],
];

export const VISITOR_INTEREST_OPTIONS = VISITOR_INTERESTS.map((s) => ({
  value: s.value,
  text: s.label,
}));

export const VISITOR_INTEREST_LABEL_BY_VALUE: Record<VisitorInterestValue, string> = Object.fromEntries(
  VISITOR_INTERESTS.map((s) => [s.value, s.label]),
) as Record<VisitorInterestValue, string>;

export function resolveInterestValue(
  value: string | undefined,
  other: string | undefined,
): string | null {
  if (!value) return null;
  if (value === VISITOR_INTEREST_OTHER_VALUE) {
    const trimmed = other?.trim();
    return trimmed ? `Other: ${trimmed}` : null;
  }
  return VISITOR_INTEREST_LABEL_BY_VALUE[value as VisitorInterestValue] ?? null;
}
