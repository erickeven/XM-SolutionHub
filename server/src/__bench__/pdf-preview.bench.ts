import { bench, describe, beforeAll, afterAll, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { LocalStorageAdapter } from '../lib/storage/local.adapter';

// PRD §3 L28-36: PDF first-page P95 < 1.5s

const tmpDir = path.resolve('./test-pdf-bench-tmp');
let mockAdapter: LocalStorageAdapter;

// Mock storage module to avoid config/env dependency chain
vi.mock('../lib/storage', () => ({
  getStorageAdapter: () => mockAdapter,
}));

import { extractFirstNPages, getPdfPageCount, derivePreview } from '../lib/pdf/derive';

async function createTestPdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([200, 200]);
    page.drawText(`Page ${i + 1}`, { x: 50, y: 100 });
  }
  return Buffer.from(await doc.save());
}

describe.skipIf(!process.env.DATABASE_URL)('PDF Preview Performance', () => {
  let pdf5page: Buffer;
  let pdf20page: Buffer;
  let pdf50page: Buffer;

  beforeAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    mockAdapter = new LocalStorageAdapter({ localDir: tmpDir });

    pdf5page = await createTestPdf(5);
    pdf20page = await createTestPdf(20);
    pdf50page = await createTestPdf(50);

    await mockAdapter.putObject({
      storageKey: 'bench/5page.pdf',
      body: pdf5page,
      contentType: 'application/pdf',
    });
    await mockAdapter.putObject({
      storageKey: 'bench/20page.pdf',
      body: pdf20page,
      contentType: 'application/pdf',
    });
    await mockAdapter.putObject({
      storageKey: 'bench/50page.pdf',
      body: pdf50page,
      contentType: 'application/pdf',
    });
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  bench(
    'extractFirstNPages (5-page PDF, 1 page) — P95 < 1.5s',
    async () => {
      await extractFirstNPages(pdf5page, 1);
    },
    { time: 1500 },
  );

  bench(
    'extractFirstNPages (20-page PDF, 1 page) — P95 < 1.5s',
    async () => {
      await extractFirstNPages(pdf20page, 1);
    },
    { time: 1500 },
  );

  bench(
    'extractFirstNPages (50-page PDF, 1 page) — P95 < 1.5s',
    async () => {
      await extractFirstNPages(pdf50page, 1);
    },
    { time: 1500 },
  );

  bench(
    'getPdfPageCount (50-page PDF) — P95 < 1.5s',
    async () => {
      await getPdfPageCount(pdf50page);
    },
    { time: 1500 },
  );

  bench(
    'derivePreview (20-page PDF, 3-page preview) — P95 < 1.5s',
    async () => {
      const previewKey = `tmp/preview-${Date.now()}.pdf`;
      await derivePreview('bench/20page.pdf', previewKey, 3);
    },
    { time: 1500 },
  );
});