export interface SelectionInput {
  inputVoltageMin: number;
  inputVoltageMax: number;
  outputVoltage: number;
  outputCurrent: number;
  applicationType: string;
  efficiencyLevel?: string;
  certifications?: string[];
}

export interface MatchResult {
  productId: string;
  model: string;
  matchLevel: 'exact' | 'approximate' | 'fallback';
  score: number;
  reasons: string[];
  diffs: string[];
}

export type MatchLevel = MatchResult['matchLevel'];