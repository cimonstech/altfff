import QRCode from "qrcode";
import { Resend } from "resend";
import { EVENT } from "@/lib/constants";
import { buildEmailHtml, escapeHtml, textToHtml } from "@/lib/emailTemplate";
import { reportServerError } from "@/lib/sentryReport";
import { generateVisitorTicketPdf } from "@/lib/visitorTicketPdf";

export { generateQrToken } from "@/lib/qrToken";
export { normalizeCheckInToken, QR_TOKEN_PREFIX } from "@/lib/qrToken";

export type VisitorRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  qr_token: string | null;
};

function resendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return null;
  return { resend: new Resend(apiKey), fromEmail };
}

/** PNG buffer encoding only the token string (not a URL). */
export async function qrCodePngForToken(token: string): Promise<Buffer> {
  return QRCode.toBuffer(token, {
    type: "png",
    margin: 1,
    width: 480,
    errorCorrectionLevel: "M",
  });
}

export async function sendVisitorApprovedEmail(visitor: VisitorRow, qrToken: string): Promise<boolean> {
  const client = resendClient();
  if (!client) {
    console.error("RESEND is not configured - visitor approval QR email was not sent.");
    return false;
  }

  const greeting = visitor.full_name?.trim() ? `Hi ${visitor.full_name.trim()},` : "Hi,";
  const entryCodeLine = `Your entry code: ${qrToken}`;
  const bodyIntro = [
    greeting,
    "",
    `Your registration to visit Alt.FFF on ${EVENT.tradeFairDateLabel} has been approved.`,
    "",
    `Venue: ${EVENT.venue}`,
    "",
  ].join("\n");
  const textBody = [
    bodyIntro,
    entryCodeLine,
    "",
    "Your QR code is below and attached as a printable PDF ticket. Please bring it with you on the day - a screenshot on your phone or a printed copy both work.",
    "",
    "We look forward to seeing you there.",
    "",
    "Questions? Email enquiries@altfff.com.",
  ].join("\n");

  try {
    const png = await qrCodePngForToken(qrToken);
    const pdf = await generateVisitorTicketPdf(visitor, qrToken, png);

    const tokenHtml = `<p style="margin:16px 0 8px 0;text-align:center;font-family:ui-monospace,Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:0.04em;color:#1a1a1a;">${escapeHtml(entryCodeLine)}</p>`;
    const qrHtml = `<p style="margin:8px 0 0 0;text-align:center;"><img src="cid:visitor-qr" alt="Your Alt.FFF entry QR code" width="240" height="240" style="display:block;margin:0 auto;border:0;" /></p>`;

    const { error } = await client.resend.emails.send({
      from: `Alt.FFF <${client.fromEmail}>`,
      to: visitor.email,
      replyTo: "enquiries@altfff.com",
      subject: "Your Alt.FFF visit is confirmed - QR code inside",
      text: textBody,
      html: buildEmailHtml({
        heading: "Visit Confirmed",
        bodyHtml: textToHtml(bodyIntro) + tokenHtml + qrHtml,
      }),
      attachments: [
        {
          filename: "alt-fff-entry-qr.png",
          content: png.toString("base64"),
          contentId: "visitor-qr",
        },
        {
          filename: "alt-fff-entry-ticket.pdf",
          content: pdf.toString("base64"),
        },
      ],
    });
    if (error) {
      console.error("Resend error (visitor approved):", error);
      reportServerError(error, {
        route: "visitor-vetting",
        kind: "email",
        extra: { op: "visitor_approved", visitor_id: visitor.id },
      });
      return false;
    }
    return true;
  } catch (err) {
    console.error("Visitor approval email failed:", err);
    reportServerError(err, {
      route: "visitor-vetting",
      kind: "email",
      extra: { op: "visitor_approved_throw", visitor_id: visitor.id },
    });
    return false;
  }
}

export async function sendVisitorDeclinedEmail(visitor: VisitorRow): Promise<boolean> {
  const client = resendClient();
  if (!client) {
    console.error("RESEND is not configured - visitor decline email was not sent.");
    return false;
  }

  const greeting = visitor.full_name?.trim() ? `Hi ${visitor.full_name.trim()},` : "Hi,";
  const textBody = [
    greeting,
    "",
    "Thank you for your interest in Alt.FFF.",
    "",
    "After reviewing your registration, we're unable to confirm your place at this event.",
    "",
    "If you have questions, please contact us at enquiries@altfff.com.",
  ].join("\n");

  try {
    const { error } = await client.resend.emails.send({
      from: `Alt.FFF <${client.fromEmail}>`,
      to: visitor.email,
      replyTo: "enquiries@altfff.com",
      subject: "Update on your Alt.FFF registration",
      text: textBody,
      html: buildEmailHtml({
        heading: "Registration Update",
        bodyHtml: textToHtml(textBody),
      }),
    });
    if (error) {
      console.error("Resend error (visitor declined):", error);
      reportServerError(error, {
        route: "visitor-vetting",
        kind: "email",
        extra: { op: "visitor_declined", visitor_id: visitor.id },
      });
      return false;
    }
    return true;
  } catch (err) {
    console.error("Visitor decline email failed:", err);
    reportServerError(err, {
      route: "visitor-vetting",
      kind: "email",
      extra: { op: "visitor_declined_throw", visitor_id: visitor.id },
    });
    return false;
  }
}

/** Safe display name for scanner UI - never echoes raw token. */
export function visitorDisplayName(row: Pick<VisitorRow, "full_name" | "email">): string {
  const name = row.full_name?.trim();
  if (name) return name;
  return row.email;
}

export function formatCheckInTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}
