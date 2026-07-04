import type {
  KnowledgeDoc,
  KnowledgeIndexJob,
  KnowledgeStatus,
  IndexJobStatus,
  SearchTrace,
} from '@prisma/client';

export type { KnowledgeDoc, KnowledgeIndexJob, KnowledgeStatus, IndexJobStatus, SearchTrace };

export interface KnowledgeDocListItem {
  id: string;
  materialId: string;
  title: string;
  sourceType: string;
  status: KnowledgeStatus;
  indexVersion: string | null;
  indexedAt: Date | null;
  errorMessage: string | null;
  materialTitle: string | null;
  createdAt?: Date;
}

export interface KnowledgeDocDetail extends KnowledgeDocListItem {
  latestIndexJob: KnowledgeIndexJob | null;
  chunkCount: number;
  eventCount: number;
  entityCount: number;
}

export interface CreateKnowledgeInput {
  materialId?: string;
  title?: string;
  sourceType: string;
  // File upload path
  fileBuffer?: Buffer;
  originalName?: string;
  mimeType?: string;
}

export interface CreateKnowledgeResponse {
  id: string;
  title: string;
  sourceType: string;
  status: KnowledgeStatus;
  materialId: string;
  material: { id: string; title: string };
  indexJob: { id: string; status: IndexJobStatus };
}

export interface UpdateKnowledgeInput {
  title?: string;
  sourceType?: string;
}

export interface ReindexResponse {
  jobId: string;
  status: IndexJobStatus;
  indexVersion: string;
}

export interface TraceResponse {
  doc: KnowledgeDoc;
  latestIndexJob: KnowledgeIndexJob | null;
  recentTraces: SearchTrace[];
  chunkCount: number;
  eventCount: number;
  entityCount: number;
}

export interface KnowledgePaginatedResult {
  items: KnowledgeDocListItem[];
  total: number;
  page: number;
  pageSize: number;
}