import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import type { SolutionAssetsRepository } from "./solution-assets.repository.js";
import type { SolutionDetailView, SolutionSummaryView } from "./solution-assets.types.js";

const activeVersionWhere = (now: Date) => ({
  status: "PUBLISHED" as const,
  AND: [
    { OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }] },
    { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
  ]
});

export class PrismaSolutionAssetsRepository implements SolutionAssetsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async searchPublishedSolutions(query: string, limit: number): Promise<readonly SolutionSummaryView[]> {
    const now = new Date();
    const rankedIds = query === ""
      ? null
      : await this.prisma.$queryRaw<readonly { readonly id: string }[]>(Prisma.sql`
          SELECT s.id
          FROM Solution s
          WHERE (s.solutionCode = ${query} OR MATCH(s.solutionCode, s.name, s.summary) AGAINST (${query} IN NATURAL LANGUAGE MODE))
            AND EXISTS (
              SELECT 1 FROM SolutionVersion sv
              WHERE sv.solutionId = s.id AND sv.status = 'PUBLISHED'
                AND (sv.effectiveAt IS NULL OR sv.effectiveAt <= NOW(3))
                AND (sv.expiresAt IS NULL OR sv.expiresAt > NOW(3))
            )
          ORDER BY (s.solutionCode = ${query}) DESC,
            MATCH(s.solutionCode, s.name, s.summary) AGAINST (${query} IN NATURAL LANGUAGE MODE) DESC
          LIMIT ${limit}
        `);
    if (rankedIds?.length === 0) return [];
    const order = new Map(rankedIds?.map((item, index) => [item.id, index]) ?? []);
    const solutions = await this.prisma.solution.findMany({
      where: {
        ...(rankedIds === null ? {} : { id: { in: rankedIds.map((item) => item.id) } }),
        versions: { some: activeVersionWhere(now) }
      },
      include: {
        versions: { where: activeVersionWhere(now), orderBy: { version: "desc" }, take: 1 }
      },
      orderBy: { updatedAt: "desc" },
      take: limit
    });
    return solutions.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0)).flatMap((solution) => {
      const version = solution.versions[0];
      return version === undefined
        ? []
        : [
            {
              solutionCode: solution.solutionCode,
              name: solution.name,
              summary: solution.summary,
              version: version.version,
              resourceLevel: version.resourceLevel
            }
          ];
    });
  }

  public async findPublishedSolutionByCode(solutionCode: string): Promise<SolutionDetailView | null> {
    const now = new Date();
    const solution = await this.prisma.solution.findUnique({
      where: { solutionCode },
      include: {
        versions: {
          where: activeVersionWhere(now),
          orderBy: { version: "desc" },
          take: 1,
          include: {
            productFits: {
              where: { product: { status: "PUBLISHED", publishedAt: { lte: now } } },
              include: {
                product: {
                  include: {
                    orderableSkus: {
                      where: { status: "PUBLISHED" },
                      select: { orderCode: true },
                      orderBy: { orderCode: "asc" }
                    }
                  }
                }
              }
            },
            documentLinks: {
              include: {
                document: {
                  include: {
                    versions: {
                      where: activeVersionWhere(now),
                      orderBy: { version: "desc" },
                      take: 1
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    const version = solution?.versions[0];
    if (solution === null || solution === undefined || version === undefined) return null;
    return {
      solutionCode: solution.solutionCode,
      name: solution.name,
      summary: solution.summary,
      version: version.version,
      resourceLevel: version.resourceLevel,
      conditions: version.conditions,
      evidence: version.evidence,
      products: version.productFits.map((fit) => ({
        productCode: fit.product.productCode,
        name: fit.product.name,
        orderableSkus: fit.product.orderableSkus.map((sku) => sku.orderCode),
        fitRules: fit.fitRules,
        evidenceSource: fit.evidenceSource
      })),
      documents: version.documentLinks.flatMap((link) => {
        const documentVersion = link.document.versions[0];
        return documentVersion === undefined
          ? []
          : [
              {
                documentCode: link.document.documentCode,
                title: link.document.title,
                relationType: link.relationType,
                version: documentVersion.version,
                resourceLevel: documentVersion.resourceLevel
              }
            ];
      })
    };
  }
}
