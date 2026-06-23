import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export async function addWatermark(
  pdfBuffer: Buffer,
  watermarkText: string,
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 40;
  const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
  const gray = rgb(0.75, 0.75, 0.75);

  const pages = doc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    // Center the watermark diagonally
    const x = (width - textWidth) / 2;
    const y = height / 2;
    page.drawText(watermarkText, {
      x,
      y,
      size: fontSize,
      font,
      color: gray,
      opacity: 0.3,
      rotate: degrees(45),
    });
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}