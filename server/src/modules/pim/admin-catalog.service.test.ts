import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import type { ObjectStorageAdapter } from "../../adapters/object-storage.adapter.js";
import type { AdminCatalogRepository } from "./admin-catalog.repository.js";
import { AdminCatalogService } from "./admin-catalog.service.js";

function dependencies() {
  const putObject = vi.fn();
  const repository: AdminCatalogRepository = {
    publishedFieldDefinitions: vi.fn().mockResolvedValue([]),
    createProduct: vi.fn().mockResolvedValue({ productCode: "XMW-1", status: "DRAFT" }),
    publishProduct: vi.fn().mockResolvedValue(null),
    createSolution: vi.fn().mockResolvedValue(null),
    publishSolution: vi.fn().mockResolvedValue(null),
    createDocumentVersion: vi.fn().mockResolvedValue({ documentCode: "DOC-1", version: 1, status: "DRAFT", documentVersionId: "version-1" }),
    publishDocument: vi.fn().mockResolvedValue(null),
    linkProductDocument: vi.fn().mockResolvedValue(undefined),
    linkSolutionDocument: vi.fn().mockResolvedValue(undefined)
  };
  const storage: ObjectStorageAdapter = {
    getObject: vi.fn().mockResolvedValue(Readable.from([])),
    putObject
  };
  return { repository, storage, putObject };
}

describe("AdminCatalogService", () => {
  it("拒绝跳过预览派生物直接发布资料", async () => {
    const { repository, storage } = dependencies();
    await expect(new AdminCatalogService(repository, storage).publishDocument(
      "DOC-1", 1, "admin-1",
      { reason: "需要发布正式受控资料", sourceIp: "127.0.0.1", notificationTargets: ["owner@example.com"], recoveryPoint: "backup-1" },
      "trace-1"
    )).rejects.toMatchObject({ status: 409 });
  });

  it("上传 PDF 使用内容哈希生成不可变对象键", async () => {
    const { repository, storage, putObject } = dependencies();
    await new AdminCatalogService(repository, storage).uploadDocument({
      documentCode: "DOC-1",
      title: "规格书",
      version: 1,
      resourceLevel: "PUBLIC",
      language: "zh-CN",
      mimeType: "application/pdf",
      content: Buffer.from("pdf-content")
    });
    expect(putObject).toHaveBeenCalledWith(
      expect.stringMatching(/^documents\/DOC-1\/versions\/1\/[a-f0-9]{64}\/original\.pdf$/u),
      expect.any(Buffer),
      "application/pdf"
    );
  });
});
