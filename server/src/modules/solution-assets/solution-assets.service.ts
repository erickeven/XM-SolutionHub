import { ApplicationError } from "../../shared/http/application-error.js";
import type { SolutionAssetsRepository } from "./solution-assets.repository.js";
import type { SolutionDetailView, SolutionSummaryView } from "./solution-assets.types.js";

export class SolutionAssetsService {
  public constructor(private readonly repository: SolutionAssetsRepository) {}

  public search(query: string, limit: number): Promise<readonly SolutionSummaryView[]> {
    return this.repository.searchPublishedSolutions(query.trim(), limit);
  }

  public async getSolution(solutionCode: string): Promise<SolutionDetailView> {
    const solution = await this.repository.findPublishedSolutionByCode(solutionCode);
    if (solution === null) throw new ApplicationError(404, 40420, "方案不存在或尚未发布");
    return solution;
  }
}
