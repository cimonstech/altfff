import { NextResponse } from "next/server";
import { Resend } from "resend";

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
  // Honeypot: a field real users never see or fill in (hidden via CSS on
  // the form), so anything filling it in is almost certainly a bot.
  company?: unknown;
};

// No Upstash/rate-limit helper exists in this project yet — the brief was
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

  // Honeypot tripped — pretend success so the bot doesn't learn anything,
  // but never actually send the email.
  if (typeof body.company === "string" && body.company.trim().length > 0) {
    return NextResponse.json({ ok: true });
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

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Fails loudly in server logs rather than silently pretending to send —
    // TODO: set RESEND_API_KEY (and verify a sending domain in Resend)
    // before this route can actually deliver mail.
    console.error("RESEND_API_KEY is not set — contact form email was not sent.");
    return NextResponse.json(
      { ok: false, error: "Sorry, something went wrong on our end. Please email us directly." },
      { status: 500 },
    );
  }

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      // TODO: replace with a sender address on a domain verified in Resend.
      from: "Alt.FFF Website <no-reply@altfff.com>",
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

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { ok: false, error: "Sorry, something went wrong sending your message. Please try again." },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("Contact form send failed:", err);
    return NextResponse.json(
      { ok: false, error: "Sorry, something went wrong sending your message. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
