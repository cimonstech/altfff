import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAnonClient } from "@/lib/supabase/anon";
import { EVENT } from "@/lib/constants";
import { buildEmailHtml, textToHtml } from "@/lib/emailTemplate";
import { DECOY_FIELD_NAME, evaluateBotSignals } from "@/lib/botProtection";
import { checkPublicFormRateLimit, RATE_LIMIT_ERROR_MESSAGE } from "@/lib/rateLimit";
import {
  EXHIBITOR_PACKAGE_MAP,
  exhibitorApplicationSchema,
  type ExhibitorApplicationInput,
} from "@/lib/validation/exhibitor";
import { parseWithSchema } from "@/lib/validation/parse";
import { reportServerError } from "@/lib/sentryReport";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const { email, name, phone, company, title, nature, based, country, space, hear } = parsed.data;
  const packageType =
    space && space in EXHIBITOR_PACKAGE_MAP
      ? EXHIBITOR_PACKAGE_MAP[space as keyof typeof EXHIBITOR_PACKAGE_MAP]
      : null;

  // Deliberately the session-less anon client, never the cookie-aware
  // server client - see src/lib/supabase/anon.ts for the PGRST303
  // "JWT expired" incident that motivates this. Public form inserts are
  // anonymous by design and must not inherit browser session cookies.
  const supabase = createAnonClient();
  const { error: insertError } = await supabase.from("exhibitor_applications").insert({
    email,
    full_name: name || null,
    phone: phone || null,
    company_name: company || null,
    job_title: title || null,
    nature_of_business: nature || null,
    business_location: based || null,
    country: country || null,
    package_type: packageType,
    heard_about_us: hear || null,
  });

  if (insertError) {
    console.error("Exhibitor application insert failed:", insertError);
    reportServerError(insertError, {
      route: "/api/exhibitor-applications",
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
      `Thanks for applying to exhibit at Alt.FFF, ${EVENT.dates} at ${EVENT.venue}, ${EVENT.city}.`,
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
    } else {
      console.log("Resend accepted (exhibitor application), message id:", sendData?.id);
    }

    // Internal team alert - alongside the submitter confirmation, not instead of it.
    const internalBody = [
      `Name: ${name || "—"}`,
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
    } else {
      console.log("Resend accepted (exhibitor internal alert), message id:", internalData?.id);
    }
  } catch (err) {
    console.error("Exhibitor application confirmation email failed:", err);
    reportServerError(err, {
      route: "/api/exhibitor-applications",
      kind: "email",
      extra: { op: "resend_throw" },
    });
  }

  return NextResponse.json({ ok: true });
}
