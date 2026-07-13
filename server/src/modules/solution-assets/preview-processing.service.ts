import type { Readable } from "node:stream";
import { PDFDocument } from "pdf-lib";
import type { ObjectStorageAdapter } from "../../adapters/object-storage.adapter.js";
import type { PreviewProcessingRepository } from "./preview-processing.repository.js";

async function readStream(stream: Readable, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > maxBytes) {
      stream.destroy();
      throw new Error("PDF_SOURCE_EXCEEDS_100_MB");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export class PreviewProcessingService {
  public constructor(
    private readonly repository: PreviewProcessingRepository,
    private readonly storage: ObjectStorageAdapter
  ) {}

  public async process(documentVersionId: string): Promise<void> {
    const source = await this.repository.findSource(documentVersionId);
    if (source === null) throw new Error("DOCUMENT_VERSION_NOT_FOUND");
    if (source.mimeType !== "application/pdf") throw new Error("DOCUMENT_CONVERSION_ADAPTER_REQUIRED");
    const root = `document-versions/${source.documentVersionId}/${source.sha256}`;
    const fullObjectKey = `${root}/preview/full.pdf`;
    const anonymousObjectKey = `${root}/preview/anonymous-first-3-pages.pdf`;
    await this.repository.markProcessing(
      source.documentVersionId,
      source.sha256,
      fullObjectKey,
      anonymousObjectKey
    );
    try {
      const original = await readStream(await this.storage.getObject(source.originalObjectKey), 100 * 1024 * 1024);
      const pdf = await PDFDocument.load(original, { updateMetadata: false });
      const pageCount = pdf.getPageCount();
      if (pageCount < 1) throw new Error("PDF_HAS_NO_PAGES");
      const anonymous = await PDFDocument.create();
      const pageIndices = Array.from({ length: Math.min(3, pageCount) }, (_value, index) => index);
      const pages = await anonymous.copyPages(pdf, pageIndices);
      for (const page of pages) anonymous.addPage(page);
      const [fullBytes, anonymousBytes] = await Promise.all([
        pdf.save({ useObjectStreams: true }),
        anonymous.save({ useObjectStreams: true })
      ]);
      await Promise.all([
        this.storage.putObject(fullObjectKey, Buffer.from(fullBytes), "application/pdf"),
        this.storage.putObject(anonymousObjectKey, Buffer.from(anonymousBytes), "application/pdf")
      ]);
      await this.repository.markSucceeded(
        source.documentVersionId,
        source.sha256,
        fullObjectKey,
        anonymousObjectKey,
        pageCount
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : "UNKNOWN_PREVIEW_PROCESSING_ERROR";
      await this.repository.markFailed(source.documentVersionId, source.sha256, reason);
      throw error;
    }
  }
}
