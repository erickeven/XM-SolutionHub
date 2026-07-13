export interface SelectionCandidate {
  readonly productCode: string;
  readonly name: string;
  readonly summary: string;
  readonly orderableSkus: readonly string[];
  readonly score: number;
  readonly matchedEvidence: readonly string[];
}

export interface SelectionRepository {
  findPublishedCandidates(terms: readonly string[], limit: number): Promise<readonly SelectionCandidate[]>;
}
