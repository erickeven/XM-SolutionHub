import { logger } from '../logger';

export interface PdfPageText {
  text: string;
  pageNumber: number;
}

export interface PdfExtractResult {
  text: string;
  pages: PdfPageText[];
}

/**
 * Extract text from a PDF buffer using pdfjs-dist legacy build (Node.js compatible).
 * Returns full concatenated text plus per-page text for chunk page tracking.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractResult> {
  // Dynamic import of legacy build — avoids worker/canvas requirements in Node.js
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Disable worker — run parsing on main thread (fine for server-side batch processing)
  pdfjs.GlobalWorkerOptions.workerSrc = '';

  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data,
    // ponytail: disable features that require browser APIs
    isEvalSupported: false,
    useSystemFonts: false,
  });

  const doc = await loadingTask.promise;
  const pages: PdfPageText[] = [];
  const allText: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => {
        if ('str' in item) {
          return item.str;
        }
        return '';
      })
      .join('');

    pages.push({ text: pageText, pageNumber: pageNum });
    allText.push(pageText);
  }

  await doc.destroy();

  logger.debug({ pageCount: pages.length }, 'PDF text extraction complete');

  return {
    text: allText.join('\n'),
    pages,
  };
}