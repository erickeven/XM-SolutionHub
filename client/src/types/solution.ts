export interface Solution {
  id: string;
  name: string;
  description: string;
  status: string;
  materials?: Material[];
  productSolutions?: ProductSolution[];
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