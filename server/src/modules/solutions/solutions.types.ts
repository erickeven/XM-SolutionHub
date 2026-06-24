export interface SolutionListItem {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SolutionDetail extends SolutionListItem {
  materials: SolutionMaterialSummary[];
  products: SolutionProductSummary[];
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
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

export interface UpdateSolutionInput {
  name?: string;
  description?: string;
  productIds?: string[];
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