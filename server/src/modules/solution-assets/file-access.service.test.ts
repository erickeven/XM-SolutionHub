import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import type { ObjectStorageAdapter } from "../../adapters/object-storage.adapter.js";
import type { AccessSubject } from "../../shared/domain/access-policy.js";
import type { FileAccessRepository } from "./file-access.repository.js";
import { FileAccessService } from "./file-access.service.js";

const anonymous: AccessSubject = {
  type: "ANONYMOUS",
  authenticated: false,
  organizationIds: [],
  projectIds: [],
  ndaIds: []
};

function dependencies() {
  const createToken = vi.fn().mockResolvedValue(undefined);
  const repository: FileAccessRepository = {
    findPublishedResource: vi.fn().mockResolvedValue({
      documentVersionId: "version-1",
      documentCode: "DOC-1",
      title: "规格书",
      mimeType: "application/pdf",
      originalObjectKey: "originals/doc-1.pdf",
      resourceLevel: "PUBLIC",
      fullPreviewObjectKey: "previews/full.pdf",
      anonymousPreviewObjectKey: "previews/anonymous-3-pages.pdf"
    }),
    createToken,
    resolveToken: vi.fn().mockResolvedValue(null)
  };
  const objectStorage: ObjectStorageAdapter = {
    getObject: vi.fn().mockResolvedValue(Readable.from([])),
    putObject: vi.fn()
  };
  return { repository, objectStorage, createToken };
}

describe("FileAccessService", () => {
  it("匿名公开预览只签发三页派生物令牌", async () => {
    const { repository, objectStorage, createToken } = dependencies();
    const result = await new FileAccessService(repository, objectStorage).issue("DOC-1", "PREVIEW", anonymous, null);
    expect(result.previewPageLimit).toBe(3);
    expect(createToken).toHaveBeenCalledWith(expect.objectContaining({ maxPreviewPages: 3, action: "PREVIEW" }));
  });

  it("匿名用户不能下载公开资料原件", async () => {
    const { repository, objectStorage } = dependencies();
    await expect(
      new FileAccessService(repository, objectStorage).issue("DOC-1", "DOWNLOAD", anonymous, null)
    ).rejects.toMatchObject({ status: 403 });
  });

  it("注册个人可以完整预览并下载公开资料", async () => {
    const registered: AccessSubject = { ...anonymous, type: "CUSTOMER", authenticated: true };
    const { repository, objectStorage } = dependencies();
    const service = new FileAccessService(repository, objectStorage);
    await expect(service.issue("DOC-1", "PREVIEW", registered, "subject-1")).resolves.toMatchObject({ previewPageLimit: null });
    await expect(service.issue("DOC-1", "DOWNLOAD", registered, "subject-1")).resolves.toHaveProperty("accessPath");
  });
});
