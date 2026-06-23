export interface Solution {
  id: string;
  name: string;
  description: string;
  status: string;
  materials?: Material[];
  products?: ProductSolution[];
}

export interface ProductSolution {
  id: string;
  model: string;
  series: string;
}

export interface Material {
  id: string;
  title: string;
  type: string;
  previewPages?: number;
  pageCount?: number;
  mimeType?: string;
  status?: string;
}

export interface SolutionListResponse {
  items: Solution[];
  total: number;
  page: number;
  limit: number;
}
