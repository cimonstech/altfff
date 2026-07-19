// Shared config + pure helpers for the admin Communications tab. Imported
// by both the client compose UI (browser, no secrets here) and the server
// send/worker routes - keep it free of anything server-only.

export type AudienceType = "exhibitor" | "sponsor" | "visitor" | "contact";
export type Channel = "email" | "sms" | "both";

type AudienceConfig = {
  table: string;
  label: string;
  statuses: string[];
  /** Merge fields available for this audience's message templates. */
  mergeFields: string[];
  /** Columns fetched for a recipient: enough to send (email/phone) and to
   * compute every merge field above. Kept in sync with mergeFields. */
  selectColumns: string;
};

export const AUDIENCE_CONFIG: Record<AudienceType, AudienceConfig> = {
  exhibitor: {
    table: "exhibitor_applications",
    label: "Exhibitors",
    statuses: ["new", "under_review", "invoiced", "payment_received", "confirmed", "cancelled"],
    mergeFields: ["name", "company", "package_type"],
    selectColumns: "id, email, phone, full_name, company_name, package_type",
  },
  sponsor: {
    table: "sponsor_inquiries",
    label: "Sponsors",
    statuses: ["new_inquiry", "contacted", "proposal_sent", "confirmed", "declined"],
    mergeFields: ["name", "company"],
    selectColumns: "id, email, phone, full_name, company_name",
  },
  visitor: {
    table: "visitor_registrations",
    label: "Visitors",
    statuses: ["registered", "confirmed", "cancelled"],
    mergeFields: ["name"],
    selectColumns: "id, email, phone, full_name",
  },
  contact: {
    table: "contact_messages",
    label: "Contact Messages",
    statuses: ["new", "read", "responded", "archived"],
    mergeFields: ["name"],
    selectColumns: "id, email, phone, first_name, last_name",
  },
};

export const AUDIENCE_TYPES = Object.keys(AUDIENCE_CONFIG) as AudienceType[];

function str(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/** Maps a fetched recipient row to the merge-field values available for its audience. */
export function getMergeFieldValues(audience: AudienceType, row: Record<string, unknown>): Record<string, string> {
  switch (audience) {
    case "exhibitor":
      return { name: str(row.full_name), company: str(row.company_name), package_type: str(row.package_type) };
    case "sponsor":
      return { name: str(row.full_name), company: str(row.company_name) };
    case "visitor":
      return { name: str(row.full_name) };
    case "contact":
      return { name: [row.first_name, row.last_name].filter(Boolean).join(" ") };
  }
}

/** Names-only display value for the "preview recipients" list. */
export function getRecipientDisplayName(audience: AudienceType, row: Record<string, unknown>): string {
  const values = getMergeFieldValues(audience, row);
  return values.name || str(row.email) || "(unnamed)";
}

/** Replaces {{field}} tokens with their value; unknown tokens are left as-is. */
export function interpolateMergeFields(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in values ? values[key] : match));
}
