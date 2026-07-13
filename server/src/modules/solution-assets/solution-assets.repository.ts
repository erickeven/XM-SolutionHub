import type { SolutionDetailView, SolutionSummaryView } from "./solution-assets.types.js";

export interface SolutionAssetsRepository {
  searchPublishedSolutions(query: string, limit: number): Promise<readonly SolutionSummaryView[]>;
  findPublishedSolutionByCode(solutionCode: string): Promise<SolutionDetailView | null>;
}
