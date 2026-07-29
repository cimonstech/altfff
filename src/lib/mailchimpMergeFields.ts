import { EXHIBITOR_SPACE_VALUES } from "@/lib/validation/exhibitor";

/**
 * Confirmed via GET /lists/{list_id}/merge-fields (FFA audience, 2026-07-28).
 * Do not guess tags — update this file only after re-running discovery.
 */
export const MAILCHIMP_MERGE_TAGS = {
  company: "CNAME",
  firstName: "FNAME",
  lastName: "LNAME",
  jobTitle: "JOBTITLE",
  linkedin: "LINKEDIN",
  country: "MMERGE8",
  natureOfBusiness: "MMERGE14",
  businessLocation: "MMERGE15",
  exhibitorSpace: "MMERGE13",
  heardAboutText: "WHERE",
  message: "TEXTAREAY",
  /** Dropdown: Exhibiting | Visiting | Sponsoring — not used by Alt.FFF visitor interest select. */
  participationInterest: "MMERGE3",
} as const;

/** Mailchimp MMERGE13 choices (exact strings from API). */
const EXHIBITOR_SPACE_TO_MAILCHIMP: Record<
  (typeof EXHIBITOR_SPACE_VALUES)[number],
  string
> = {
  standard: "3x3 (sp.m)",
  medium: "3x4 (sq.m)",
  premium: "3x6 (sq.m)",
  innovation: "3x6 (sq.m) (innovation pod 3 spots only)",
};

export type MailchimpExhibitorFields = {
  name?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  natureOfBusiness?: string | null;
  businessLocation?: string | null;
  country?: string | null;
  space?: (typeof EXHIBITOR_SPACE_VALUES)[number] | null;
  heardAbout?: string | null;
};

export type MailchimpSponsorFields = {
  name?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  natureOfBusiness?: string | null;
  linkedin?: string | null;
  country?: string | null;
  heardAbout?: string | null;
};

export type MailchimpVisitorFields = {
  name?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  country?: string | null;
  heardAbout?: string | null;
  /** Site value: materials | leaders | learning | business | other — no matching Mailchimp merge field. */
  interest?: string | null;
};

export type MailchimpContactFields = {
  firstName?: string | null;
  lastName?: string | null;
  message?: string | null;
};

export type MailchimpSyncFields =
  | ({ source: "EXHIBITOR" } & MailchimpExhibitorFields)
  | ({ source: "SPONSOR" } & MailchimpSponsorFields)
  | ({ source: "VISITOR" } & MailchimpVisitorFields)
  | ({ source: "CONTACT" } & MailchimpContactFields);

function splitMergeName(name: string | null | undefined): { FNAME: string; LNAME: string } {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return { FNAME: "", LNAME: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { FNAME: parts[0], LNAME: "" };
  return { FNAME: parts[0], LNAME: parts.slice(1).join(" ") };
}

function setTrimmed(target: Record<string, string>, tag: string, value: string | null | undefined): void {
  const trimmed = value?.trim();
  if (trimmed) target[tag] = trimmed;
}

/**
 * Builds merge_fields for PUT /members/{hash}. Omits empty values.
 * Returns tags that had form data but no Mailchimp home (for ops visibility).
 */
export function buildMailchimpMergeFields(
  fields: MailchimpSyncFields,
): { merge_fields: Record<string, string>; unmapped: string[] } {
  const merge_fields: Record<string, string> = {};
  const unmapped: string[] = [];

  switch (fields.source) {
    case "EXHIBITOR": {
      Object.assign(merge_fields, splitMergeName(fields.name));
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.company, fields.company);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.jobTitle, fields.jobTitle);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.natureOfBusiness, fields.natureOfBusiness);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.businessLocation, fields.businessLocation);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.country, fields.country);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.heardAboutText, fields.heardAbout);
      if (fields.space) {
        const choice = EXHIBITOR_SPACE_TO_MAILCHIMP[fields.space];
        if (choice) merge_fields[MAILCHIMP_MERGE_TAGS.exhibitorSpace] = choice;
      }
      break;
    }
    case "SPONSOR": {
      Object.assign(merge_fields, splitMergeName(fields.name));
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.company, fields.company);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.jobTitle, fields.jobTitle);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.natureOfBusiness, fields.natureOfBusiness);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.linkedin, fields.linkedin);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.country, fields.country);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.heardAboutText, fields.heardAbout);
      break;
    }
    case "VISITOR": {
      Object.assign(merge_fields, splitMergeName(fields.name));
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.company, fields.company);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.jobTitle, fields.jobTitle);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.country, fields.country);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.heardAboutText, fields.heardAbout);
      if (fields.interest?.trim()) {
        unmapped.push(
          `interest (${fields.interest.trim()}) — no merge field; MMERGE3 is Exhibiting/Visiting/Sponsoring, MMERGE2 is sector dropdown`,
        );
      }
      break;
    }
    case "CONTACT": {
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.firstName, fields.firstName);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.lastName, fields.lastName);
      setTrimmed(merge_fields, MAILCHIMP_MERGE_TAGS.message, fields.message);
      break;
    }
  }

  return { merge_fields, unmapped };
}
