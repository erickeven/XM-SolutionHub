import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

const QUERY_KEY = ['ui-content'];

export async function getUiContentMap(): Promise<Record<string, string>> {
  const { data: res } = await apiClient.get<ApiResponse<Record<string, string>>>('/ui-content');
  return res.data;
}

export function useUiContentMap() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getUiContentMap,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUiText(key: string, fallback: string): string {
  const { data } = useUiContentMap();
  return data?.[key] ?? fallback;
}

export function useUiContent() {
  const query = useUiContentMap();
  const text = useCallback(
    (key: string, fallback: string) => query.data?.[key] ?? fallback,
    [query.data],
  );
  return { ...query, text };
}
