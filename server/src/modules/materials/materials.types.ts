export type MaterialType = 'datasheet' | 'demo_report' | 'application_note' | 'other';

export interface MaterialListItem {
  id: string;
  solutionId: string | null;
  productId: string | null;
  type: string;
  title: string;
  mimeType: string;
  pageCount: number | null;
  previewPages: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  solutionName: string | null;
  productModel: string | null;
  productSeries: string | null;
}

export interface MaterialDetail extends MaterialListItem {
  originalStorageKey: string;
  previewStorageKey: string | null;
}

export interface CreateMaterialInput {
  type: MaterialType;
  title: string;
  solutionId?: string;
  productId?: string;
}

export interface MaterialQuery {
  page: number;
  limit: number;
  search?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  type?: MaterialType;
  solutionId?: string;
}

export interface MaterialPaginatedResult {
  items: MaterialListItem[];
  total: number;
  page: number;
  limit: number;
}