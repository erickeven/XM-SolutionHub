import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import type { FieldValueView, ProductDetailView, ProductSummaryView } from "./pim.types.js";
import type { PimRepository } from "./pim.repository.js";

function mapFieldValue(input: {
  readonly textValue: string | null;
  readonly numberValue: { toNumber(): number } | null;
  readonly booleanValue: boolean | null;
  readonly dateValue: Date | null;
  readonly fileVersionId: string | null;
  readonly source: string;
  readonly fieldDefinition: {
    readonly code: string;
    readonly label: string;
    readonly type: FieldValueView["type"];
    readonly unit: string | null;
  };
}): FieldValueView {
  const value =
    input.textValue ??
    input.numberValue?.toNumber() ??
    input.booleanValue ??
    input.dateValue?.toISOString() ??
    input.fileVersionId;
  return {
    code: input.fieldDefinition.code,
    label: input.fieldDefinition.label,
    type: input.fieldDefinition.type,
    unit: input.fieldDefinition.unit,
    value,
    source: input.source
  };
}

export class PrismaPimRepository implements PimRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async searchPublishedProducts(query: string, limit: number): Promise<readonly ProductSummaryView[]> {
    const rankedIds = query === ""
      ? null
      : await this.prisma.$queryRaw<readonly { readonly id: string }[]>(Prisma.sql`
          SELECT id
          FROM Product
          WHERE status = 'PUBLISHED'
            AND publishedAt <= NOW(3)
            AND (productCode = ${query} OR MATCH(productCode, name, summary) AGAINST (${query} IN NATURAL LANGUAGE MODE))
          ORDER BY (productCode = ${query}) DESC,
            MATCH(productCode, name, summary) AGAINST (${query} IN NATURAL LANGUAGE MODE) DESC,
            publishedAt DESC
          LIMIT ${limit}
        `);
    if (rankedIds?.length === 0) return [];
    const order = new Map(rankedIds?.map((item, index) => [item.id, index]) ?? []);
    const products = await this.prisma.product.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
        ...(rankedIds === null ? {} : { id: { in: rankedIds.map((item) => item.id) } })
      },
      include: {
        family: { select: { name: true } },
        orderableSkus: {
          where: { status: "PUBLISHED" },
          select: { orderCode: true },
          orderBy: { orderCode: "asc" }
        }
      },
      orderBy: [{ publishedAt: "desc" }, { productCode: "asc" }],
      take: limit
    });
    return products.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0)).map((product) => ({
      productCode: product.productCode,
      name: product.name,
      summary: product.summary,
      familyName: product.family?.name ?? null,
      orderableSkus: product.orderableSkus.map((sku) => sku.orderCode)
    }));
  }

  public async findPublishedProductByCode(productCode: string): Promise<ProductDetailView | null> {
    const now = new Date();
    const product = await this.prisma.product.findFirst({
      where: { productCode, status: "PUBLISHED", publishedAt: { lte: now } },
      include: {
        family: { select: { name: true } },
        orderableSkus: {
          where: { status: "PUBLISHED" },
          select: { orderCode: true },
          orderBy: { orderCode: "asc" }
        },
        fieldValues: {
          include: { fieldDefinition: true },
          orderBy: { fieldDefinition: { displayOrder: "asc" } }
        },
        solutionFits: {
          where: {
            solutionVersion: {
              status: "PUBLISHED",
              AND: [
                { OR: [{ effectiveAt: null }, { effectiveAt: { lte: now } }] },
                { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
              ]
            }
          },
          include: { solutionVersion: { include: { solution: true } } }
        },
        documentLinks: {
          include: {
            document: {
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
                  take: 1
                }
              }
            }
          }
        }
      }
    });
    if (product === null) return null;
    return {
      productCode: product.productCode,
      name: product.name,
      summary: product.summary,
      familyName: product.family?.name ?? null,
      orderableSkus: product.orderableSkus.map((sku) => sku.orderCode),
      fields: product.fieldValues.map(mapFieldValue),
      relatedSolutions: product.solutionFits.map((fit) => ({
        solutionCode: fit.solutionVersion.solution.solutionCode,
        name: fit.solutionVersion.solution.name,
        summary: fit.solutionVersion.solution.summary,
        version: fit.solutionVersion.version,
        fitRules: fit.fitRules,
        evidenceSource: fit.evidenceSource
      })),
      documents: product.documentLinks.flatMap((link) => {
        const latest = link.document.versions[0];
        return latest === undefined
          ? []
          : [
              {
                documentCode: link.document.documentCode,
                title: link.document.title,
                relationType: link.relationType,
                latestVersion: latest.version,
                resourceLevel: latest.resourceLevel
              }
            ];
      })
    };
  }
}
