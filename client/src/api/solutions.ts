import { apiClient } from './client';
import type { ApiResponse } from '../types/api';
import type { Solution, Material, SolutionListResponse } from '../types/solution';

export async function listSolutions(page = 1, limit = 20): Promise<SolutionListResponse> {
  const { data: res } = await apiClient.get<ApiResponse<SolutionListResponse>>('/solutions', {
    params: { page, limit },
  });
  return res.data;
}

export async function getSolutionById(id: string): Promise<Solution> {
  const { data: res } = await apiClient.get<ApiResponse<Solution>>(`/solutions/${id}`);
  return res.data;
}

export async function getSolutionMaterials(solutionId: string): Promise<Material[]> {
  const { data: res } = await apiClient.get<ApiResponse<{ items: Material[] }>>(
    `/solutions/${solutionId}/materials`,
  );
  return res.data.items;
}

export async function getMaterialPreview(
  materialId: string,
): Promise<{ url: string; previewPages: number }> {
  const { data: res } = await apiClient.get<ApiResponse<{ url: string; previewPages: number }>>(
    `/materials/${materialId}/preview`,
  );
  return res.data;
}

export async function downloadMaterial(
  materialId: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  const { data: res } = await apiClient.post<
    ApiResponse<{ url: string; expiresInSeconds: number }>
  >(`/materials/${materialId}/download`);
  return res.data;
}
