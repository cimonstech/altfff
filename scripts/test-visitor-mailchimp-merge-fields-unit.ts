import { buildMailchimpMergeFields } from "../src/lib/mailchimpMergeFields";

const { merge_fields, unmapped } = buildMailchimpMergeFields({
  source: "VISITOR",
  interest: "Learning From Experts",
  businessType: "Both",
  socialMediaWebsite: "https://example.com/brand",
});

if (merge_fields.MMERGE26 !== "Learning From Experts") {
  throw new Error(`MMERGE26 expected "Learning From Experts", got "${merge_fields.MMERGE26}"`);
}
if (merge_fields.MMERGE27 !== "Both") {
  throw new Error(`MMERGE27 expected "Both", got "${merge_fields.MMERGE27}"`);
}
if (merge_fields.MMERGE3) {
  throw new Error(`MMERGE3 must not be set, got "${merge_fields.MMERGE3}"`);
}
if (unmapped.length > 0) {
  throw new Error(`unexpected unmapped: ${unmapped.join("; ")}`);
}

console.log("ok");
