import { z } from "zod";
import {
  COUNTRY_OTHER_VALUE,
  COUNTRY_SELECTABLE_VALUES,
} from "@/lib/countries";
import {
  HEARD_ABOUT_OTHER_VALUE,
  HEARD_ABOUT_VALUES,
} from "@/lib/heardAboutSources";
import {
  VISITOR_BUSINESS_TYPE_VALUES,
} from "@/lib/visitorBusinessType";
import {
  VISITOR_INTEREST_OTHER_VALUE,
  VISITOR_INTEREST_VALUES,
} from "@/lib/visitorInterests";
import {
  optionalSelect,
  optionalShortText,
  requiredEmail,
  requiredPhone,
  requiredSelect,
  requiredShortText,
  requiredUrl,
} from "./fields";
import { optionalNewsletterCheckbox } from "./newsletter";
import { withOtherFollowUpRefinement } from "./selectWithOther";

export {
  VISITOR_INTEREST_OTHER_VALUE,
  VISITOR_INTEREST_VALUES,
} from "@/lib/visitorInterests";

const visitorBaseFields = {
  email: requiredEmail,
  full_name: requiredShortText("Full name"),
  phone: requiredPhone,
  company_name: optionalShortText("Company name"),
  social_media_website: requiredUrl("Social media / website"),
  country: requiredSelect(COUNTRY_SELECTABLE_VALUES, "Country"),
  country_other: optionalShortText("Country name"),
  interest: requiredSelect(VISITOR_INTEREST_VALUES, "Interest"),
  interest_other: optionalShortText("Your interest"),
  business_type: requiredSelect(VISITOR_BUSINESS_TYPE_VALUES, "B2B/B2C"),
  heard_about_us: optionalSelect(HEARD_ABOUT_VALUES),
  heard_about_us_other: optionalShortText("How you heard about us"),
  newsletter: optionalNewsletterCheckbox,
};

const visitorRegistrationBaseSchema = z.object(visitorBaseFields);

const visitorRegistrationWithOtherRefinements = withOtherFollowUpRefinement(
  withOtherFollowUpRefinement(
    withOtherFollowUpRefinement(
      visitorRegistrationBaseSchema,
      "country",
      "country_other",
      COUNTRY_OTHER_VALUE,
      "Please enter your country.",
    ),
    "interest",
    "interest_other",
    VISITOR_INTEREST_OTHER_VALUE,
    "Please tell us what you are interested in.",
  ),
  "heard_about_us",
  "heard_about_us_other",
  HEARD_ABOUT_OTHER_VALUE,
  "Please tell us how you heard about Alt.FFF.",
);

/** Shared by both visitor forms and POST /api/visitor-registrations. */
export const visitorRegistrationSchema = visitorRegistrationWithOtherRefinements;

/** @deprecated Alias — both visitor forms now use the same schema. */
export const visitPageRegistrationSchema = visitorRegistrationSchema;

export type VisitorRegistrationInput = z.infer<typeof visitorRegistrationSchema>;
export type VisitPageRegistrationInput = VisitorRegistrationInput;
