import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAnonClient } from "@/lib/supabase/anon";
import { EVENT } from "@/lib/constants";
import { buildEmailHtml, textToHtml } from "@/lib/emailTemplate";
import { DECOY_FIELD_NAME, evaluateBotSignals } from "@/lib/botProtection";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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
 */
type Payload = {
  email?: unknown;
  full_name?: unknown;
  phone?: unknown;
  number_attending?: unknown;
  heard_about_us?: unknown;
  company_name?: unknown;
  job_title?: unknown;
  country?: unknown;
  interest?: unknown;
  // Bot-protection fields (JS token, mount timestamp, decoy) are read via
  // evaluateBotSignals - see src/lib/botProtection.ts.
};

function toTrimmedStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  // Combined bot check - see src/lib/botProtection.ts for the strategy and
  // the two generations of honeypot false positives that led here.
  const botCheck = evaluateBotSignals(body as Record<string, unknown>);
  if (botCheck.verdict === "reject") {
    console.warn(`[honeypot] tripped on /api/visitor-registrations (${botCheck.reason}) - submission dropped, fake success returned.`);
    if (process.env.NODE_ENV !== "production") {
      // DEV-ONLY diagnostic - never ships value-logging to production.
      console.warn("[honeypot][dev-only] decoy value:", (body as Record<string, unknown>)[DECOY_FIELD_NAME]);
    }
    return NextResponse.json({ ok: true });
  }
  if (botCheck.verdict === "accept_with_warning") {
    console.warn("[bot-signal] decoy filled but JS token valid on /api/visitor-registrations - accepting (autofill/extension case).");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[bot-signal][dev-only] decoy value:", (body as Record<string, unknown>)[DECOY_FIELD_NAME]);
    }
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";

  // `email` is the only field marked required on either form's current UI -
  // matched exactly, not inventing additional required fields.
  if (!email) {
    return NextResponse.json({ ok: false, error: "Please fill in all required fields." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  const fullName = toTrimmedStringOrNull(body.full_name);
  const phone = toTrimmedStringOrNull(body.phone);
  const heardAboutUs = toTrimmedStringOrNull(body.heard_about_us);
  const companyName = toTrimmedStringOrNull(body.company_name);
  const jobTitle = toTrimmedStringOrNull(body.job_title);
  const country = toTrimmedStringOrNull(body.country);
  const interest = toTrimmedStringOrNull(body.interest);

  let numberAttending: number | null = null;
  if (typeof body.number_attending === "string" && body.number_attending.trim().length > 0) {
    const parsed = Number.parseInt(body.number_attending.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) numberAttending = parsed;
  }

  // Deliberately the session-less anon client, never the cookie-aware
  // server client - see src/lib/supabase/anon.ts for the PGRST303
  // "JWT expired" incident that motivates this. Public form inserts are
  // anonymous by design and must not inherit browser session cookies.
  const supabase = createAnonClient();
  const { error: insertError } = await supabase.from("visitor_registrations").insert({
    email,
    full_name: fullName,
    phone,
    number_attending: numberAttending ?? undefined, // let the column default (1) apply if omitted
    heard_about_us: heardAboutUs,
    company_name: companyName,
    job_title: jobTitle,
    country,
    interest,
  });

  if (insertError) {
    console.error("Visitor registration insert failed:", insertError);
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
      `Thanks for registering to visit Alt.FFF, ${EVENT.dates} at ${EVENT.venue}, ${EVENT.city}.`,
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
    } else {
      console.log("Resend accepted (visitor registration), message id:", sendData?.id);
    }
  } catch (err) {
    console.error("Visitor registration confirmation email failed:", err);
  }

  return NextResponse.json({ ok: true });
}
