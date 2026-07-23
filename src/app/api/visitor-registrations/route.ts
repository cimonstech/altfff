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

export const runtime = "nodejs";

/**
 * Shared by both visitor-facing forms - the quick modal (VisitorRegisterForm.tsx)
 * and the fuller inline form on /visit (VisitRegisterForm.tsx). Both forms use
 * explicit `name` attributes matching these canonical keys directly (see each
 * component), so this route doesn't need to know which form a submission came
 * from - it just inserts whichever optional fields are present.
 *
 * number_attending, company_name, job_title, country, and interest are only
 * ever sent by one form or the other - all are nullable columns (see
 * migration 0002), so that's expected and fine.
 *
 * Server schema requires email only (same as before). The /visit page uses a
 * stricter client schema that also requires full_name.
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

  const {
    email,
    full_name: fullName,
    phone,
    number_attending: numberAttending,
    heard_about_us: heardAboutUs,
    company_name: companyName,
    job_title: jobTitle,
    country,
    interest,
  } = parsed.data;

  // Deliberately the session-less anon client, never the cookie-aware
  // server client - see src/lib/supabase/anon.ts for the PGRST303
  // "JWT expired" incident that motivates this. Public form inserts are
  // anonymous by design and must not inherit browser session cookies.
  const supabase = createAnonClient();
  const { error: insertError } = await supabase.from("visitor_registrations").insert({
    email,
    full_name: fullName || null,
    phone: phone || null,
    number_attending: numberAttending ?? undefined, // let the column default (1) apply if omitted
    heard_about_us: heardAboutUs || null,
    company_name: companyName || null,
    job_title: jobTitle || null,
    country: country || null,
    interest: interest || null,
  });

  if (insertError) {
    console.error("Visitor registration insert failed:", insertError);
    reportServerError(insertError, {
      route: "/api/visitor-registrations",
      kind: "db",
      extra: { op: "insert" },
    });
    return NextResponse.json(
      { ok: false, error: "Sorry, something went wrong on our end. Please email us directly." },
      { status: 500 },
    );
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
      `Thanks for registering to visit Alt.FFF, ${EVENT.dates} at ${EVENT.venue}.`,
      "",
      "We look forward to seeing you there.",
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
      subject: "You're registered to visit Alt.FFF",
      text: textBody,
      html: buildEmailHtml({ heading: "You're Registered", bodyHtml: textToHtml(textBody) }),
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
    const internalBody = [
      `Name: ${fullName || "—"}`,
      companyName ? `Company: ${companyName}` : null,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      country ? `Country: ${country}` : null,
      numberAttending != null ? `Number attending: ${numberAttending}` : null,
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
