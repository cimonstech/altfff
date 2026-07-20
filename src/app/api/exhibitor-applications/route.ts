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

// Matches ExhibitApplicationForm.tsx's <FloatingSelect id="space"> option
// values exactly.
const PACKAGE_MAP: Record<string, string> = {
  standard: "standard_booth",
  medium: "medium_booth",
  premium: "premium_booth",
  innovation: "innovation_pod",
};

type Payload = {
  email?: unknown;
  name?: unknown;
  phone?: unknown;
  company?: unknown;
  title?: unknown;
  nature?: unknown;
  based?: unknown;
  country?: unknown;
  space?: unknown;
  hear?: unknown;
  // Bot-protection fields (JS token, mount timestamp, decoy) are read via
  // evaluateBotSignals - see src/lib/botProtection.ts.
};

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
    console.warn(`[honeypot] tripped on /api/exhibitor-applications (${botCheck.reason}) - submission dropped, fake success returned.`);
    if (process.env.NODE_ENV !== "production") {
      // DEV-ONLY diagnostic - never ships value-logging to production.
      console.warn("[honeypot][dev-only] decoy value:", (body as Record<string, unknown>)[DECOY_FIELD_NAME]);
    }
    return NextResponse.json({ ok: true });
  }
  if (botCheck.verdict === "accept_with_warning") {
    console.warn("[bot-signal] decoy filled but JS token valid on /api/exhibitor-applications - accepting (autofill/extension case).");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[bot-signal][dev-only] decoy value:", (body as Record<string, unknown>)[DECOY_FIELD_NAME]);
    }
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const nature = typeof body.nature === "string" ? body.nature.trim() : "";
  const based = typeof body.based === "string" ? body.based.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";
  const space = typeof body.space === "string" ? body.space.trim() : "";
  const hear = typeof body.hear === "string" ? body.hear.trim() : "";

  // Only `email` is marked required in ExhibitApplicationForm.tsx's current
  // UI - matched exactly here, not inventing additional required fields.
  if (!email) {
    return NextResponse.json({ ok: false, error: "Please fill in all required fields." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

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
    package_type: PACKAGE_MAP[space] ?? null,
    heard_about_us: hear || null,
  });

  if (insertError) {
    console.error("Exhibitor application insert failed:", insertError);
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
    const textBody = [
      `Thanks for applying to exhibit at Alt.FFF, ${EVENT.dates} at ${EVENT.venue}, ${EVENT.city}.`,
      "",
      "Your application has been received and is under review. Our team will be in touch.",
      "",
      "Questions in the meantime? Reach us at enquiries@altfff.com.",
    ].join("\n");
    const { data: sendData, error: sendError } = await resend.emails.send({
      // TEMPORARY: RESEND_FROM_EMAIL currently points at a verified address
      // on a borrowed Resend account (AgroTalentHub's), not altfff.com -
      // the client's own domain isn't verified in Resend yet. Once it is,
      // change RESEND_FROM_EMAIL in the environment; no code change needed.
      from: `Alt.FFF <${fromEmail}>`,
      to: email,
      replyTo: "enquiries@altfff.com",
      subject: "We've received your Alt.FFF exhibitor application",
      text: textBody,
      html: buildEmailHtml({ heading: "Application Received", bodyHtml: textToHtml(textBody) }),
    });
    if (sendError) {
      console.error("Resend error (exhibitor application):", sendError);
    } else {
      console.log("Resend accepted (exhibitor application), message id:", sendData?.id);
    }
  } catch (err) {
    console.error("Exhibitor application confirmation email failed:", err);
  }

  return NextResponse.json({ ok: true });
}
