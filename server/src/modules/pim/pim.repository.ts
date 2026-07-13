import type { ProductDetailView, ProductSummaryView } from "./pim.types.js";

export interface PimRepository {
  searchPublishedProducts(query: string, limit: number): Promise<readonly ProductSummaryView[]>;
  findPublishedProductByCode(productCode: string): Promise<ProductDetailView | null>;
}
