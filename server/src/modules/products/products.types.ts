export interface ProductParams {
  inputVoltageMin: number;
  inputVoltageMax: number;
  outputVoltage: number;
  outputCurrent: number;
  applicationType: string;
  efficiencyLevel?: string;
  standbyPowerMax?: number;
  maxAmbientTemp?: number;
  pcbaSize?: { width: number; height: number };
  certifications?: string[];
  requiresPfc?: boolean;
  [key: string]: unknown;
}

export interface ProductListItem {
  id: string;
  model: string;
  series: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDetail extends ProductListItem {
  params: ProductParams;
  advantages: string[];
  datasheetMaterialId: string | null;
}

export interface CreateProductInput {
  model: string;
  series: string;
  params: Record<string, unknown>;
  advantages: string[];
  datasheetMaterialId?: string | null;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

export interface UpdateProductInput {
  model?: string;
  series?: string;
  params?: Record<string, unknown>;
  advantages?: string[];
  datasheetMaterialId?: string | null;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

export interface ProductQuery {
  page: number;
  limit: number;
  search?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

export interface ProductPaginatedResult {
  items: ProductListItem[];
  total: number;
  page: number;
  limit: number;
}
