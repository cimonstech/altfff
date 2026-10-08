/** Canonical "how did you hear about us" values — shared by forms + Zod enums. */
export const HEARD_ABOUT_OTHER_VALUE = "other" as const;

export const HEARD_ABOUT_SOURCES = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email_newsletter", label: "Email / Newsletter" },
  { value: "word_of_mouth", label: "Word of mouth" },
  { value: "google_web", label: "Google / Web search" },
  { value: "industry_partner", label: "Industry association or partner" },
  { value: "press", label: "Press / news coverage" },
  { value: "out_of_home", label: "Out of Home (billboards, posters)" },
  { value: "radio", label: "Radio" },
  { value: "tv", label: "TV" },
  { value: HEARD_ABOUT_OTHER_VALUE, label: "Other" },
] as const;

export type HeardAboutValue = (typeof HEARD_ABOUT_SOURCES)[number]["value"];

export const HEARD_ABOUT_VALUES = HEARD_ABOUT_SOURCES.map((s) => s.value) as unknown as readonly [
  HeardAboutValue,
  ...HeardAboutValue[],
];

export const HEARD_ABOUT_OPTIONS = HEARD_ABOUT_SOURCES.map((s) => ({
  value: s.value,
  text: s.label,
}));

export const HEARD_ABOUT_LABEL_BY_VALUE: Record<HeardAboutValue, string> = Object.fromEntries(
  HEARD_ABOUT_SOURCES.map((s) => [s.value, s.label]),
) as Record<HeardAboutValue, string>;

export function resolveHeardAboutValue(
  value: string | undefined,
  other: string | undefined,
): string | null {
  if (!value) return null;
  if (value === HEARD_ABOUT_OTHER_VALUE) {
    const trimmed = other?.trim();
    return trimmed ? `Other: ${trimmed}` : null;
  }
  return HEARD_ABOUT_LABEL_BY_VALUE[value as HeardAboutValue] ?? null;
}
