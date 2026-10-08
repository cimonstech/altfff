import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { EVENT } from "@/lib/constants";
import type { VisitorRow } from "@/lib/visitorVetting";

/** One-page printable entry ticket attached to the approval email. */
export async function generateVisitorTicketPdf(
  visitor: VisitorRow,
  qrToken: string,
  qrPng: Buffer,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const name = visitor.full_name?.trim() || visitor.email;
  const margin = 48;
  let y = height - margin;

  page.drawText(EVENT.name, {
    x: margin,
    y,
    size: 22,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 28;

  page.drawText("Visitor Entry Ticket", {
    x: margin,
    y,
    size: 14,
    font: helvetica,
    color: rgb(0.35, 0.35, 0.35),
  });
  y -= 40;

  page.drawText(name, {
    x: margin,
    y,
    size: 26,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  y -= 36;

  page.drawText(`${EVENT.tradeFairDateLabel}`, {
    x: margin,
    y,
    size: 12,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 18;

  page.drawText(EVENT.launchCeremonyLabel, {
    x: margin,
    y,
    size: 11,
    font: helvetica,
    color: rgb(0.25, 0.25, 0.25),
  });
  y -= 16;

  page.drawText(EVENT.doorsOpenLabel, {
    x: margin,
    y,
    size: 11,
    font: helvetica,
    color: rgb(0.25, 0.25, 0.25),
  });
  y -= 18;

  const venueLines = wrapText(EVENT.venue, 70);
  for (const line of venueLines) {
    page.drawText(line, {
      x: margin,
      y,
      size: 11,
      font: helvetica,
      color: rgb(0.25, 0.25, 0.25),
    });
    y -= 16;
  }

  y -= 24;

  const qrImage = await pdf.embedPng(qrPng);
  const qrSize = 200;
  const qrX = (width - qrSize) / 2;
  page.drawImage(qrImage, {
    x: qrX,
    y: y - qrSize,
    width: qrSize,
    height: qrSize,
  });
  y -= qrSize + 28;

  page.drawText(`Entry code: ${qrToken}`, {
    x: margin,
    y,
    size: 14,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  y -= 36;

  const instruction =
    "Present this ticket (printed or on your phone) at entry. Door staff may ask to confirm your name matches this ticket.";
  for (const line of wrapText(instruction, 80)) {
    page.drawText(line, {
      x: margin,
      y,
      size: 11,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 15;
  }

  return Buffer.from(await pdf.save());
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}
