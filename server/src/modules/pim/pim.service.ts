import { ApplicationError } from "../../shared/http/application-error.js";
import type { PimRepository } from "./pim.repository.js";
import type { ProductDetailView, ProductSummaryView } from "./pim.types.js";

export class PimService {
  public constructor(private readonly repository: PimRepository) {}

  public search(query: string, limit: number): Promise<readonly ProductSummaryView[]> {
    return this.repository.searchPublishedProducts(query.trim(), limit);
  }

  public async getProduct(productCode: string): Promise<ProductDetailView> {
    const product = await this.repository.findPublishedProductByCode(productCode);
    if (product === null) throw new ApplicationError(404, 40410, "产品不存在或尚未发布");
    return product;
  }
}
