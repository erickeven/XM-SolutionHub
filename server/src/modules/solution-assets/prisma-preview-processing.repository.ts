import type { PrismaClient } from "../../generated/prisma/client.js";
import type { PreviewProcessingRepository, PreviewSource } from "./preview-processing.repository.js";

export class PrismaPreviewProcessingRepository implements PreviewProcessingRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findSource(documentVersionId: string): Promise<PreviewSource | null> {
    return this.prisma.documentVersion.findUnique({
      where: { id: documentVersionId },
      select: { id: true, mimeType: true, sha256: true, originalObjectKey: true }
    }).then((version) => version === null ? null : {
      documentVersionId: version.id,
      mimeType: version.mimeType,
      sha256: version.sha256,
      originalObjectKey: version.originalObjectKey
    });
  }

  public async markProcessing(documentVersionId: string, sha256: string, fullObjectKey: string, anonymousObjectKey: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.fileDerivative.upsert({
        where: { documentVersionId_type_inputSha256: { documentVersionId, type: "PREVIEW_PDF", inputSha256: sha256 } },
        create: { documentVersionId, type: "PREVIEW_PDF", inputSha256: sha256, objectKey: fullObjectKey, status: "PROCESSING" },
        update: { objectKey: fullObjectKey, status: "PROCESSING", failureReason: null }
      }),
      this.prisma.fileDerivative.upsert({
        where: { documentVersionId_type_inputSha256: { documentVersionId, type: "ANONYMOUS_PREVIEW_PDF", inputSha256: sha256 } },
        create: { documentVersionId, type: "ANONYMOUS_PREVIEW_PDF", inputSha256: sha256, objectKey: anonymousObjectKey, status: "PROCESSING" },
        update: { objectKey: anonymousObjectKey, status: "PROCESSING", failureReason: null }
      })
    ]);
  }

  public async markSucceeded(documentVersionId: string, sha256: string, fullObjectKey: string, anonymousObjectKey: string, pageCount: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.documentVersion.update({ where: { id: documentVersionId }, data: { pageCount } }),
      this.prisma.fileDerivative.update({
        where: { documentVersionId_type_inputSha256: { documentVersionId, type: "PREVIEW_PDF", inputSha256: sha256 } },
        data: { objectKey: fullObjectKey, status: "SUCCEEDED", failureReason: null }
      }),
      this.prisma.fileDerivative.update({
        where: { documentVersionId_type_inputSha256: { documentVersionId, type: "ANONYMOUS_PREVIEW_PDF", inputSha256: sha256 } },
        data: { objectKey: anonymousObjectKey, status: "SUCCEEDED", failureReason: null }
      })
    ]);
  }

  public async markFailed(documentVersionId: string, sha256: string, reason: string): Promise<void> {
    await this.prisma.fileDerivative.updateMany({
      where: { documentVersionId, inputSha256: sha256, type: { in: ["PREVIEW_PDF", "ANONYMOUS_PREVIEW_PDF"] } },
      data: { status: "FAILED", failureReason: reason.slice(0, 2000) }
    });
  }
}
