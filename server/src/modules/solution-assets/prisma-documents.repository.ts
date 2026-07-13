import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import type { DocumentSummaryView, DocumentsRepository } from "./documents.repository.js";

const activeVersionWhere = (now: Date) => ({
  status: "PUBLISHED" as const,
  AND: [
    { OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }] },
    { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
  ]
});

export class PrismaDocumentsRepository implements DocumentsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async searchPublishedDocuments(query: string, limit: number): Promise<readonly DocumentSummaryView[]> {
    const now = new Date();
    const rankedIds = query === ""
      ? null
      : await this.prisma.$queryRaw<readonly { readonly id: string }[]>(Prisma.sql`
          SELECT d.id
          FROM Document d
          WHERE (d.documentCode = ${query} OR MATCH(d.documentCode, d.title) AGAINST (${query} IN NATURAL LANGUAGE MODE))
            AND EXISTS (
              SELECT 1 FROM DocumentVersion dv
              WHERE dv.documentId = d.id AND dv.status = 'PUBLISHED'
                AND (dv.effectiveAt IS NULL OR dv.effectiveAt <= NOW(3))
                AND (dv.expiresAt IS NULL OR dv.expiresAt > NOW(3))
            )
          ORDER BY (d.documentCode = ${query}) DESC,
            MATCH(d.documentCode, d.title) AGAINST (${query} IN NATURAL LANGUAGE MODE) DESC
          LIMIT ${limit}
        `);
    if (rankedIds?.length === 0) return [];
    const order = new Map(rankedIds?.map((item, index) => [item.id, index]) ?? []);
    const documents = await this.prisma.document.findMany({
      where: {
        ...(rankedIds === null ? {} : { id: { in: rankedIds.map((item) => item.id) } }),
        versions: { some: activeVersionWhere(now) }
      },
      include: { versions: { where: activeVersionWhere(now), orderBy: { version: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: limit
    });
    return documents.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0)).flatMap((document) => {
      const version = document.versions[0];
      return version === undefined ? [] : [this.map(document.documentCode, document.title, version)];
    });
  }

  public async findPublishedDocument(documentCode: string): Promise<DocumentSummaryView | null> {
    const now = new Date();
    const document = await this.prisma.document.findUnique({
      where: { documentCode },
      include: { versions: { where: activeVersionWhere(now), orderBy: { version: "desc" }, take: 1 } }
    });
    const version = document?.versions[0];
    return document === null || document === undefined || version === undefined
      ? null
      : this.map(document.documentCode, document.title, version);
  }

  private map(
    documentCode: string,
    title: string,
    version: {
      readonly version: number;
      readonly language: string;
      readonly mimeType: string;
      readonly pageCount: number | null;
      readonly resourceLevel: DocumentSummaryView["resourceLevel"];
    }
  ): DocumentSummaryView {
    return {
      documentCode,
      title,
      version: version.version,
      language: version.language,
      mimeType: version.mimeType,
      pageCount: version.pageCount,
      resourceLevel: version.resourceLevel
    };
  }
}
