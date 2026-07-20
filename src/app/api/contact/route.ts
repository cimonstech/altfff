import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAnonClient } from "@/lib/supabase/anon";
import { DECOY_FIELD_NAME, evaluateBotSignals } from "@/lib/botProtection";

export const runtime = "nodejs";

// No zod in this project yet, so this is a small set of plain checks
// rather than pulling in a new validation dependency for one route.
function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type ContactPayload = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  // Bot-protection fields (JS token, mount timestamp, decoy) are read via
  // evaluateBotSignals - see src/lib/botProtection.ts.
};

// No Upstash/rate-limit helper exists in this project yet - the brief was
// explicit not to add a new dependency just for this route, so this
// deliberately ships without rate limiting. Worth revisiting if spam
// becomes a real problem.

export async function POST(request: Request) {
  let body: ContactPayload;
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
  const botCheck = evaluateBotSignals(body as Record<string, unknown>);
  if (botCheck.verdict === "reject") {
    console.warn(`[honeypot] tripped on /api/contact (${botCheck.reason}) - submission dropped, fake success returned.`);
    if (process.env.NODE_ENV !== "production") {
      // DEV-ONLY diagnostic - reveals what autofill/extensions inject.
      // Never ships value-logging to production.
      console.warn("[honeypot][dev-only] decoy value:", (body as Record<string, unknown>)[DECOY_FIELD_NAME]);
    }
    return NextResponse.json({ ok: true });
  }
  if (botCheck.verdict === "accept_with_warning") {
    console.warn("[bot-signal] decoy filled but JS token valid on /api/contact - accepting (autofill/extension case).");
    if (process.env.NODE_ENV !== "production") {
      console.warn("[bot-signal][dev-only] decoy value:", (body as Record<string, unknown>)[DECOY_FIELD_NAME]);
    }
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!firstName || !lastName || !email || !message) {
    return NextResponse.json({ ok: false, error: "Please fill in all required fields." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

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
  const { error: insertError } = await supabase.from("contact_messages").insert({
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || null,
    message,
  });
  if (insertError) {
    console.error("Contact message insert failed:", insertError);
    return NextResponse.json(
      { ok: false, error: "Sorry, something went wrong on our end. Please email us directly." },
      { status: 500 },
    );
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
    return NextResponse.json({ ok: true });
  }

  try {
    const resend = new Resend(apiKey);
    // TEMPORARY: RESEND_FROM_EMAIL currently points at a verified address on
    // a borrowed Resend account (AgroTalentHub's), not altfff.com - the
    // client's own domain isn't verified in Resend yet. Once it is, change
    // RESEND_FROM_EMAIL in the environment; no code change needed.
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: `Alt.FFF Website <${fromEmail}>`,
      to: "enquiries@altfff.com",
      replyTo: email,
      subject: `New contact form enquiry from ${firstName} ${lastName}`,
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
    } else {
      console.log("Resend accepted (contact form), message id:", sendData?.id);
    }
  } catch (err) {
    console.error("Contact form email send failed:", err);
  }

  return NextResponse.json({ ok: true });
}


