export interface ProductParams {
  inputVoltageMin?: number;
  inputVoltageMax?: number;
  outputVoltage?: number;
  outputCurrent?: number;
  applicationType?: string;
  efficiencyLevel?: string;
  certifications?: string[];
  operatingTempMin?: number;
  operatingTempMax?: number;
  packageSize?: string;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  model: string;
  series: string;
  status: string;
  params: ProductParams;
  advantages: string[];
  datasheetMaterialId: string | null;
}

export interface ProductDetail extends Product {
  solutions?: SolutionSummary[];
}

export interface SolutionSummary {
  id: string;
  name: string;
  description: string;
  status: string;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}