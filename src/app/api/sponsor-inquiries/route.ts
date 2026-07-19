import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { EVENT } from "@/lib/constants";
import { buildEmailHtml, textToHtml } from "@/lib/emailTemplate";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type Payload = {
  email?: unknown;
  fullName?: unknown;
  phone?: unknown;
  hearAbout?: unknown;
  linkedin?: unknown;
  company?: unknown;
  jobTitle?: unknown;
  businessNature?: unknown;
  newsletter?: unknown;
  // Honeypot - see SponsorshipForm.tsx.
  website?: unknown;
};

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot tripped - pretend success, do nothing.
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const hearAbout = typeof body.hearAbout === "string" ? body.hearAbout.trim() : "";
  const linkedin = typeof body.linkedin === "string" ? body.linkedin.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const jobTitle = typeof body.jobTitle === "string" ? body.jobTitle.trim() : "";
  const businessNature = typeof body.businessNature === "string" ? body.businessNature.trim() : "";
  // Checkbox: FormData only includes a checked box at all, so its presence
  // (any non-empty string, typically "on") means checked.
  const newsletterOptIn = typeof body.newsletter === "string" && body.newsletter.length > 0;

  // Matches every field currently marked `required` in SponsorshipForm.tsx's
  // UI exactly - not inventing additional required fields.
  if (!email || !fullName || !phone || !hearAbout || !linkedin || !company || !jobTitle || !businessNature) {
    return NextResponse.json({ ok: false, error: "Please fill in all required fields." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("sponsor_inquiries").insert({
    email,
    full_name: fullName,
    phone,
    company_name: company,
    job_title: jobTitle,
    nature_of_business: businessNature,
    linkedin_handle: linkedin,
    heard_about_us: hearAbout,
    newsletter_opt_in: newsletterOptIn,
  });

  if (insertError) {
    console.error("Sponsor inquiry insert failed:", insertError);
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
        ? "RESEND_API_KEY is not set - sponsor inquiry confirmation email was not sent."
        : "RESEND_FROM_EMAIL is not set - sponsor inquiry confirmation email was not sent.",
    );
    return NextResponse.json({ ok: true });
  }

  try {
    const resend = new Resend(apiKey);
    const textBody = [
      `Thanks for your interest in sponsoring Alt.FFF, ${EVENT.dates} at ${EVENT.venue}, ${EVENT.city}.`,
      "",
      "Your inquiry has been received - our team will follow up with you.",
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
      subject: "We've received your Alt.FFF sponsorship inquiry",
      text: textBody,
      html: buildEmailHtml({ heading: "Sponsorship Inquiry Received", bodyHtml: textToHtml(textBody) }),
    });
    if (sendError) {
      console.error("Resend error (sponsor inquiry):", sendError);
    } else {
      console.log("Resend accepted (sponsor inquiry), message id:", sendData?.id);
    }
  } catch (err) {
    console.error("Sponsor inquiry confirmation email failed:", err);
  }

  return NextResponse.json({ ok: true });
}
