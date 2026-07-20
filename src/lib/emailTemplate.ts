import { EVENT } from "@/lib/constants";

// Real site tokens (src/app/globals.css), duplicated as plain hex here since
// email clients strip <style> blocks and CSS custom properties both -
// everything in this template has to be inline, literal values.
const GOLD = "#DA8E06";
const INK = "#171C26";
const PAPER = "#F6F1E7";
const FOREST = "#007563";
const INK_MUTED = "#5B6169";

// Email-safe stack only - web fonts (Bricolage Grotesque/Archivo, used
// everywhere else on the site) aren't reliably loaded by mail clients, so
// this deliberately doesn't try.
const FONT_STACK = "Arial, Helvetica, sans-serif";

/**
 * Wraps any transactional email's content in the site's branded shell: a
 * gold header band with a text wordmark (no logo image, per the decision to
 * skip one), a white body, and a thin forest footer band. All styles are
 * inline attributes, not a <style> block - the only approach that renders
 * consistently across Gmail, Outlook, and mobile mail apps.
 *
 * `bodyHtml` is trusted HTML from the caller - callers embedding dynamic
 * user-submitted text (e.g. communicationDelivery.ts's admin-composed +
 * merge-field-interpolated messages) must escape it themselves first (see
 * `escapeHtml`/`textToHtml` below); the four static confirmation emails
 * don't need to, their copy is authored here, not user input.
 */
export function buildEmailHtml({
  heading,
  bodyHtml,
  footerNote,
}: {
  heading: string;
  bodyHtml: string;
  footerNote?: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background-color:${PAPER};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAPER};">
      <tr>
        <td align="center" style="padding:24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td style="background-color:${GOLD}; padding:22px 32px;">
                <span style="color:#FFFFFF; font-family:${FONT_STACK}; font-size:22px; font-weight:bold; letter-spacing:1px;">Alt.FFF</span>
              </td>
            </tr>
            <tr>
              <td style="background-color:#FFFFFF; padding:32px;">
                <h1 style="margin:0 0 16px 0; font-family:${FONT_STACK}; font-size:20px; font-weight:bold; color:${INK};">${heading}</h1>
                <div style="font-family:${FONT_STACK}; font-size:15px; line-height:1.6; color:${INK};">
                  ${bodyHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color:#FFFFFF; padding:0 32px 28px 32px;">
                <p style="margin:0; font-family:${FONT_STACK}; font-size:12px; line-height:1.6; color:${INK_MUTED};">
                  ${EVENT.dates} &middot; ${EVENT.venue}, ${EVENT.city}<br />
                  Alt.FFF &middot; Where Materials Speak Before Fashion${footerNote ? `<br />${footerNote}` : ""}
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:${FOREST}; height:6px; line-height:6px; font-size:0;">&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Escapes text for safe embedding in the HTML body built above. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapes plain text, then turns blank-line-separated paragraphs into
 * <p> tags and single newlines into <br> - for wrapping arbitrary
 * user/admin-authored plain text (e.g. an admin's Communications tab
 * message) as the template's bodyHtml. */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 14px 0;">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}
