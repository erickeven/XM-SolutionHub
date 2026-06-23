// Adapter interface types — matches tech.md §7.3 exactly

export type ChatSource = {
  docId: string;
  eventId?: string;
  title: string;
  page?: number;
  snippet: string;
  entities: string[];
  score: number;
};

export type SearchTraceStep = {
  stage: 'entity' | 'fulltext' | 'vector' | 'expand' | 'rerank';
  durationMs: number;
  candidateCount: number;
  selectedIds: string[];
};

export type SearchMode = 'fast' | 'standard';

export interface SearchInput {
  query: string;
  mode: SearchMode;
  topK: number;
  returnTrace: boolean;
  /** Caller role for permission filtering. null = anonymous/external. */
  userRole?: 'USER' | 'STAFF' | 'AUDITOR' | 'ADMIN' | null;
  userId?: string | null;
}

export interface SearchOutput {
  sources: ChatSource[];
  trace: SearchTraceStep[];
  latencyMs: number;
}

export interface KnowledgeSearchAdapter {
  search(input: SearchInput): Promise<SearchOutput>;
}