import { Prisma, type PrismaClient } from "../../generated/prisma/client.js";
import type { SelectionCandidate, SelectionRepository } from "./selection.types.js";

export class PrismaSelectionRepository implements SelectionRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findPublishedCandidates(terms: readonly string[], limit: number): Promise<readonly SelectionCandidate[]> {
    const query = terms.join(" ");
    const rankedIds = await this.prisma.$queryRaw<readonly { readonly id: string }[]>(Prisma.sql`
      SELECT id
      FROM Product
      WHERE status = 'PUBLISHED' AND publishedAt <= NOW(3)
        AND MATCH(productCode, name, summary) AGAINST (${query} IN NATURAL LANGUAGE MODE)
      ORDER BY MATCH(productCode, name, summary) AGAINST (${query} IN NATURAL LANGUAGE MODE) DESC
      LIMIT ${limit}
    `);
    if (rankedIds.length === 0) return [];
    const products = await this.prisma.product.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
        id: { in: rankedIds.map((item) => item.id) }
      },
      include: {
        orderableSkus: { where: { status: "PUBLISHED" }, select: { orderCode: true } },
        fieldValues: { where: { textValue: { not: null } }, include: { fieldDefinition: true } }
      },
      take: limit
    });
    return products
      .map((product) => {
        const searchable = [
          product.productCode,
          product.name,
          product.summary,
          ...product.fieldValues.flatMap((field) =>
            field.textValue === null ? [] : [`${field.fieldDefinition.label}: ${field.textValue}`]
          )
        ];
        const matchedEvidence = searchable.filter((value) =>
          terms.some((term) => value.toLocaleLowerCase("zh-CN").includes(term.toLocaleLowerCase("zh-CN")))
        );
        return {
          productCode: product.productCode,
          name: product.name,
          summary: product.summary,
          orderableSkus: product.orderableSkus.map((sku) => sku.orderCode),
          score: matchedEvidence.length,
          matchedEvidence
        };
      })
      .sort((left, right) => right.score - left.score || left.productCode.localeCompare(right.productCode));
  }
}
