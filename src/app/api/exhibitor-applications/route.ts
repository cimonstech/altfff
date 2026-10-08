import { NextResponse } from "next/server";
import { Resend } from "resend";
import { anonInsertWithId } from "@/lib/anonInsert";
import { createAnonClient } from "@/lib/supabase/anon";
import { EVENT, eventScheduleTextBlock } from "@/lib/constants";
import { buildEmailHtml, textToHtml } from "@/lib/emailTemplate";
import { DECOY_FIELD_NAME, evaluateBotSignals } from "@/lib/botProtection";
import { checkPublicFormRateLimit, RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimit";
import {
  EXHIBITOR_PACKAGE_MAP,
  EXHIBITOR_SPACE_VALUES,
  exhibitorApplicationSchema,
  type ExhibitorApplicationInput,
} from "@/lib/validation/exhibitor";
import { parseWithSchema } from "@/lib/validation/parse";
import { reportServerError } from "@/lib/sentryReport";
import { parseNewsletterOptIn, scheduleMailchimpSync } from "@/lib/mailchimp";
import { emailDomainValidationResponse } from "@/lib/publicFormEmailCheck";
import { resolveCountryValue } from "@/lib/countries";
import { resolveHeardAboutValue } from "@/lib/heardAboutSources";
import {
  DuplicateRegistrationError,
  EXHIBITOR_BLOCKING_STATUSES,
  EXHIBITOR_DUPLICATE_EMAIL_MESSAGE,
  findBlockingRegistrationByEmail,
  withRegistrationEmailLock,
} from "@/lib/registrationDuplicates";
import { isExhibitorFormEnabled, FORM_CLOSED_API_ERROR } from "@/lib/appSettings";
import {
  emailStatusFromResendError,
  emailStatusFromThrownError,
  logMessageFireAndForget,
  MESSAGE_TYPES,
} from "@/lib/messageLog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isExhibitorFormEnabled())) {
    return NextResponse.json({ ok: false, error: FORM_CLOSED_API_ERROR }, { status: 403 });
  }

  const rate = await checkPublicFormRateLimit(request, "exhibitor-applications");
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
    console.warn(`[honeypot] tripped on /api/exhibitor-applications (${botCheck.reason}) - submission dropped, fake success returned.`);
    if (process.env.NODE_ENV !== "production") {
      // DEV-ONLY diagnostic - never ships value-logging to production.
      console.warn("[honeypot][dev-only] decoy value:", body[DECOY_FIELD_NAME]);
    }
    return NextResponse.json({ ok: true });
  }
  if (botCheck.verdict === "accept_with_warning") {
    console.warn("[bot-signal] decoy filled but JS token valid on /api/exhibitor-applications - accepting (autofill/extension case).");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[bot-signal][dev-only] decoy value:", body[DECOY_FIELD_NAME]);
    }
  }

  const parsed = parseWithSchema<ExhibitorApplicationInput>(exhibitorApplicationSchema, body);
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

  const { email, name, phone, company, title, nature, based, country, country_other, space, hear, hear_other, newsletter } =
    parsed.data;
  const newsletterOptIn = parseNewsletterOptIn(newsletter);
  const packageType =
    space && space in EXHIBITOR_PACKAGE_MAP
      ? EXHIBITOR_PACKAGE_MAP[space as keyof typeof EXHIBITOR_PACKAGE_MAP]
      : null;

  let applicationId: string;
  try {
    applicationId = await withRegistrationEmailLock("exhibitor", email, async () => {
      const existing = await findBlockingRegistrationByEmail(
        "exhibitor_applications",
        email,
        EXHIBITOR_BLOCKING_STATUSES,
      );
      if (existing) {
        throw new DuplicateRegistrationError(EXHIBITOR_DUPLICATE_EMAIL_MESSAGE);
      }

      const supabase = createAnonClient();
      return anonInsertWithId(supabase, "exhibitor_applications", {
        email,
        full_name: name || null,
        phone: phone || null,
        company_name: company || null,
        job_title: title || null,
        nature_of_business: nature || null,
        business_location: based || null,
        country: resolveCountryValue(country, country_other),
        package_type: packageType,
        heard_about_us: resolveHeardAboutValue(hear, hear_other),
        newsletter_opt_in: newsletterOptIn,
      });
    });
  } catch (err) {
    if (err instanceof DuplicateRegistrationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
    }
    console.error("Exhibitor application insert failed:", err);
    reportServerError(err, {
      route: "/api/exhibitor-applications",
      kind: "db",
      extra: { op: "insert" },
    });
    return NextResponse.json(
      { ok: false, error: "Sorry, something went wrong on our end. Please email us directly." },
      { status: 500 },
    );
  }

  const exhibitorSpaceForMailchimp =
    space && (EXHIBITOR_SPACE_VALUES as readonly string[]).includes(space)
      ? (space as (typeof EXHIBITOR_SPACE_VALUES)[number])
      : null;

  if (newsletterOptIn) {
    scheduleMailchimpSync({
      email,
      route: "/api/exhibitor-applications",
      source: "EXHIBITOR",
      name: name || null,
      company: company || null,
      jobTitle: title || null,
      natureOfBusiness: nature || null,
      businessLocation: based || null,
      country: resolveCountryValue(country, country_other),
      space: exhibitorSpaceForMailchimp,
      heardAbout: resolveHeardAboutValue(hear, hear_other),
      phone: phone || null,
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    console.error(
      !apiKey
        ? "RESEND_API_KEY is not set - exhibitor application confirmation email was not sent."
        : "RESEND_FROM_EMAIL is not set - exhibitor application confirmation email was not sent.",
    );
    // The application itself was saved successfully above - don't fail the
    // whole request just because the confirmation email couldn't send.
    return NextResponse.json({ ok: true });
  }

  try {
    const resend = new Resend(apiKey);
    // TEMPORARY: RESEND_FROM_EMAIL currently points at a verified address
    // on a borrowed Resend account (AgroTalentHub's), not altfff.com -
    // the client's own domain isn't verified in Resend yet. Once it is,
    // change RESEND_FROM_EMAIL in the environment; no code change needed.
    const textBody = [
      `Thanks for applying to exhibit at Alt.FFF, ${EVENT.dates} at ${EVENT.venue}.`,
      "",
      eventScheduleTextBlock(),
      "",
      "Your application has been received and is under review. Our team will be in touch.",
      "",
      "Questions in the meantime? Reach us at enquiries@altfff.com.",
    ].join("\n");
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: `Alt.FFF <${fromEmail}>`,
      to: email,
      replyTo: "enquiries@altfff.com",
      subject: "We've received your Alt.FFF exhibitor application",
      text: textBody,
      html: buildEmailHtml({ heading: "Application Received", bodyHtml: textToHtml(textBody) }),
    });
    if (sendError) {
      console.error("Resend error (exhibitor application):", sendError);
      reportServerError(sendError, {
        route: "/api/exhibitor-applications",
        kind: "email",
        extra: { op: "submitter_confirmation" },
      });
      logMessageFireAndForget({
        channel: "email",
        messageType: MESSAGE_TYPES.exhibitorApplicationConfirmation,
        status: emailStatusFromResendError(sendError),
        recipientEmail: email,
        recipientName: name,
        subjectOrSummary: "We've received your Alt.FFF exhibitor application",
        relatedTable: "exhibitor_applications",
        relatedId: applicationId,
        errorDetail: sendError.message,
      });
    } else {
      console.log("Resend accepted (exhibitor application), message id:", sendData?.id);
      logMessageFireAndForget({
        channel: "email",
        messageType: MESSAGE_TYPES.exhibitorApplicationConfirmation,
        status: "sent",
        recipientEmail: email,
        recipientName: name,
        subjectOrSummary: "We've received your Alt.FFF exhibitor application",
        relatedTable: "exhibitor_applications",
        relatedId: applicationId,
      });
    }

    // Internal team alert - alongside the submitter confirmation, not instead of it.
    const internalBody = [
      `Name: ${name || "-"}`,
      company ? `Company: ${company}` : null,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      based ? `Based: ${based}` : null,
      space ? `Package: ${packageType}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const { data: internalData, error: internalError } = await resend.emails.send({
      from: `Alt.FFF Website <${fromEmail}>`,
      to: "enquiries@altfff.com",
      replyTo: email,
      subject: "New exhibitor application received",
      text: internalBody,
    });
    if (internalError) {
      console.error("Resend error (exhibitor internal alert):", internalError);
      reportServerError(internalError, {
        route: "/api/exhibitor-applications",
        kind: "email",
        extra: { op: "internal_alert" },
      });
      logMessageFireAndForget({
        channel: "email",
        messageType: MESSAGE_TYPES.exhibitorApplicationInternal,
        status: emailStatusFromResendError(internalError),
        recipientEmail: "enquiries@altfff.com",
        recipientName: name,
        subjectOrSummary: "New exhibitor application received",
        relatedTable: "exhibitor_applications",
        relatedId: applicationId,
        errorDetail: internalError.message,
      });
    } else {
      console.log("Resend accepted (exhibitor internal alert), message id:", internalData?.id);
      logMessageFireAndForget({
        channel: "email",
        messageType: MESSAGE_TYPES.exhibitorApplicationInternal,
        status: "sent",
        recipientEmail: "enquiries@altfff.com",
        recipientName: name,
        subjectOrSummary: "New exhibitor application received",
        relatedTable: "exhibitor_applications",
        relatedId: applicationId,
      });
    }
  } catch (err) {
    console.error("Exhibitor application confirmation email failed:", err);
    reportServerError(err, {
      route: "/api/exhibitor-applications",
      kind: "email",
      extra: { op: "resend_throw" },
    });
    logMessageFireAndForget({
      channel: "email",
      messageType: MESSAGE_TYPES.exhibitorApplicationConfirmation,
      status: emailStatusFromThrownError(err),
      recipientEmail: email,
      recipientName: name,
      subjectOrSummary: "We've received your Alt.FFF exhibitor application",
      relatedTable: "exhibitor_applications",
      relatedId: applicationId,
      errorDetail: err instanceof Error ? err.message : "send failed",
    });
  }

  return NextResponse.json({ ok: true });
}
