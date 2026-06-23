import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { LocalStorageAdapter } from '../storage/local.adapter';

const tmpDir = path.resolve('./test-pdf-tmp');
let mockAdapter: LocalStorageAdapter;

// Mock storage module to avoid config/env dependency chain
vi.mock('../storage', () => ({
  getStorageAdapter: () => mockAdapter,
}));

import { getPdfPageCount, extractFirstNPages, derivePreview } from './derive';
import { addWatermark } from './watermark';

const createTestPdf = async (pages: number): Promise<Buffer> => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([200, 200]);
    page.drawText(`Page ${i + 1}`, { x: 50, y: 100 });
  }
  return Buffer.from(await doc.save());
};

describe('PDF derive', () => {
  beforeEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    mockAdapter = new LocalStorageAdapter({ localDir: tmpDir });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('extractFirstNPages extracts first 3 pages from 5-page PDF', async () => {
    const original = await createTestPdf(5);
    const preview = await extractFirstNPages(original, 3);
    const previewDoc = await PDFDocument.load(preview);
    expect(previewDoc.getPageCount()).toBe(3);
  });

  it('extractFirstNPages handles n > totalPages gracefully', async () => {
    const original = await createTestPdf(2);
    const preview = await extractFirstNPages(original, 5);
    const previewDoc = await PDFDocument.load(preview);
    expect(previewDoc.getPageCount()).toBe(2);
  });

  it('getPdfPageCount returns correct count', async () => {
    const pdf = await createTestPdf(7);
    const count = await getPdfPageCount(pdf);
    expect(count).toBe(7);
  });

  it('getPdfPageCount throws on corrupted buffer', async () => {
    const corrupted = Buffer.from('not a pdf');
    await expect(getPdfPageCount(corrupted)).rejects.toThrow();
  });

  it('addWatermark produces valid PDF with different size', async () => {
    const original = await createTestPdf(3);
    const watermarked = await addWatermark(original, 'test@example.com');
    const doc = await PDFDocument.load(watermarked);
    expect(doc.getPageCount()).toBe(3);
    expect(watermarked.length).toBeGreaterThan(original.length);
  });

  it('derivePreview stores preview and returns pageCount', async () => {
    const original = await createTestPdf(5);
    await mockAdapter.putObject({
      storageKey: 'originals/test.pdf',
      body: original,
      contentType: 'application/pdf',
    });

    const result = await derivePreview('originals/test.pdf', 'previews/test.pdf', 3);
    expect(result.pageCount).toBe(5);
    expect(result.previewStorageKey).toBe('previews/test.pdf');

    const previewBuffer = await mockAdapter.getObject('previews/test.pdf');
    const previewDoc = await PDFDocument.load(previewBuffer);
    expect(previewDoc.getPageCount()).toBe(3);
  });

  it('derivePreview with corrupted PDF throws error', async () => {
    const corrupted = Buffer.from('not a pdf');
    await mockAdapter.putObject({
      storageKey: 'originals/corrupted.pdf',
      body: corrupted,
      contentType: 'application/pdf',
    });

    await expect(
      derivePreview('originals/corrupted.pdf', 'previews/corrupted.pdf', 3),
    ).rejects.toThrow();
  });
});