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
  metadata: Record<string, unknown> | null;
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
  metadata?: Record<string, unknown>;
}

export interface MaterialQuery {
  page: number;
  limit: number;
  search?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  type?: MaterialType;
  solutionId?: string;
  productId?: string;
}

export interface MaterialPaginatedResult {
  items: MaterialListItem[];
  total: number;
  page: number;
  limit: number;
}