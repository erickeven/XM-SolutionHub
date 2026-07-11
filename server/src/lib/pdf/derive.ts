import { PDFDocument } from 'pdf-lib';
import { getStorageAdapter } from '../storage';

export interface DeriveResult {
  previewStorageKey: string;
  pageCount: number;
}

// pdf-lib provides page counts without requiring PDF.js browser shims.
// pdfjs-dist requires canvas/worker setup in Node.js; pdf-lib's getPageCount()
// is sufficient for our needs (count + page extraction). Switch to pdfjs-dist
// only if text extraction or rendering becomes necessary.

export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return doc.getPageCount();
}

export async function extractFirstNPages(
  originalBuffer: Buffer,
  n: number,
): Promise<Buffer> {
  const sourceDoc = await PDFDocument.load(originalBuffer, {
    ignoreEncryption: true,
  });
  const totalPages = sourceDoc.getPageCount();
  const pagesToCopy = Math.min(n, totalPages);

  const targetDoc = await PDFDocument.create();
  const copiedPages = await targetDoc.copyPages(
    sourceDoc,
    Array.from({ length: pagesToCopy }, (_, i) => i),
  );
  for (const page of copiedPages) {
    targetDoc.addPage(page);
  }

  const bytes = await targetDoc.save();
  return Buffer.from(bytes);
}

export async function derivePreview(
  originalStorageKey: string,
  previewStorageKey: string,
  maxPreviewPages: number = 3,
): Promise<DeriveResult> {
  const storage = getStorageAdapter();

  // 1. Download original PDF
  const originalBuffer = await storage.getObject(originalStorageKey);

  // 2. Get page count (throws on corrupted PDF)
  const pageCount = await getPdfPageCount(originalBuffer);

  // 3. Extract first N pages as preview PDF
  const previewBuffer = await extractFirstNPages(originalBuffer, maxPreviewPages);

  // 4. Upload preview to storage
  await storage.putObject({
    storageKey: previewStorageKey,
    body: previewBuffer,
    contentType: 'application/pdf',
  });

  return { previewStorageKey, pageCount };
}
