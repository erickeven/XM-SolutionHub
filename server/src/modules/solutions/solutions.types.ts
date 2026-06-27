export interface SolutionListItem {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  materialCount?: number;
}

export interface SolutionDetail extends SolutionListItem {
  materials: SolutionMaterialSummary[];
  products: SolutionProductSummary[];
  productIds: string[];
  materialIds: string[];
}

export interface SolutionMaterialSummary {
  id: string;
  type: string;
  title: string;
  status: string;
}

export interface SolutionProductSummary {
  id: string;
  model: string;
  series: string;
}

export interface CreateSolutionInput {
  name: string;
  description: string;
  productIds?: string[];
  materialIds?: string[];
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

export interface UpdateSolutionInput {
  name?: string;
  description?: string;
  productIds?: string[];
  materialIds?: string[];
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

export interface SolutionQuery {
  page: number;
  limit: number;
  search?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

export interface SolutionPaginatedResult {
  items: SolutionListItem[];
  total: number;
  page: number;
  limit: number;
}