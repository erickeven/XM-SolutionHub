import type { SelectionCandidate, SelectionRepository } from "./selection.types.js";

export class SelectionService {
  public constructor(private readonly repository: SelectionRepository) {}

  public match(application: string, keywords: readonly string[], limit: number): Promise<readonly SelectionCandidate[]> {
    const terms = [application, ...keywords].map((term) => term.trim()).filter((term) => term.length > 0);
    if (terms.length === 0) return Promise.resolve([]);
    return this.repository.findPublishedCandidates([...new Set(terms)], limit);
  }
}
