/** Canonical B2B/B2C values — shared by forms + Zod enums. */
export const VISITOR_BUSINESS_TYPES = [
  {
    value: "b2b",
    title: "B2B",
    description:
      "You supply or sell primarily to other businesses (manufacturers, wholesalers, retailers)",
  },
  {
    value: "b2c",
    title: "B2C",
    description: "You sell primarily directly to individual consumers or shoppers",
  },
  {
    value: "both",
    title: "Both",
    description: "You do a mix of B2B and B2C business",
  },
] as const;

export type VisitorBusinessTypeValue = (typeof VISITOR_BUSINESS_TYPES)[number]["value"];

export const VISITOR_BUSINESS_TYPE_VALUES = VISITOR_BUSINESS_TYPES.map((s) => s.value) as unknown as readonly [
  VisitorBusinessTypeValue,
  ...VisitorBusinessTypeValue[],
];

export const VISITOR_BUSINESS_TYPE_LABEL_BY_VALUE: Record<VisitorBusinessTypeValue, string> =
  Object.fromEntries(VISITOR_BUSINESS_TYPES.map((s) => [s.value, s.title])) as Record<
    VisitorBusinessTypeValue,
    string
  >;

export function formatVisitorBusinessType(value: unknown): string {
  if (typeof value !== "string") return "-";
  return VISITOR_BUSINESS_TYPE_LABEL_BY_VALUE[value as VisitorBusinessTypeValue] ?? value;
}
