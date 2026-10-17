import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** The permanent URL a code resolves through. APP_URL must be the final public domain before printing. */
export function qrTargetUrl(code: string, origin?: string): string {
  const base = (process.env.APP_URL || origin || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/r/${code}`;
}

export function qrPng(url: string, width = 1024): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: "png", errorCorrectionLevel: "M", margin: 2, width, color: { dark: "#1b1713", light: "#ffffff" } });
}

// pdf-lib's built-in fonts only cover Latin-1; fold everything else rather than throwing
const latin = (s: string) =>
  s.normalize("NFC").replace(/[^\x20-\x7E -ÿ]/g, (c) => c.normalize("NFKD").replace(/[^\x20-\x7E]/g, "") || "");

/** A5 table card: restaurant name, QR, table label, short URL. Ready to print. */
export async function qrPdf(args: { url: string; restaurantName: string; label: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${args.restaurantName} — ${args.label}`);
  const page = pdf.addPage([419.5, 595.3]);
  const { width, height } = page.getSize();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.12, 0.1, 0.09);
  const brass = rgb(0.65, 0.54, 0.29);
  const muted = rgb(0.42, 0.38, 0.34);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.96, 0.93, 0.88) });
  page.drawRectangle({ x: 22, y: 22, width: width - 44, height: height - 44, borderColor: brass, borderWidth: 1.2 });
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: brass, borderWidth: 0.4 });

  const centre = (text: string, y: number, size: number, font = serif, color = ink) => {
    const t = latin(text);
    page.drawText(t, { x: (width - font.widthOfTextAtSize(t, size)) / 2, y, size, font, color });
  };

  const name = args.restaurantName;
  let size = 30;
  while (serifBold.widthOfTextAtSize(latin(name), size) > width - 100 && size > 14) size -= 1;
  centre(name, height - 105, size, serifBold);
  page.drawLine({ start: { x: width / 2 - 40, y: height - 128 }, end: { x: width / 2 + 40, y: height - 128 }, thickness: 0.8, color: brass });
  centre("SCAN TO READ THE MENU", height - 158, 9, sans, brass);
  centre("in your own language", height - 176, 13, serif, muted);

  const png = await pdf.embedPng(await qrPng(args.url, 900));
  const qr = 230;
  page.drawImage(png, { x: (width - qr) / 2, y: height - 190 - qr - 30, width: qr, height: qr });

  if (args.label.trim()) centre(args.label, 120, 22, serif);
  centre(args.url.replace(/^https?:\/\//, ""), 82, 8.5, sans, muted);
  return pdf.save();
}
