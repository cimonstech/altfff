import { NextResponse } from "next/server";
import { Resend } from "resend";
import { anonInsertWithId } from "@/lib/anonInsert";
import { createAnonClient } from "@/lib/supabase/anon";
import { DECOY_FIELD_NAME, evaluateBotSignals } from "@/lib/botProtection";
import { checkPublicFormRateLimit, RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimit";
import { contactSchema, type ContactInput } from "@/lib/validation/contact";
import { parseWithSchema } from "@/lib/validation/parse";
import { reportServerError } from "@/lib/sentryReport";
import { parseNewsletterOptIn, scheduleMailchimpSync } from "@/lib/mailchimp";
import { emailDomainValidationResponse } from "@/lib/publicFormEmailCheck";
import {
  emailStatusFromResendError,
  emailStatusFromThrownError,
  logMessageFireAndForget,
  MESSAGE_TYPES,
} from "@/lib/messageLog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rate = await checkPublicFormRateLimit(request, "contact");
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
  // the two generations of honeypot false positives (autofill, then a
  // form-filler extension) that led here. Reject still returns fake success
  // so bots learn nothing, but is ALWAYS logged - a dropped submission must
  // never be invisible on the server.
  const botCheck = evaluateBotSignals(body);
  if (botCheck.verdict === "reject") {
    console.warn(`[honeypot] tripped on /api/contact (${botCheck.reason}) - submission dropped, fake success returned.`);
    if (process.env.NODE_ENV !== "production") {
      // DEV-ONLY diagnostic - reveals what autofill/extensions inject.
      // Never ships value-logging to production.
      console.warn("[honeypot][dev-only] decoy value:", body[DECOY_FIELD_NAME]);
    }
    return NextResponse.json({ ok: true });
  }
  if (botCheck.verdict === "accept_with_warning") {
    console.warn("[bot-signal] decoy filled but JS token valid on /api/contact - accepting (autofill/extension case).");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[bot-signal][dev-only] decoy value:", body[DECOY_FIELD_NAME]);
    }
  }

  const parsed = parseWithSchema<ContactInput>(contactSchema, body);
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

  const { firstName, lastName, email, phone, message, newsletter } = parsed.data;
  const newsletterOptIn = parseNewsletterOptIn(newsletter);

  // The database write is the real submission now - a message landing
  // safely in contact_messages matters more than the confirmation email
  // firing in the same request cycle, same graceful pattern as the three
  // newer routes (exhibitor-applications, sponsor-inquiries,
  // visitor-registrations). Only a DB failure fails the whole request;
  // an email failure below is logged, never surfaced as a submission error.
  // Deliberately the session-less anon client, never the cookie-aware
  // server client - see src/lib/supabase/anon.ts for the PGRST303
  // "JWT expired" incident that motivates this. Public form inserts are
  // anonymous by design and must not inherit browser session cookies.
  const supabase = createAnonClient();
  const contactName = `${firstName} ${lastName}`.trim();
  let contactId: string;
  try {
    contactId = await anonInsertWithId(supabase, "contact_messages", {
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || null,
      message,
      newsletter_opt_in: newsletterOptIn,
    });
  } catch (insertError) {
    console.error("Contact message insert failed:", insertError);
    reportServerError(insertError, {
      route: "/api/contact",
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
      route: "/api/contact",
      source: "CONTACT",
      firstName,
      lastName,
      message,
      phone: phone || null,
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    // Logged, not returned - the message was still saved successfully above.
    console.error(
      !apiKey
        ? "RESEND_API_KEY is not set - contact form email was not sent."
        : "RESEND_FROM_EMAIL is not set - contact form email was not sent.",
    );
    logMessageFireAndForget({
      channel: "email",
      messageType: MESSAGE_TYPES.contactInternal,
      status: "failed",
      recipientEmail: "enquiries@altfff.com",
      recipientName: contactName,
      subjectOrSummary: `New contact form enquiry from ${contactName}`,
      relatedTable: "contact_messages",
      relatedId: contactId,
      errorDetail: "Email sending is not configured.",
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const resend = new Resend(apiKey);
    const subject = `New contact form enquiry from ${firstName} ${lastName}`;
    // TEMPORARY: RESEND_FROM_EMAIL currently points at a verified address on
    // a borrowed Resend account (AgroTalentHub's), not altfff.com - the
    // client's own domain isn't verified in Resend yet. Once it is, change
    // RESEND_FROM_EMAIL in the environment; no code change needed.
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: `Alt.FFF Website <${fromEmail}>`,
      to: "enquiries@altfff.com",
      replyTo: email,
      subject,
      text: [
        `Name: ${firstName} ${lastName}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        "",
        message,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    if (sendError) {
      console.error("Resend error (contact form):", sendError);
      reportServerError(sendError, { route: "/api/contact", kind: "email", extra: { op: "resend" } });
      logMessageFireAndForget({
        channel: "email",
        messageType: MESSAGE_TYPES.contactInternal,
        status: emailStatusFromResendError(sendError),
        recipientEmail: "enquiries@altfff.com",
        recipientName: contactName,
        subjectOrSummary: subject,
        relatedTable: "contact_messages",
        relatedId: contactId,
        errorDetail: sendError.message,
      });
    } else {
      console.log("Resend accepted (contact form), message id:", sendData?.id);
      logMessageFireAndForget({
        channel: "email",
        messageType: MESSAGE_TYPES.contactInternal,
        status: "sent",
        recipientEmail: "enquiries@altfff.com",
        recipientName: contactName,
        subjectOrSummary: subject,
        relatedTable: "contact_messages",
        relatedId: contactId,
      });
    }
  } catch (err) {
    console.error("Contact form email send failed:", err);
    reportServerError(err, { route: "/api/contact", kind: "email", extra: { op: "resend_throw" } });
    logMessageFireAndForget({
      channel: "email",
      messageType: MESSAGE_TYPES.contactInternal,
      status: emailStatusFromThrownError(err),
      recipientEmail: "enquiries@altfff.com",
      recipientName: contactName,
      subjectOrSummary: `New contact form enquiry from ${contactName}`,
      relatedTable: "contact_messages",
      relatedId: contactId,
      errorDetail: err instanceof Error ? err.message : "send failed",
    });
  }

  return NextResponse.json({ ok: true });
}
