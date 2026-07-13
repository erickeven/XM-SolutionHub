import { Readable } from "node:stream";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import type { ObjectStorageAdapter } from "../../adapters/object-storage.adapter.js";
import type { PreviewProcessingRepository } from "./preview-processing.repository.js";
import { PreviewProcessingService } from "./preview-processing.service.js";

async function fivePagePdf(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < 5; index += 1) pdf.addPage([595, 842]);
  return Buffer.from(await pdf.save());
}

describe("PreviewProcessingService", () => {
  it("生成完整预览和匿名前三页派生物", async () => {
    const outputs = new Map<string, Buffer>();
    const markSucceeded = vi.fn();
    const repository: PreviewProcessingRepository = {
      findSource: vi.fn().mockResolvedValue({
        documentVersionId: "version-1",
        mimeType: "application/pdf",
        sha256: "a".repeat(64),
        originalObjectKey: "original.pdf"
      }),
      markProcessing: vi.fn(),
      markSucceeded,
      markFailed: vi.fn()
    };
    const source = await fivePagePdf();
    const putObject = vi.fn((key: string, content: Buffer) => {
      outputs.set(key, content);
      return Promise.resolve();
    });
    const storage: ObjectStorageAdapter = {
      getObject: vi.fn().mockResolvedValue(Readable.from(source)),
      putObject
    };
    await new PreviewProcessingService(repository, storage).process("version-1");
    const anonymous = [...outputs.entries()].find(([key]) => key.includes("anonymous"))?.[1];
    expect(anonymous).toBeDefined();
    expect((await PDFDocument.load(anonymous ?? Buffer.alloc(0))).getPageCount()).toBe(3);
    expect(markSucceeded).toHaveBeenCalledWith(
      "version-1",
      "a".repeat(64),
      expect.stringContaining("full.pdf"),
      expect.stringContaining("anonymous-first-3-pages.pdf"),
      5
    );
  });
});
