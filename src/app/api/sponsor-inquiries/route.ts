import { NextResponse } from "next/server";
import { Resend } from "resend";
import { anonInsertWithId } from "@/lib/anonInsert";
import { createAnonClient } from "@/lib/supabase/anon";
import { EVENT, eventScheduleTextBlock } from "@/lib/constants";
import { buildEmailHtml, textToHtml } from "@/lib/emailTemplate";
import { DECOY_FIELD_NAME, evaluateBotSignals } from "@/lib/botProtection";
import { checkPublicFormRateLimit, RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimit";
import { sponsorInquirySchema, type SponsorInquiryInput } from "@/lib/validation/sponsor";
import { parseWithSchema } from "@/lib/validation/parse";
import { reportServerError } from "@/lib/sentryReport";
import { parseNewsletterOptIn, scheduleMailchimpSync } from "@/lib/mailchimp";
import { emailDomainValidationResponse } from "@/lib/publicFormEmailCheck";
import { resolveCountryValue } from "@/lib/countries";
import { resolveHeardAboutValue } from "@/lib/heardAboutSources";
import { isSponsorFormEnabled, FORM_CLOSED_API_ERROR } from "@/lib/appSettings";
import {
  emailStatusFromResendError,
  emailStatusFromThrownError,
  logMessageFireAndForget,
  MESSAGE_TYPES,
} from "@/lib/messageLog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isSponsorFormEnabled())) {
    return NextResponse.json({ ok: false, error: FORM_CLOSED_API_ERROR }, { status: 403 });
  }

  const rate = await checkPublicFormRateLimit(request, "sponsor-inquiries");
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
    console.warn(`[honeypot] tripped on /api/sponsor-inquiries (${botCheck.reason}) - submission dropped, fake success returned.`);
    if (process.env.NODE_ENV !== "production") {
      // DEV-ONLY diagnostic - never ships value-logging to production.
      console.warn("[honeypot][dev-only] decoy value:", body[DECOY_FIELD_NAME]);
    }
    return NextResponse.json({ ok: true });
  }
  if (botCheck.verdict === "accept_with_warning") {
    console.warn("[bot-signal] decoy filled but JS token valid on /api/sponsor-inquiries - accepting (autofill/extension case).");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[bot-signal][dev-only] decoy value:", body[DECOY_FIELD_NAME]);
    }
  }

  const parsed = parseWithSchema<SponsorInquiryInput>(sponsorInquirySchema, body);
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
    fullName,
    phone,
    hearAbout,
    hearAbout_other,
    linkedin,
    company,
    jobTitle,
    country,
    country_other,
    businessNature,
    newsletter,
  } = parsed.data;
  // Checkbox: FormData only includes a checked box at all, so its presence
  // (any non-empty string, typically "on") means checked.
  const newsletterOptIn = parseNewsletterOptIn(newsletter);

  // Deliberately the session-less anon client, never the cookie-aware
  // server client - see src/lib/supabase/anon.ts for the PGRST303
  // "JWT expired" incident that motivates this. Public form inserts are
  // anonymous by design and must not inherit browser session cookies.
  const supabase = createAnonClient();
  let inquiryId: string;
  try {
    inquiryId = await anonInsertWithId(supabase, "sponsor_inquiries", {
      email,
      full_name: fullName,
      phone,
      company_name: company,
      job_title: jobTitle,
      country: resolveCountryValue(country, country_other),
      nature_of_business: businessNature,
      linkedin_handle: linkedin,
      heard_about_us: resolveHeardAboutValue(hearAbout, hearAbout_other),
      newsletter_opt_in: newsletterOptIn,
    });
  } catch (insertError) {
    console.error("Sponsor inquiry insert failed:", insertError);
    reportServerError(insertError, {
      route: "/api/sponsor-inquiries",
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
      route: "/api/sponsor-inquiries",
      source: "SPONSOR",
      name: fullName,
      company,
      jobTitle,
      natureOfBusiness: businessNature,
      linkedin,
      country: resolveCountryValue(country, country_other),
      heardAbout: resolveHeardAboutValue(hearAbout, hearAbout_other),
      phone,
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    console.error(
      !apiKey
        ? "RESEND_API_KEY is not set - sponsor inquiry confirmation email was not sent."
        : "RESEND_FROM_EMAIL is not set - sponsor inquiry confirmation email was not sent.",
    );
    return NextResponse.json({ ok: true });
  }

  try {
    const resend = new Resend(apiKey);
    // TEMPORARY: RESEND_FROM_EMAIL currently points at a verified address
    // on a borrowed Resend account (AgroTalentHub's), not altfff.com -
    // the client's own domain isn't verified in Resend yet. Once it is,
    // change RESEND_FROM_EMAIL in the environment; no code change needed.
    const textBody = [
      `Thanks for your interest in sponsoring Alt.FFF, ${EVENT.dates} at ${EVENT.venue}.`,
      "",
      eventScheduleTextBlock(),
      "",
      "Your inquiry has been received - our team will follow up with you.",
      "",
      "Questions in the meantime? Reach us at enquiries@altfff.com.",
    ].join("\n");
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: `Alt.FFF <${fromEmail}>`,
      to: email,
      replyTo: "enquiries@altfff.com",
      subject: "We've received your Alt.FFF sponsorship inquiry",
      text: textBody,
      html: buildEmailHtml({ heading: "Sponsorship Inquiry Received", bodyHtml: textToHtml(textBody) }),
    });
    if (sendError) {
      console.error("Resend error (sponsor inquiry):", sendError);
      reportServerError(sendError, {
        route: "/api/sponsor-inquiries",
        kind: "email",
        extra: { op: "submitter_confirmation" },
      });
      logMessageFireAndForget({
        channel: "email",
        messageType: MESSAGE_TYPES.sponsorInquiryConfirmation,
        status: emailStatusFromResendError(sendError),
        recipientEmail: email,
        recipientName: fullName,
        subjectOrSummary: "We've received your Alt.FFF sponsorship inquiry",
        relatedTable: "sponsor_inquiries",
        relatedId: inquiryId,
        errorDetail: sendError.message,
      });
    } else {
      console.log("Resend accepted (sponsor inquiry), message id:", sendData?.id);
      logMessageFireAndForget({
        channel: "email",
        messageType: MESSAGE_TYPES.sponsorInquiryConfirmation,
        status: "sent",
        recipientEmail: email,
        recipientName: fullName,
        subjectOrSummary: "We've received your Alt.FFF sponsorship inquiry",
        relatedTable: "sponsor_inquiries",
        relatedId: inquiryId,
      });
    }

    // Internal team alert - alongside the submitter confirmation, not instead of it.
    const internalBody = [
      `Name: ${fullName}`,
      `Company: ${company}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      country ? `Country: ${country}` : null,
      jobTitle ? `Job title: ${jobTitle}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const { data: internalData, error: internalError } = await resend.emails.send({
      from: `Alt.FFF Website <${fromEmail}>`,
      to: "enquiries@altfff.com",
      replyTo: email,
      subject: "New sponsor inquiry received",
      text: internalBody,
    });
    if (internalError) {
      console.error("Resend error (sponsor internal alert):", internalError);
      reportServerError(internalError, {
        route: "/api/sponsor-inquiries",
        kind: "email",
        extra: { op: "internal_alert" },
      });
      logMessageFireAndForget({
        channel: "email",
        messageType: MESSAGE_TYPES.sponsorInquiryInternal,
        status: emailStatusFromResendError(internalError),
        recipientEmail: "enquiries@altfff.com",
        recipientName: fullName,
        subjectOrSummary: "New sponsor inquiry received",
        relatedTable: "sponsor_inquiries",
        relatedId: inquiryId,
        errorDetail: internalError.message,
      });
    } else {
      console.log("Resend accepted (sponsor internal alert), message id:", internalData?.id);
      logMessageFireAndForget({
        channel: "email",
        messageType: MESSAGE_TYPES.sponsorInquiryInternal,
        status: "sent",
        recipientEmail: "enquiries@altfff.com",
        recipientName: fullName,
        subjectOrSummary: "New sponsor inquiry received",
        relatedTable: "sponsor_inquiries",
        relatedId: inquiryId,
      });
    }
  } catch (err) {
    console.error("Sponsor inquiry confirmation email failed:", err);
    reportServerError(err, {
      route: "/api/sponsor-inquiries",
      kind: "email",
      extra: { op: "resend_throw" },
    });
    logMessageFireAndForget({
      channel: "email",
      messageType: MESSAGE_TYPES.sponsorInquiryConfirmation,
      status: emailStatusFromThrownError(err),
      recipientEmail: email,
      recipientName: fullName,
      subjectOrSummary: "We've received your Alt.FFF sponsorship inquiry",
      relatedTable: "sponsor_inquiries",
      relatedId: inquiryId,
      errorDetail: err instanceof Error ? err.message : "send failed",
    });
  }

  return NextResponse.json({ ok: true });
}
