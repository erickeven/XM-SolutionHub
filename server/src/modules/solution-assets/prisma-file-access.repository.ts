import type { PrismaClient } from "../../generated/prisma/client.js";
import type { FileAccessRepository, FileAccessResource, StoredFileAccess } from "./file-access.repository.js";

export class PrismaFileAccessRepository implements FileAccessRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findPublishedResource(documentCode: string, now: Date): Promise<FileAccessResource | null> {
    const document = await this.prisma.document.findUnique({
      where: { documentCode },
      include: {
        versions: {
          where: {
            status: "PUBLISHED",
            AND: [
              { OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }] },
              { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
            ]
          },
          orderBy: { version: "desc" },
          take: 1,
          include: {
            derivatives: {
              where: { status: "SUCCEEDED", type: { in: ["PREVIEW_PDF", "ANONYMOUS_PREVIEW_PDF"] } }
            }
          }
        }
      }
    });
    const version = document?.versions[0];
    if (document === null || document === undefined || version === undefined) return null;
    return {
      documentVersionId: version.id,
      documentCode: document.documentCode,
      title: document.title,
      mimeType: version.mimeType,
      originalObjectKey: version.originalObjectKey,
      resourceLevel: version.resourceLevel,
      fullPreviewObjectKey: version.derivatives.find((item) => item.type === "PREVIEW_PDF")?.objectKey ?? null,
      anonymousPreviewObjectKey:
        version.derivatives.find((item) => item.type === "ANONYMOUS_PREVIEW_PDF")?.objectKey ?? null
    };
  }

  public async createToken(input: { readonly tokenHash: string; readonly documentVersionId: string; readonly subjectId: string | null; readonly action: "PREVIEW" | "DOWNLOAD"; readonly maxPreviewPages: number | null; readonly expiresAt: Date }): Promise<void> {
    await this.prisma.fileAccessToken.create({ data: input });
  }

  public async resolveToken(tokenHash: string, now: Date): Promise<StoredFileAccess | null> {
    const token = await this.prisma.fileAccessToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: now },
        OR: [{ action: "PREVIEW" }, { action: "DOWNLOAD", consumedAt: null }]
      },
      include: {
        documentVersion: {
          include: {
            document: true,
            derivatives: { where: { status: "SUCCEEDED", type: { in: ["PREVIEW_PDF", "ANONYMOUS_PREVIEW_PDF"] } } }
          }
        }
      }
    });
    if (token === null || (token.action !== "PREVIEW" && token.action !== "DOWNLOAD")) return null;
    const version = token.documentVersion;
    const previewType = token.maxPreviewPages === 3 ? "ANONYMOUS_PREVIEW_PDF" : "PREVIEW_PDF";
    const objectKey = token.action === "DOWNLOAD"
      ? version.originalObjectKey
      : version.derivatives.find((item) => item.type === previewType)?.objectKey;
    if (objectKey === undefined) return null;
    if (token.action === "DOWNLOAD") {
      await this.prisma.fileAccessToken.update({ where: { id: token.id }, data: { consumedAt: now } });
    }
    return {
      action: token.action,
      objectKey,
      mimeType: token.action === "PREVIEW" ? "application/pdf" : version.mimeType,
      filename: `${version.document.documentCode}-v${version.version}`
    };
  }
}
