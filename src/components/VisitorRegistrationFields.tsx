"use client";

import { FloatingField } from "@/components/FormFields";
import EmailFloatingField from "@/components/EmailFloatingField";
import { PhoneInput } from "@/components/PhoneInput";
import { SelectWithOtherFollowUp } from "@/components/SelectWithOtherFollowUp";
import { VisitorBusinessTypeField } from "@/components/VisitorBusinessTypeField";
import { COUNTRY_OPTIONS, COUNTRY_OTHER_VALUE } from "@/lib/countries";
import { HEARD_ABOUT_OPTIONS, HEARD_ABOUT_OTHER_VALUE } from "@/lib/heardAboutSources";
import {
  VISITOR_INTEREST_OPTIONS,
  VISITOR_INTEREST_OTHER_VALUE,
} from "@/lib/visitorInterests";

/** Shared field set for VisitorRegisterForm (modal) and VisitRegisterForm (/visit). */
export function VisitorRegistrationFields({
  idPrefix,
  fieldErrors,
  onBlurValidate,
}: {
  idPrefix: string;
  fieldErrors: Record<string, string>;
  onBlurValidate: (field: string) => void;
}) {
  return (
    <>
      <EmailFloatingField
        id={`${idPrefix}-email`}
        name="email"
        label="Email Address"
        required
        error={fieldErrors.email}
        onBlurValidate={onBlurValidate}
      />
      <FloatingField
        id={`${idPrefix}-fullName`}
        name="full_name"
        label="Full Name"
        required
        error={fieldErrors.full_name}
        onBlurValidate={onBlurValidate}
      />
      <PhoneInput
        id={`${idPrefix}-phone`}
        name="phone"
        label="Phone Number"
        required
        error={fieldErrors.phone}
        onBlurValidate={onBlurValidate}
      />
      <FloatingField
        id={`${idPrefix}-company`}
        name="company_name"
        label="Company Name"
        error={fieldErrors.company_name}
        onBlurValidate={onBlurValidate}
      />
      <FloatingField
        id={`${idPrefix}-social`}
        name="social_media_website"
        label="Social Media / Website"
        required
        error={fieldErrors.social_media_website}
        onBlurValidate={onBlurValidate}
      />
      <SelectWithOtherFollowUp
        selectId={`${idPrefix}-country`}
        selectName="country"
        selectLabel="Country"
        selectOptions={COUNTRY_OPTIONS}
        selectRequired
        otherId={`${idPrefix}-country-other`}
        otherName="country_other"
        otherLabel="Please specify your country"
        otherValue={COUNTRY_OTHER_VALUE}
        selectError={fieldErrors.country}
        otherError={fieldErrors.country_other}
        onBlurValidate={onBlurValidate}
      />
      <SelectWithOtherFollowUp
        selectId={`${idPrefix}-interest`}
        selectName="interest"
        selectLabel="I am interested in"
        selectOptions={VISITOR_INTEREST_OPTIONS}
        selectRequired
        otherId={`${idPrefix}-interest-other`}
        otherName="interest_other"
        otherLabel="Please tell us what you are interested in"
        otherValue={VISITOR_INTEREST_OTHER_VALUE}
        selectError={fieldErrors.interest}
        otherError={fieldErrors.interest_other}
        onBlurValidate={onBlurValidate}
      />
      <VisitorBusinessTypeField
        idPrefix={idPrefix}
        error={fieldErrors.business_type}
        onBlurValidate={onBlurValidate}
      />
      <SelectWithOtherFollowUp
        selectId={`${idPrefix}-hearAbout`}
        selectName="heard_about_us"
        selectLabel="Where did you hear about Alt.FFF?"
        selectOptions={HEARD_ABOUT_OPTIONS}
        otherId={`${idPrefix}-hearAbout-other`}
        otherName="heard_about_us_other"
        otherLabel="Please tell us how you heard about Alt.FFF"
        otherValue={HEARD_ABOUT_OTHER_VALUE}
        selectError={fieldErrors.heard_about_us}
        otherError={fieldErrors.heard_about_us_other}
        onBlurValidate={onBlurValidate}
      />
    </>
  );
}
