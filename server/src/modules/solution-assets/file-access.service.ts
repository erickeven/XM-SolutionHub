import { createHash, randomBytes } from "node:crypto";
import type { Readable } from "node:stream";
import type { ObjectStorageAdapter } from "../../adapters/object-storage.adapter.js";
import { decideResourceAccess, type AccessSubject } from "../../shared/domain/access-policy.js";
import { ApplicationError } from "../../shared/http/application-error.js";
import type { FileAccessRepository } from "./file-access.repository.js";

export interface IssuedFileAccess {
  readonly accessPath: string;
  readonly expiresAt: string;
  readonly previewPageLimit: number | null;
}

export interface ResolvedFileStream {
  readonly stream: Readable;
  readonly mimeType: string;
  readonly filename: string;
  readonly download: boolean;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class FileAccessService {
  public constructor(private readonly repository: FileAccessRepository, private readonly objectStorage: ObjectStorageAdapter) {}

  public async issue(
    documentCode: string,
    action: "PREVIEW" | "DOWNLOAD",
    subject: AccessSubject,
    subjectId: string | null
  ): Promise<IssuedFileAccess> {
    const resource = await this.repository.findPublishedResource(documentCode, new Date());
    if (resource === null) throw new ApplicationError(404, 40430, "资料不存在或尚未发布");
    const decision = decideResourceAccess(
      subject,
      { level: resource.resourceLevel, publicDownloadAllowed: subject.authenticated },
      action
    );
    if (!decision.allowed) throw new ApplicationError(403, 40310, "当前身份无权访问该资料", { reason: decision.reason });
    if (action === "PREVIEW") {
      const requiredObject = decision.previewPageLimit === 3
        ? resource.anonymousPreviewObjectKey
        : resource.fullPreviewObjectKey;
      if (requiredObject === null) throw new ApplicationError(409, 40920, "资料预览派生物尚未就绪");
    }
    const rawToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.repository.createToken({
      tokenHash: hashToken(rawToken),
      documentVersionId: resource.documentVersionId,
      subjectId,
      action,
      maxPreviewPages: decision.previewPageLimit,
      expiresAt
    });
    return { accessPath: `/api/v1/files/${rawToken}`, expiresAt: expiresAt.toISOString(), previewPageLimit: decision.previewPageLimit };
  }

  public async resolve(rawToken: string): Promise<ResolvedFileStream> {
    const stored = await this.repository.resolveToken(hashToken(rawToken), new Date());
    if (stored === null) throw new ApplicationError(401, 40120, "文件授权已失效");
    return {
      stream: await this.objectStorage.getObject(stored.objectKey),
      mimeType: stored.mimeType,
      filename: stored.filename,
      download: stored.action === "DOWNLOAD"
    };
  }
}
