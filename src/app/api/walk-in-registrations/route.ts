import { after, NextResponse } from "next/server";
import { Resend } from "resend";
import { anonInsertWithId } from "@/lib/anonInsert";
import { createAnonClient } from "@/lib/supabase/anon";
import { EVENT, eventScheduleTextBlock } from "@/lib/constants";
import { buildEmailHtml, textToHtml } from "@/lib/emailTemplate";
import { DECOY_FIELD_NAME, evaluateBotSignals } from "@/lib/botProtection";
import { checkPublicFormRateLimit, RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimit";
import { walkInRegistrationSchema, type WalkInRegistrationInput } from "@/lib/validation/walkIn";
import { parseWithSchema } from "@/lib/validation/parse";
import { reportServerError } from "@/lib/sentryReport";
import { parseNewsletterOptIn, scheduleMailchimpSync } from "@/lib/mailchimp";
import { emailDomainValidationResponse } from "@/lib/publicFormEmailCheck";
import { buildDoorWelcomeSms, sendSms, shouldSendDoorWelcomeSms } from "@/lib/sms";
import {
  emailStatusFromResendError,
  emailStatusFromThrownError,
  logMessageFireAndForget,
  MESSAGE_TYPES,
} from "@/lib/messageLog";
import {
  DuplicateRegistrationError,
  VISITOR_BLOCKING_STATUSES,
  VISITOR_DUPLICATE_EMAIL_MESSAGE,
  findBlockingRegistrationByEmail,
  withRegistrationEmailLock,
} from "@/lib/registrationDuplicates";
import {
  isWalkInRegistrationEnabled,
  WALK_IN_REGISTRATION_CLOSED_API_ERROR,
} from "@/lib/appSettings";

export const runtime = "nodejs";

function buildWalkInConfirmationEmail(fullName: string): { subject: string; textBody: string } {
  const greeting = fullName.trim() ? `Hi ${fullName.trim()},` : "Hi,";
  const textBody = [
    greeting,
    "",
    `Welcome to Alt.FFF. You're registered for ${EVENT.tradeFairDateLabel} at ${EVENT.venue}.`,
    "",
    eventScheduleTextBlock(),
    "",
    "You're all set for today. No QR code is needed for walk-in registration.",
    "",
    "We look forward to seeing you inside.",
    "",
    "Questions? Reach us at enquiries@altfff.com.",
  ].join("\n");
  return {
    subject: "Welcome to Alt.FFF",
    textBody,
  };
}

function buildWalkInConfirmationSms(fullName: string): string {
  return buildDoorWelcomeSms(fullName);
}

type WalkInConfirmationPayload = {
  registrationId: string;
  email: string;
  fullName: string;
  phone: string;
};

/** Fail-open confirmation after the registration row is saved — SMS for Ghana numbers, email otherwise. */
async function sendWalkInConfirmationComms({
  registrationId,
  email,
  fullName,
  phone,
}: WalkInConfirmationPayload): Promise<void> {
  if (shouldSendDoorWelcomeSms(phone)) {
    try {
      const smsMessage = buildWalkInConfirmationSms(fullName);
      const smsResult = await sendSms(phone, smsMessage, "AltFFF Walk-in Welcome", {
        messageType: MESSAGE_TYPES.walkInConfirmationSms,
        recipientEmail: email,
        recipientName: fullName,
        subjectOrSummary: "Walk-in welcome SMS",
        relatedTable: "visitor_registrations",
        relatedId: registrationId,
      });
      if (!smsResult.success) {
        console.error("[walk-in] SMS failed (registration still saved):", smsResult.error);
        reportServerError(new Error(smsResult.error ?? "Walk-in SMS failed"), {
          route: "/api/walk-in-registrations",
          kind: "sms",
          extra: { op: "walk_in_confirmation", failOpen: true },
        });
      } else {
        console.log("[walk-in] SMS accepted for walk-in confirmation.");
      }
    } catch (err) {
      console.error("[walk-in] SMS threw (registration still saved):", err);
      reportServerError(err, {
        route: "/api/walk-in-registrations",
        kind: "sms",
        extra: { op: "walk_in_confirmation_throw", failOpen: true },
      });
    }
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (apiKey && fromEmail) {
    try {
      const resend = new Resend(apiKey);
      const { subject, textBody } = buildWalkInConfirmationEmail(fullName);
      const { data: sendData, error: sendError } = await resend.emails.send({
        from: `Alt.FFF <${fromEmail}>`,
        to: email,
        replyTo: "enquiries@altfff.com",
        subject,
        text: textBody,
        html: buildEmailHtml({ heading: "Welcome to Alt.FFF", bodyHtml: textToHtml(textBody) }),
      });
      if (sendError) {
        console.error("Resend error (walk-in registration):", sendError);
        reportServerError(sendError, {
          route: "/api/walk-in-registrations",
          kind: "email",
          extra: { op: "submitter_confirmation" },
        });
        logMessageFireAndForget({
          channel: "email",
          messageType: MESSAGE_TYPES.walkInConfirmationEmail,
          status: emailStatusFromResendError(sendError),
          recipientEmail: email,
          recipientName: fullName,
          subjectOrSummary: "Welcome to Alt.FFF",
          relatedTable: "visitor_registrations",
          relatedId: registrationId,
          errorDetail: sendError.message,
        });
      } else {
        console.log("Resend accepted (walk-in registration), message id:", sendData?.id);
        logMessageFireAndForget({
          channel: "email",
          messageType: MESSAGE_TYPES.walkInConfirmationEmail,
          status: "sent",
          recipientEmail: email,
          recipientName: fullName,
          subjectOrSummary: "Welcome to Alt.FFF",
          relatedTable: "visitor_registrations",
          relatedId: registrationId,
        });
      }
    } catch (err) {
      console.error("Walk-in registration confirmation email failed:", err);
      reportServerError(err, {
        route: "/api/walk-in-registrations",
        kind: "email",
        extra: { op: "resend_throw" },
      });
      logMessageFireAndForget({
        channel: "email",
        messageType: MESSAGE_TYPES.walkInConfirmationEmail,
        status: emailStatusFromThrownError(err),
        recipientEmail: email,
        recipientName: fullName,
        subjectOrSummary: "Welcome to Alt.FFF",
        relatedTable: "visitor_registrations",
        relatedId: registrationId,
        errorDetail: err instanceof Error ? err.message : "send failed",
      });
    }
  } else {
    console.error(
      !apiKey
        ? "RESEND_API_KEY is not set - walk-in confirmation email was not sent."
        : "RESEND_FROM_EMAIL is not set - walk-in confirmation email was not sent.",
    );
    logMessageFireAndForget({
      channel: "email",
      messageType: MESSAGE_TYPES.walkInConfirmationEmail,
      status: "failed",
      recipientEmail: email,
      recipientName: fullName,
      subjectOrSummary: "Welcome to Alt.FFF",
      relatedTable: "visitor_registrations",
      relatedId: registrationId,
      errorDetail: "Email sending is not configured.",
    });
  }
}

export async function POST(request: Request) {
  if (!(await isWalkInRegistrationEnabled())) {
    return NextResponse.json({ ok: false, error: WALK_IN_REGISTRATION_CLOSED_API_ERROR }, { status: 403 });
  }

  const rate = await checkPublicFormRateLimit(request, "walk-in-registrations");
  if (!rate.success) {
    return NextResponse.json({ ok: false, error: RATE_LIMIT_ERROR_MESSAGE }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const botCheck = evaluateBotSignals(body);
  if (botCheck.verdict === "reject") {
    console.warn(`[honeypot] tripped on /api/walk-in-registrations (${botCheck.reason}) - submission dropped, fake success returned.`);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[honeypot][dev-only] decoy value:", body[DECOY_FIELD_NAME]);
    }
    return NextResponse.json({ ok: true });
  }
  if (botCheck.verdict === "accept_with_warning") {
    console.warn("[bot-signal] decoy filled but JS token valid on /api/walk-in-registrations - accepting (autofill/extension case).");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[bot-signal][dev-only] decoy value:", body[DECOY_FIELD_NAME]);
    }
  }

  const parsed = parseWithSchema<WalkInRegistrationInput>(walkInRegistrationSchema, body);
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
    newsletter,
  } = parsed.data;
  const newsletterOptIn = parseNewsletterOptIn(newsletter);
  const now = new Date().toISOString();

  let registrationId: string;
  try {
    registrationId = await withRegistrationEmailLock("visitor", email, async () => {
      const existing = await findBlockingRegistrationByEmail(
        "visitor_registrations",
        email,
        VISITOR_BLOCKING_STATUSES,
      );
      if (existing) {
        throw new DuplicateRegistrationError(VISITOR_DUPLICATE_EMAIL_MESSAGE);
      }

      const supabase = createAnonClient();
      return anonInsertWithId(supabase, "visitor_registrations", {
        email,
        full_name: fullName,
        phone,
        company_name: companyName || null,
        source: "walk_in",
        status: "confirmed",
        status_updated_at: now,
        newsletter_opt_in: newsletterOptIn,
      });
    });
  } catch (err) {
    if (err instanceof DuplicateRegistrationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
    }
    console.error("Walk-in registration insert failed:", err);
    reportServerError(err, {
      route: "/api/walk-in-registrations",
      kind: "db",
      extra: { op: "insert" },
    });
    return NextResponse.json(
      { ok: false, error: "Sorry, something went wrong on our end. Please ask staff for help." },
      { status: 500 },
    );
  }

  if (newsletterOptIn) {
    scheduleMailchimpSync({
      email,
      route: "/api/walk-in-registrations",
      source: "WALKIN",
      name: fullName,
      company: companyName || null,
      phone,
    });
  }

  after(() => sendWalkInConfirmationComms({ registrationId, email, fullName, phone }));

  return NextResponse.json({
    ok: true,
    confirmationChannel: shouldSendDoorWelcomeSms(phone) ? "sms" : "email",
  });
}
