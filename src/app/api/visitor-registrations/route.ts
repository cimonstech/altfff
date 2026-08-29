import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAnonClient } from "@/lib/supabase/anon";
import { EVENT } from "@/lib/constants";
import { buildEmailHtml, textToHtml } from "@/lib/emailTemplate";
import { DECOY_FIELD_NAME, evaluateBotSignals } from "@/lib/botProtection";
import { checkPublicFormRateLimit, RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimit";
import {
  visitorRegistrationSchema,
  type VisitorRegistrationInput,
} from "@/lib/validation/visitor";
import { parseWithSchema } from "@/lib/validation/parse";
import { reportServerError } from "@/lib/sentryReport";
import { parseNewsletterOptIn, scheduleMailchimpSync } from "@/lib/mailchimp";
import { emailDomainValidationResponse } from "@/lib/publicFormEmailCheck";
import { resolveCountryValue } from "@/lib/countries";
import { resolveHeardAboutValue } from "@/lib/heardAboutSources";
import { resolveInterestValue } from "@/lib/visitorInterests";
import {
  DuplicateRegistrationError,
  VISITOR_BLOCKING_STATUSES,
  VISITOR_DUPLICATE_EMAIL_MESSAGE,
  findBlockingRegistrationByEmail,
  withRegistrationEmailLock,
} from "@/lib/registrationDuplicates";

export const runtime = "nodejs";

/**
 * Shared by both visitor-facing forms - the modal (VisitorRegisterForm.tsx)
 * and the inline form on /visit (VisitRegisterForm.tsx). Both forms use the
 * same field set and canonical `name` attributes; this route validates and
 * inserts whichever fields are present.
 */
export async function POST(request: Request) {
  const rate = await checkPublicFormRateLimit(request, "visitor-registrations");
  if (!rate.success) {
    return NextResponse.json({ ok: false, error: RATE_LIMIT_ERROR_MESSAGE }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  // Combined bot check - see src/lib/botProtection.ts for the strategy and
  // the two generations of honeypot false positives that led here.
  const botCheck = evaluateBotSignals(body);
  if (botCheck.verdict === "reject") {
    console.warn(`[honeypot] tripped on /api/visitor-registrations (${botCheck.reason}) - submission dropped, fake success returned.`);
    if (process.env.NODE_ENV !== "production") {
      // DEV-ONLY diagnostic - never ships value-logging to production.
      console.warn("[honeypot][dev-only] decoy value:", body[DECOY_FIELD_NAME]);
    }
    return NextResponse.json({ ok: true });
  }
  if (botCheck.verdict === "accept_with_warning") {
    console.warn("[bot-signal] decoy filled but JS token valid on /api/visitor-registrations - accepting (autofill/extension case).");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[bot-signal][dev-only] decoy value:", body[DECOY_FIELD_NAME]);
    }
  }

  const parsed = parseWithSchema<VisitorRegistrationInput>(visitorRegistrationSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors: parsed.fieldErrors,
      },
      { status: 400 },
    );
  }

  const emailDomainError = await emailDomainValidationResponse(parsed.data.email);
  if (emailDomainError) return emailDomainError;

  const {
    email,
    full_name: fullName,
    phone,
    company_name: companyName,
    social_media_website: socialMediaWebsite,
    country,
    country_other: countryOther,
    interest,
    interest_other: interestOther,
    business_type: businessType,
    heard_about_us: heardAboutUs,
    heard_about_us_other: heardAboutUsOther,
    newsletter,
  } = parsed.data;
  const newsletterOptIn = parseNewsletterOptIn(newsletter);

  try {
    await withRegistrationEmailLock("visitor", email, async () => {
      const existing = await findBlockingRegistrationByEmail(
        "visitor_registrations",
        email,
        VISITOR_BLOCKING_STATUSES,
      );
      if (existing) {
        throw new DuplicateRegistrationError(VISITOR_DUPLICATE_EMAIL_MESSAGE);
      }

      const supabase = createAnonClient();
      const { error: insertError } = await supabase.from("visitor_registrations").insert({
        email,
        full_name: fullName || null,
        phone: phone || null,
        company_name: companyName || null,
        social_media_website: socialMediaWebsite || null,
        country: resolveCountryValue(country, countryOther),
        interest: resolveInterestValue(interest, interestOther),
        business_type: businessType || null,
        heard_about_us: resolveHeardAboutValue(heardAboutUs, heardAboutUsOther),
        newsletter_opt_in: newsletterOptIn,
      });

      if (insertError) {
        throw insertError;
      }
    });
  } catch (err) {
    if (err instanceof DuplicateRegistrationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
    }
    console.error("Visitor registration insert failed:", err);
    reportServerError(err, {
      route: "/api/visitor-registrations",
      kind: "db",
      extra: { op: "insert" },
    });
    return NextResponse.json(
      { ok: false, error: "Sorry, something went wrong on our end. Please email us directly." },
      { status: 500 },
    );
  }

  if (newsletterOptIn) {
    scheduleMailchimpSync({
      email,
      route: "/api/visitor-registrations",
      source: "VISITOR",
      name: fullName || null,
      company: companyName || null,
      country: resolveCountryValue(country, countryOther),
      heardAbout: resolveHeardAboutValue(heardAboutUs, heardAboutUsOther),
      socialMediaWebsite: socialMediaWebsite || null,
      interest: resolveInterestValue(interest, interestOther),
      phone: phone || null,
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    console.error(
      !apiKey
        ? "RESEND_API_KEY is not set - visitor registration confirmation email was not sent."
        : "RESEND_FROM_EMAIL is not set - visitor registration confirmation email was not sent.",
    );
    return NextResponse.json({ ok: true });
  }

  try {
    const resend = new Resend(apiKey);
    // No ticket/confirmation number - no ticketing system exists yet, so no
    // promise of one is made here.
    const textBody = [
      `Thanks for registering your interest in visiting Alt.FFF on ${EVENT.tradeFairDateLabel} at ${EVENT.venue}.`,
      "",
      "Your registration is pending review. We'll email you once it's been confirmed - if approved, you'll receive a QR code to bring on the day.",
      "",
      "Questions in the meantime? Reach us at enquiries@altfff.com.",
    ].join("\n");
    // TEMPORARY: RESEND_FROM_EMAIL currently points at a verified address on
    // a borrowed Resend account (AgroTalentHub's), not altfff.com - the
    // client's own domain isn't verified in Resend yet. Once it is, change
    // RESEND_FROM_EMAIL in the environment; no code change needed.
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: `Alt.FFF <${fromEmail}>`,
      to: email,
      replyTo: "enquiries@altfff.com",
      subject: "Alt.FFF visit registration received",
      text: textBody,
      html: buildEmailHtml({ heading: "Registration Received", bodyHtml: textToHtml(textBody) }),
    });
    if (sendError) {
      console.error("Resend error (visitor registration):", sendError);
      reportServerError(sendError, {
        route: "/api/visitor-registrations",
        kind: "email",
        extra: { op: "submitter_confirmation" },
      });
    } else {
      console.log("Resend accepted (visitor registration), message id:", sendData?.id);
    }

    // Internal team alert - alongside the submitter confirmation, not instead of it.
    const resolvedCountry = resolveCountryValue(country, countryOther);
    const resolvedInterest = resolveInterestValue(interest, interestOther);
    const resolvedHeardAbout = resolveHeardAboutValue(heardAboutUs, heardAboutUsOther);
    const internalBody = [
      `Name: ${fullName || "-"}`,
      companyName ? `Company: ${companyName}` : null,
      `Email: ${email}`,
      `Phone: ${phone}`,
      socialMediaWebsite ? `Social / website: ${socialMediaWebsite}` : null,
      resolvedCountry ? `Country: ${resolvedCountry}` : null,
      resolvedInterest ? `Interest: ${resolvedInterest}` : null,
      businessType ? `B2B/B2C: ${businessType}` : null,
      resolvedHeardAbout ? `Heard about us: ${resolvedHeardAbout}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const { data: internalData, error: internalError } = await resend.emails.send({
      from: `Alt.FFF Website <${fromEmail}>`,
      to: "enquiries@altfff.com",
      replyTo: email,
      subject: "New visitor registration received",
      text: internalBody,
    });
    if (internalError) {
      console.error("Resend error (visitor internal alert):", internalError);
      reportServerError(internalError, {
        route: "/api/visitor-registrations",
        kind: "email",
        extra: { op: "internal_alert" },
      });
    } else {
      console.log("Resend accepted (visitor internal alert), message id:", internalData?.id);
    }
  } catch (err) {
    console.error("Visitor registration confirmation email failed:", err);
    reportServerError(err, {
      route: "/api/visitor-registrations",
      kind: "email",
      extra: { op: "resend_throw" },
    });
  }

  return NextResponse.json({ ok: true });
}
