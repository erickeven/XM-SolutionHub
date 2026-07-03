export interface SelectionInput {
  inputVoltageMin: number;
  inputVoltageMax: number;
  outputVoltage: number;
  outputCurrent: number;
  applicationType?: string;
  efficiencyLevel?: string;
  standbyPowerMax?: number;
  maxAmbientTemp?: number;
  pcbaSize?: { width: number; height: number };
  certifications?: string[];
  requiresPfc?: boolean;
}

export interface MatchResult {
  productId: string;
  model: string;
  series: string;
  params: Record<string, unknown>;
  advantages: string[];
  datasheetMaterialId?: string | null;
  matchLevel: 'exact' | 'approximate' | 'fallback';
  score: number;
  reasons: string[];
  diffs: string[];
}

export interface ProductForMatching {
  id: string;
  model: string;
  series: string;
  status: string;
  params: Record<string, unknown>;
  advantages: string[];
  datasheetMaterialId?: string | null;
}

export type MatchLevel = 'exact' | 'approximate' | 'fallback';
