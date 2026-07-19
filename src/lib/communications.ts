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

// =====================================================================
// Custom audience - typed/pasted recipients (Compose UI), or a specific
// set of people handed off from a data table's row selection. Not a
// "table" audience like the four above: there's no query, the recipient
// list itself is the input.
// =====================================================================

export type CustomRecipient = {
  email: string | null;
  phone: string | null;
  /** Only ever populated when recipients are handed off from a data
   * table's row selection (real records with real names) - never for
   * raw typed/pasted addresses, which carry no name data at all. */
  name: string | null;
};

export function isValidEmailFormat(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Loose check, not a real phone-number parse (that's PhoneInput's job
 * elsewhere): a leading +/digit/paren, digits/spaces/hyphens/parens only,
 * and at least 7 digits total - enough to catch "that's not a phone
 * number" pastes without rejecting legitimate international formats. */
export function isValidPhoneFormat(value: string): boolean {
  const digitCount = (value.match(/\d/g) ?? []).length;
  return digitCount >= 7 && /^[+()\d][\d\s\-()]*$/.test(value);
}

/** A recipient is valid if it has at least one usable contact method. */
export function isValidCustomRecipient(recipient: CustomRecipient): boolean {
  const hasEmail = !!recipient.email && isValidEmailFormat(recipient.email);
  const hasPhone = !!recipient.phone && isValidPhoneFormat(recipient.phone);
  return hasEmail || hasPhone;
}

/**
 * Parses the Custom-audience textarea: one address per line, or comma-
 * separated (both work - neither emails nor phone numbers ever contain a
 * comma, so splitting on both delimiters at once is unambiguous). Blank
 * entries are ignored. Each token is classified as an email or a phone
 * number by the loose checks above; anything matching neither is returned
 * separately as invalid rather than silently dropped, so the UI (and the
 * server, re-validating independently) can flag it.
 */
export function parseCustomRecipients(raw: string): { valid: CustomRecipient[]; invalid: string[] } {
  const tokens = raw
    .split(/[\n,]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const valid: CustomRecipient[] = [];
  const invalid: string[] = [];
  for (const token of tokens) {
    if (isValidEmailFormat(token)) {
      valid.push({ email: token, phone: null, name: null });
    } else if (isValidPhoneFormat(token)) {
      valid.push({ email: null, phone: token, name: null });
    } else {
      invalid.push(token);
    }
  }
  return { valid, invalid };
}

const PRELOAD_STORAGE_KEY = "altfff-communications-preload";

/** Hands a specific set of recipients (e.g. selected rows from an admin
 * data table) off to the Communications page via sessionStorage - simple,
 * same-tab, survives the navigation, and doesn't need a shared React
 * context wrapping two otherwise-unrelated route trees. */
export function storePreloadedRecipients(recipients: CustomRecipient[]): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PRELOAD_STORAGE_KEY, JSON.stringify(recipients));
}

/** Reads and clears the pending hand-off, if any - consumed once, on the
 * Communications page's mount, so navigating away and back doesn't
 * re-trigger it with stale data. */
export function consumePreloadedRecipients(): CustomRecipient[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PRELOAD_STORAGE_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(PRELOAD_STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomRecipient[]) : null;
  } catch {
    return null;
  }
}
