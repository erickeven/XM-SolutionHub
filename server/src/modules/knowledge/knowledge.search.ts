import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { env } from '../../config';
import { logger } from '../../lib/logger';
import { embed } from '../../lib/ai/embedding';
import { extractQueryEntities, llmRankCandidates } from '../../lib/ai/extract';
import type {
  ChatSource,
  SearchInput,
  SearchOutput,
  SearchTraceStep,
  SearchMode,
  KnowledgeSearchAdapter,
} from './knowledge.search.types';

// ── Raw SQL row types ───────────────────────────────────

interface EntityRow {
  id: string;
  name: string;
  normalizedName: string;
  sim: number;
}

interface ChunkRow {
  id: string;
  content: string;
  page: number | null;
  docId: string;
  rank: number;
}

interface VectorChunkRow {
  id: string;
  content: string;
  page: number | null;
  docId: string;
  similarity: number;
}

interface EventVectorRow {
  id: string;
  chunkId: string;
  summary: string;
  similarity: number;
}

interface ExpandedChunkRow {
  id: string;
  content: string;
  page: number | null;
  docId: string;
}

interface DocTitleRow {
  id: string;
  title: string;
}

interface EventEntityNameRow {
  eventId: string;
  entityName: string;
}

// ── Internal candidate type ─────────────────────────────

interface Candidate {
  id: string;
  content: string;
  page: number | null;
  docId: string;
  eventId?: string;
  score: number;
}

// ── Rerank ──────────────────────────────────────────────

interface RerankResult {
  id: string;
  score: number;
}

interface RerankApiResponse {
  results: Array<{ index: number; relevance_score: number }>;
}

async function rerank(
  query: string,
  documents: { id: string; content: string }[],
  fallbackScores: Map<string, number>,
): Promise<RerankResult[]> {
  if (!env.RERANK_API_KEY || !env.RERANK_BASE_URL) {
    // Fall back to vector similarity scores when reranking is unavailable.
    logger.warn({ query }, 'Rerank API not configured, using vector similarity fallback');
    return documents.map((d) => ({
      id: d.id,
      score: fallbackScores.get(d.id) ?? 0.5,
    }));
  }

  try {
    const response = await fetch(`${env.RERANK_BASE_URL}/v1/rerank`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RERANK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.RERANK_MODEL,
        query,
        documents: documents.map((d) => d.content.slice(0, 512)),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.warn({ status: response.status, body }, 'Rerank API error, using fallback scores');
      return documents.map((d) => ({
        id: d.id,
        score: fallbackScores.get(d.id) ?? 0.5,
      }));
    }

    const data = (await response.json()) as RerankApiResponse;
    return data.results.map((r) => ({
      id: documents[r.index]!.id,
      score: r.relevance_score,
    }));
  } catch (err) {
    logger.warn({ err }, 'Rerank API call failed, using fallback scores');
    return documents.map((d) => ({
      id: d.id,
      score: fallbackScores.get(d.id) ?? 0.5,
    }));
  }
}

// ── Merge / dedup helpers ───────────────────────────────

function dedupCandidates(candidates: Candidate[]): Candidate[] {
  const map = new Map<string, Candidate>();
  for (const c of candidates) {
    const existing = map.get(c.id);
    if (!existing || c.score > existing.score) {
      map.set(c.id, c);
    }
  }
  return Array.from(map.values());
}

function buildSnippet(content: string, maxLen = 200): string {
  if (content.length <= maxLen) return content;
  return content.slice(0, maxLen) + '...';
}

// ── Permission filter ───────────────────────────────────

/**
 * Visibility level for candidate doc filtering.
 * Extensible: when schema adds an internal-only flag, USER maps to PUBLIC
 * and STAFF/AUDITOR/ADMIN map to INTERNAL.
 */
type VisibilityLevel = 'PUBLIC' | 'INTERNAL';

function roleToVisibilityLevel(userRole: string | null): VisibilityLevel {
  // External/anonymous users see public docs only.
  // STAFF/AUDITOR/ADMIN see all docs including internal-only (future).
  if (userRole === 'STAFF' || userRole === 'AUDITOR' || userRole === 'ADMIN') {
    return 'INTERNAL';
  }
  return 'PUBLIC';
}

/**
 * Build candidate doc IDs based on role and material status.
 * Permission filtering happens BEFORE similarity queries.
 * tech.md §7.2 L382: "禁止召回后仅在前端隐藏无权限来源"
 *
 * Current schema has no explicit internal-only flag on KnowledgeDoc or Material,
 * so all READY+ACTIVE docs are visible to all roles. The visibilityLevel
 * parameter is structured for future extension when an internal flag is added.
 */
async function buildCandidateDocIds(userRole: string | null): Promise<string[]> {
  const visibilityLevel = roleToVisibilityLevel(userRole);

  const rows = await prisma.knowledgeDoc.findMany({
    where: {
      status: 'READY',
      material: { status: 'ACTIVE' },
      // Future: when schema has visibility/internalOnly field, filter here:
      // visibilityLevel === 'PUBLIC' ? { internalOnly: false } : undefined
    },
    select: { id: true },
  });

  // visibilityLevel is currently a no-op until the schema gains an internal flag.
  // When added, the where clause above will use it to exclude internal-only docs for PUBLIC.
  void visibilityLevel;

  return rows.map((r) => r.id);
}

// ── Adapter ─────────────────────────────────────────────

class FastKnowledgeSearchAdapter implements KnowledgeSearchAdapter {
  async search(input: SearchInput): Promise<SearchOutput> {
    const startTime = Date.now();
    const trace: SearchTraceStep[] = [];
    const { query, topK } = input;

    // Permission filter FIRST (tech.md §7.2 L382): construct candidate set before any similarity query
    const candidateDocIds = await buildCandidateDocIds(input.userRole ?? null);
    if (candidateDocIds.length === 0) {
      const latencyMs = Date.now() - startTime;
      await this.saveTrace(input, [], latencyMs, trace);
      return { sources: [], trace, latencyMs };
    }

    const docIdSet = new Set(candidateDocIds);
    const docIdList = candidateDocIds;

    // 1. Entity retrieval
    const entityStart = Date.now();
    const entityRows = await this.entityRetrieval(query);
    const entityIds = entityRows.map((e) => e.id);
    const entityDuration = Date.now() - entityStart;
    trace.push({
      stage: 'entity',
      durationMs: entityDuration,
      candidateCount: entityRows.length,
      selectedIds: entityIds,
    });

    // 2. Fulltext retrieval
    const fulltextStart = Date.now();
    const fulltextChunks = await this.fulltextRetrieval(query, docIdList);
    const fulltextDuration = Date.now() - fulltextStart;
    trace.push({
      stage: 'fulltext',
      durationMs: fulltextDuration,
      candidateCount: fulltextChunks.length,
      selectedIds: fulltextChunks.map((c) => c.id),
    });

    // 3. Vector retrieval (degradation: skip if pgvector disabled)
    const vectorStart = Date.now();
    let vectorChunks: VectorChunkRow[] = [];
    let vectorEvents: EventVectorRow[] = [];
    if (env.PGVECTOR_ENABLED) {
      const result = await this.vectorRetrieval(query, docIdList);
      vectorChunks = result.vectorChunks;
      vectorEvents = result.vectorEvents;
    } else {
      logger.warn({ query }, 'pgvector disabled, skipping vector recall stage');
    }
    const vectorDuration = Date.now() - vectorStart;
    trace.push({
      stage: 'vector',
      durationMs: vectorDuration,
      candidateCount: vectorChunks.length + vectorEvents.length,
      selectedIds: [...vectorChunks.map((c) => c.id), ...vectorEvents.map((e) => e.id)],
    });

    // 4. SQL expand (2-hop entity expansion)
    const expandStart = Date.now();
    const expandedChunks = await this.expandEntities(entityIds, docIdSet);
    const expandDuration = Date.now() - expandStart;
    trace.push({
      stage: 'expand',
      durationMs: expandDuration,
      candidateCount: expandedChunks.length,
      selectedIds: expandedChunks.map((c) => c.id),
    });

    // 5. Merge & dedup
    const allCandidates: Candidate[] = [];

    for (const c of fulltextChunks) {
      allCandidates.push({
        id: c.id,
        content: c.content,
        page: c.page,
        docId: c.docId,
        score: c.rank,
      });
    }

    for (const c of vectorChunks) {
      allCandidates.push({
        id: c.id,
        content: c.content,
        page: c.page,
        docId: c.docId,
        score: c.similarity,
      });
    }

    // Map events to their chunks
    const eventChunkIds = new Set<string>();
    for (const e of vectorEvents) {
      eventChunkIds.add(e.chunkId);
      allCandidates.push({
        id: e.chunkId,
        content: e.summary,
        page: null,
        docId: '', // will be filled from chunk lookup below
        eventId: e.id,
        score: e.similarity,
      });
    }

    for (const c of expandedChunks) {
      allCandidates.push({
        id: c.id,
        content: c.content,
        page: c.page,
        docId: c.docId,
        score: 0.3, // expansion gets a base score; rerank will override
      });
    }

    // Fill docId for event-based candidates by looking up chunk info
    if (eventChunkIds.size > 0) {
      const chunkInfos = await prisma.knowledgeChunk.findMany({
        where: { id: { in: Array.from(eventChunkIds) } },
        select: { id: true, docId: true, content: true, page: true },
      });
      const chunkMap = new Map(chunkInfos.map((c) => [c.id, c]));
      for (const c of allCandidates) {
        if (c.eventId && !c.docId) {
          const info = chunkMap.get(c.id);
          if (info) {
            c.docId = info.docId;
            c.content = info.content;
            c.page = info.page;
          }
        }
      }
    }

    // Filter out candidates without valid docId (in candidate set)
    const filtered = allCandidates.filter((c) => c.docId && docIdSet.has(c.docId));
    const deduped = dedupCandidates(filtered);

    // Limit to topK candidates for rerank
    const topCandidates = deduped
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(topK, 30));

    // 6. Rerank
    const rerankStart = Date.now();
    const fallbackScores = new Map<string, number>();
    for (const c of topCandidates) {
      fallbackScores.set(c.id, c.score);
    }
    const rerankResults = await rerank(
      query,
      topCandidates.map((c) => ({ id: c.id, content: c.content })),
      fallbackScores,
    );
    const rerankDuration = Date.now() - rerankStart;
    trace.push({
      stage: 'rerank',
      durationMs: rerankDuration,
      candidateCount: topCandidates.length,
      selectedIds: rerankResults.slice(0, 5).map((r) => r.id),
    });

    // 7. Build ChatSource[] from top 5
    const top5 = rerankResults.sort((a, b) => b.score - a.score).slice(0, 5);
    const candidateMap = new Map(topCandidates.map((c) => [c.id, c]));

    // Fetch doc titles
    const docIds = new Set(top5.map((r) => candidateMap.get(r.id)?.docId).filter((d): d is string => !!d));
    const docTitles = await this.fetchDocTitles(Array.from(docIds));
    const titleMap = new Map(docTitles.map((d) => [d.id, d.title]));

    // Fetch entities for top 5 chunks
    const chunkIds = top5.map((r) => r.id);
    const entityNames = await this.fetchChunkEntityNames(chunkIds);
    const entityNamesMap = new Map<string, string[]>();
    for (const row of entityNames) {
      const list = entityNamesMap.get(row.eventId) ?? [];
      list.push(row.entityName);
      entityNamesMap.set(row.eventId, list);
    }

    const sources: ChatSource[] = [];
    for (const r of top5) {
      const candidate = candidateMap.get(r.id);
      if (!candidate) continue;

      // Score threshold filter
      if (r.score < env.KNOWLEDGE_SCORE_THRESHOLD) continue;

      sources.push({
        docId: candidate.docId,
        eventId: candidate.eventId,
        title: titleMap.get(candidate.docId) ?? '',
        page: candidate.page ?? undefined,
        snippet: buildSnippet(candidate.content),
        entities: entityNamesMap.get(candidate.eventId ?? '') ?? [],
        score: r.score,
      });
    }

    const latencyMs = Date.now() - startTime;

    // 9. Save SearchTrace
    await this.saveTrace(input, sources, latencyMs, trace);

    return { sources, trace, latencyMs };
  }

  // ── Stage 1: Entity retrieval ─────────────────────────

  private async entityRetrieval(query: string): Promise<EntityRow[]> {
    const rows = await prisma.$queryRaw<EntityRow[]>`
      SELECT id, name, "normalizedName", similarity("normalizedName", ${query}) as sim
      FROM "KnowledgeEntity"
      WHERE "normalizedName" ILIKE ${query + '%'}
         OR "normalizedName" % ${query}
      ORDER BY sim DESC
      LIMIT 20
    `;
    return rows;
  }

  // ── Stage 2: Fulltext retrieval ────────────────────────

  private async fulltextRetrieval(query: string, docIds: string[]): Promise<ChunkRow[]> {
    if (docIds.length === 0) return [];
    const rows = await prisma.$queryRaw<ChunkRow[]>`
      SELECT c.id, c.content, c.page, c."docId",
        ts_rank_cd(to_tsvector('simple', c.content), plainto_tsquery('simple', ${query})) as rank
      FROM "KnowledgeChunk" c
      JOIN "KnowledgeDoc" d ON c."docId" = d.id
      WHERE d.status = 'READY'
        AND c."indexVersion" = d."indexVersion"
        AND c."docId" IN (${Prisma.join(docIds)})
        AND to_tsvector('simple', c.content) @@ plainto_tsquery('simple', ${query})
      ORDER BY rank DESC
      LIMIT 30
    `;
    return rows;
  }

  // ── Stage 3: Vector retrieval ─────────────────────────

  private async vectorRetrieval(
    query: string,
    docIds: string[],
  ): Promise<{ vectorChunks: VectorChunkRow[]; vectorEvents: EventVectorRow[] }> {
    if (docIds.length === 0) return { vectorChunks: [], vectorEvents: [] };

    const queryEmbedding = await embed(query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const chunks = await prisma.$queryRaw<VectorChunkRow[]>`
      SELECT c.id, c.content, c.page, c."docId",
        1 - (c.embedding <=> ${vectorStr}::vector) as similarity
      FROM "KnowledgeChunk" c
      JOIN "KnowledgeDoc" d ON c."docId" = d.id
      WHERE d.status = 'READY'
        AND c."indexVersion" = d."indexVersion"
        AND c.embedding IS NOT NULL
        AND c."docId" IN (${Prisma.join(docIds)})
      ORDER BY c.embedding <=> ${vectorStr}::vector
      LIMIT 30
    `;

    const events = await prisma.$queryRaw<EventVectorRow[]>`
      SELECT e.id, e."chunkId", e.summary,
        1 - (e.embedding <=> ${vectorStr}::vector) as similarity
      FROM "KnowledgeEvent" e
      JOIN "KnowledgeChunk" c ON e."chunkId" = c.id
      JOIN "KnowledgeDoc" d ON c."docId" = d.id
      WHERE d.status = 'READY'
        AND c."indexVersion" = d."indexVersion"
        AND e.embedding IS NOT NULL
        AND c."docId" IN (${Prisma.join(docIds)})
      ORDER BY e.embedding <=> ${vectorStr}::vector
      LIMIT 30
    `;

    return { vectorChunks: chunks, vectorEvents: events };
  }

  // ── Stage 4: Entity expansion (2-hop) ──────────────────

  private async expandEntities(
    entityIds: string[],
    docIdSet: Set<string>,
  ): Promise<ExpandedChunkRow[]> {
    if (entityIds.length === 0) return [];

    const rows = await prisma.$queryRaw<ExpandedChunkRow[]>`
      WITH hop1 AS (
        SELECT DISTINCT ee."eventId"
        FROM "KnowledgeEventEntity" ee
        WHERE ee."entityId" IN (${Prisma.join(entityIds)})
      ),
      hop2 AS (
        SELECT DISTINCT ee2."entityId"
        FROM "KnowledgeEventEntity" ee2
        WHERE ee2."eventId" IN (SELECT "eventId" FROM hop1)
      ),
      hop2_events AS (
        SELECT DISTINCT ee3."eventId"
        FROM "KnowledgeEventEntity" ee3
        WHERE ee3."entityId" IN (SELECT "entityId" FROM hop2)
      )
      SELECT c.id, c.content, c.page, c."docId"
      FROM "KnowledgeChunk" c
      JOIN "KnowledgeEvent" e ON c.id = e."chunkId"
      WHERE e.id IN (SELECT "eventId" FROM hop1)
         OR e.id IN (SELECT "eventId" FROM hop2_events)
      LIMIT 30
    `;

    // Filter by candidate doc set
    return rows.filter((r) => docIdSet.has(r.docId));
  }

  // ── Helpers ────────────────────────────────────────────

  private async fetchDocTitles(docIds: string[]): Promise<DocTitleRow[]> {
    if (docIds.length === 0) return [];
    return prisma.knowledgeDoc.findMany({
      where: { id: { in: docIds } },
      select: { id: true, title: true },
    });
  }

  private async fetchChunkEntityNames(chunkIds: string[]): Promise<EventEntityNameRow[]> {
    if (chunkIds.length === 0) return [];
    const rows = await prisma.$queryRaw<EventEntityNameRow[]>`
      SELECT e.id as "eventId", ent.name as "entityName"
      FROM "KnowledgeEvent" e
      JOIN "KnowledgeEventEntity" ee ON e.id = ee."eventId"
      JOIN "KnowledgeEntity" ent ON ee."entityId" = ent.id
      WHERE e."chunkId" IN (${Prisma.join(chunkIds)})
    `;
    return rows;
  }

  private async saveTrace(
    input: SearchInput,
    sources: ChatSource[],
    latencyMs: number,
    trace: SearchTraceStep[],
  ): Promise<void> {
    try {
      await prisma.searchTrace.create({
        data: {
          userId: input.userId ?? null,
          query: input.query,
          mode: input.mode,
          latencyMs,
          steps: input.returnTrace ? (trace as unknown as Prisma.InputJsonValue) : undefined,
        },
      });
    } catch (err) {
      // Trace saving is best-effort — don't fail the search
      logger.warn({ err }, 'Failed to save SearchTrace');
    }
    // Avoid unused variable warning
    void sources;
  }
}

// ── Standard mode adapter ───────────────────────────────

class StandardKnowledgeSearchAdapter implements KnowledgeSearchAdapter {
  async search(input: SearchInput): Promise<SearchOutput> {
    const startTime = Date.now();
    const trace: SearchTraceStep[] = [];
    const { query, topK } = input;

    // Permission filter FIRST (tech.md §7.2 L382): construct candidate set before any similarity query
    const candidateDocIds = await buildCandidateDocIds(input.userRole ?? null);
    if (candidateDocIds.length === 0) {
      const latencyMs = Date.now() - startTime;
      await this.saveTrace(input, [], latencyMs, trace);
      return { sources: [], trace, latencyMs };
    }

    const docIdSet = new Set(candidateDocIds);
    const docIdList = candidateDocIds;

    // 1. LLM entity extraction (degradation: fall back to trigram if LLM unavailable)
    const entityStart = Date.now();
    const llmEntities = await extractQueryEntities(query);
    let entityRows: EntityRow[];

    if (llmEntities.length > 0) {
      // Use LLM-extracted entity names to match KnowledgeEntity
      entityRows = await this.entityRetrievalByNames(llmEntities);
    } else {
      // Degradation: fall back to trigram/prefix matching (same as fast mode)
      logger.warn({ query }, 'LLM entity extraction unavailable, falling back to trigram matching');
      entityRows = await this.entityRetrieval(query);
    }

    const entityIds = entityRows.map((e) => e.id);
    const entityDuration = Date.now() - entityStart;
    trace.push({
      stage: 'entity',
      durationMs: entityDuration,
      candidateCount: entityRows.length,
      selectedIds: entityIds,
    });

    // 2. Fulltext retrieval (same as fast mode)
    const fulltextStart = Date.now();
    const fulltextChunks = await this.fulltextRetrieval(query, docIdList);
    const fulltextDuration = Date.now() - fulltextStart;
    trace.push({
      stage: 'fulltext',
      durationMs: fulltextDuration,
      candidateCount: fulltextChunks.length,
      selectedIds: fulltextChunks.map((c) => c.id),
    });

    // 3. Vector retrieval (degradation: skip if pgvector disabled)
    const vectorStart = Date.now();
    let vectorChunks: VectorChunkRow[] = [];
    let vectorEvents: EventVectorRow[] = [];
    if (env.PGVECTOR_ENABLED) {
      const result = await this.vectorRetrieval(query, docIdList);
      vectorChunks = result.vectorChunks;
      vectorEvents = result.vectorEvents;
    } else {
      logger.warn({ query }, 'pgvector disabled, skipping vector recall stage (standard mode)');
    }
    const vectorDuration = Date.now() - vectorStart;
    trace.push({
      stage: 'vector',
      durationMs: vectorDuration,
      candidateCount: vectorChunks.length + vectorEvents.length,
      selectedIds: [...vectorChunks.map((c) => c.id), ...vectorEvents.map((e) => e.id)],
    });

    // 4. SQL expand (2-hop entity expansion, same as fast mode)
    const expandStart = Date.now();
    const expandedChunks = await this.expandEntities(entityIds, docIdSet);
    const expandDuration = Date.now() - expandStart;
    trace.push({
      stage: 'expand',
      durationMs: expandDuration,
      candidateCount: expandedChunks.length,
      selectedIds: expandedChunks.map((c) => c.id),
    });

    // 5. Merge & dedup (same logic as fast mode)
    const allCandidates: Candidate[] = [];

    for (const c of fulltextChunks) {
      allCandidates.push({
        id: c.id,
        content: c.content,
        page: c.page,
        docId: c.docId,
        score: c.rank,
      });
    }

    for (const c of vectorChunks) {
      allCandidates.push({
        id: c.id,
        content: c.content,
        page: c.page,
        docId: c.docId,
        score: c.similarity,
      });
    }

    const eventChunkIds = new Set<string>();
    for (const e of vectorEvents) {
      eventChunkIds.add(e.chunkId);
      allCandidates.push({
        id: e.chunkId,
        content: e.summary,
        page: null,
        docId: '',
        eventId: e.id,
        score: e.similarity,
      });
    }

    for (const c of expandedChunks) {
      allCandidates.push({
        id: c.id,
        content: c.content,
        page: c.page,
        docId: c.docId,
        score: 0.3,
      });
    }

    // Fill docId for event-based candidates
    if (eventChunkIds.size > 0) {
      const chunkInfos = await prisma.knowledgeChunk.findMany({
        where: { id: { in: Array.from(eventChunkIds) } },
        select: { id: true, docId: true, content: true, page: true },
      });
      const chunkMap = new Map(chunkInfos.map((c) => [c.id, c]));
      for (const c of allCandidates) {
        if (c.eventId && !c.docId) {
          const info = chunkMap.get(c.id);
          if (info) {
            c.docId = info.docId;
            c.content = info.content;
            c.page = info.page;
          }
        }
      }
    }

    const filtered = allCandidates.filter((c) => c.docId && docIdSet.has(c.docId));
    const deduped = dedupCandidates(filtered);

    const topCandidates = deduped
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(topK, 30));

    // 6. LLM precision ranking (degradation: fall back to rerank API, then vector scores)
    const rerankStart = Date.now();
    const fallbackScores = new Map<string, number>();
    for (const c of topCandidates) {
      fallbackScores.set(c.id, c.score);
    }

    let rerankResults: RerankResult[];

    // Try LLM ranking first (standard mode feature)
    const llmResults = await llmRankCandidates(
      query,
      topCandidates.map((c) => ({ id: c.id, content: c.content })),
    );

    if (llmResults !== null) {
      rerankResults = llmResults;
    } else {
      // Degradation: fall back to rerank API (same as fast mode)
      logger.warn({ query }, 'LLM ranking unavailable, falling back to rerank API');
      rerankResults = await rerank(
        query,
        topCandidates.map((c) => ({ id: c.id, content: c.content })),
        fallbackScores,
      );
    }

    const rerankDuration = Date.now() - rerankStart;
    trace.push({
      stage: 'rerank',
      durationMs: rerankDuration,
      candidateCount: topCandidates.length,
      selectedIds: rerankResults.slice(0, 5).map((r) => r.id),
    });

    // 7. Build ChatSource[] from top 5 (same as fast mode)
    const top5 = rerankResults.sort((a, b) => b.score - a.score).slice(0, 5);
    const candidateMap = new Map(topCandidates.map((c) => [c.id, c]));

    const docIds = new Set(top5.map((r) => candidateMap.get(r.id)?.docId).filter((d): d is string => !!d));
    const docTitles = await this.fetchDocTitles(Array.from(docIds));
    const titleMap = new Map(docTitles.map((d) => [d.id, d.title]));

    const chunkIds = top5.map((r) => r.id);
    const entityNames = await this.fetchChunkEntityNames(chunkIds);
    const entityNamesMap = new Map<string, string[]>();
    for (const row of entityNames) {
      const list = entityNamesMap.get(row.eventId) ?? [];
      list.push(row.entityName);
      entityNamesMap.set(row.eventId, list);
    }

    const sources: ChatSource[] = [];
    for (const r of top5) {
      const candidate = candidateMap.get(r.id);
      if (!candidate) continue;

      if (r.score < env.KNOWLEDGE_SCORE_THRESHOLD) continue;

      sources.push({
        docId: candidate.docId,
        eventId: candidate.eventId,
        title: titleMap.get(candidate.docId) ?? '',
        page: candidate.page ?? undefined,
        snippet: buildSnippet(candidate.content),
        entities: entityNamesMap.get(candidate.eventId ?? '') ?? [],
        score: r.score,
      });
    }

    const latencyMs = Date.now() - startTime;
    await this.saveTrace(input, sources, latencyMs, trace);

    return { sources, trace, latencyMs };
  }

  // ── Entity retrieval by LLM-extracted names ───────────

  private async entityRetrievalByNames(names: string[]): Promise<EntityRow[]> {
    if (names.length === 0) return [];
    const rows = await prisma.$queryRaw<EntityRow[]>`
      SELECT id, name, "normalizedName", 1.0 as sim
      FROM "KnowledgeEntity"
      WHERE "normalizedName" IN (${Prisma.join(names)})
      LIMIT 20
    `;
    return rows;
  }

  // ── Entity retrieval (trigram fallback, same as fast mode) ──

  private async entityRetrieval(query: string): Promise<EntityRow[]> {
    const rows = await prisma.$queryRaw<EntityRow[]>`
      SELECT id, name, "normalizedName", similarity("normalizedName", ${query}) as sim
      FROM "KnowledgeEntity"
      WHERE "normalizedName" ILIKE ${query + '%'}
         OR "normalizedName" % ${query}
      ORDER BY sim DESC
      LIMIT 20
    `;
    return rows;
  }

  // ── Fulltext retrieval (same as fast mode) ─────────────

  private async fulltextRetrieval(query: string, docIds: string[]): Promise<ChunkRow[]> {
    if (docIds.length === 0) return [];
    const rows = await prisma.$queryRaw<ChunkRow[]>`
      SELECT c.id, c.content, c.page, c."docId",
        ts_rank_cd(to_tsvector('simple', c.content), plainto_tsquery('simple', ${query})) as rank
      FROM "KnowledgeChunk" c
      JOIN "KnowledgeDoc" d ON c."docId" = d.id
      WHERE d.status = 'READY'
        AND c."indexVersion" = d."indexVersion"
        AND c."docId" IN (${Prisma.join(docIds)})
        AND to_tsvector('simple', c.content) @@ plainto_tsquery('simple', ${query})
      ORDER BY rank DESC
      LIMIT 30
    `;
    return rows;
  }

  // ── Vector retrieval (same as fast mode) ──────────────

  private async vectorRetrieval(
    query: string,
    docIds: string[],
  ): Promise<{ vectorChunks: VectorChunkRow[]; vectorEvents: EventVectorRow[] }> {
    if (docIds.length === 0) return { vectorChunks: [], vectorEvents: [] };

    const queryEmbedding = await embed(query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const chunks = await prisma.$queryRaw<VectorChunkRow[]>`
      SELECT c.id, c.content, c.page, c."docId",
        1 - (c.embedding <=> ${vectorStr}::vector) as similarity
      FROM "KnowledgeChunk" c
      JOIN "KnowledgeDoc" d ON c."docId" = d.id
      WHERE d.status = 'READY'
        AND c."indexVersion" = d."indexVersion"
        AND c.embedding IS NOT NULL
        AND c."docId" IN (${Prisma.join(docIds)})
      ORDER BY c.embedding <=> ${vectorStr}::vector
      LIMIT 30
    `;

    const events = await prisma.$queryRaw<EventVectorRow[]>`
      SELECT e.id, e."chunkId", e.summary,
        1 - (e.embedding <=> ${vectorStr}::vector) as similarity
      FROM "KnowledgeEvent" e
      JOIN "KnowledgeChunk" c ON e."chunkId" = c.id
      JOIN "KnowledgeDoc" d ON c."docId" = d.id
      WHERE d.status = 'READY'
        AND c."indexVersion" = d."indexVersion"
        AND e.embedding IS NOT NULL
        AND c."docId" IN (${Prisma.join(docIds)})
      ORDER BY e.embedding <=> ${vectorStr}::vector
      LIMIT 30
    `;

    return { vectorChunks: chunks, vectorEvents: events };
  }

  // ── Entity expansion (2-hop, same as fast mode) ────────

  private async expandEntities(
    entityIds: string[],
    docIdSet: Set<string>,
  ): Promise<ExpandedChunkRow[]> {
    if (entityIds.length === 0) return [];

    const rows = await prisma.$queryRaw<ExpandedChunkRow[]>`
      WITH hop1 AS (
        SELECT DISTINCT ee."eventId"
        FROM "KnowledgeEventEntity" ee
        WHERE ee."entityId" IN (${Prisma.join(entityIds)})
      ),
      hop2 AS (
        SELECT DISTINCT ee2."entityId"
        FROM "KnowledgeEventEntity" ee2
        WHERE ee2."eventId" IN (SELECT "eventId" FROM hop1)
      ),
      hop2_events AS (
        SELECT DISTINCT ee3."eventId"
        FROM "KnowledgeEventEntity" ee3
        WHERE ee3."entityId" IN (SELECT "entityId" FROM hop2)
      )
      SELECT c.id, c.content, c.page, c."docId"
      FROM "KnowledgeChunk" c
      JOIN "KnowledgeEvent" e ON c.id = e."chunkId"
      WHERE e.id IN (SELECT "eventId" FROM hop1)
         OR e.id IN (SELECT "eventId" FROM hop2_events)
      LIMIT 30
    `;

    return rows.filter((r) => docIdSet.has(r.docId));
  }

  // ── Helpers (same as fast mode) ────────────────────────

  private async fetchDocTitles(docIds: string[]): Promise<DocTitleRow[]> {
    if (docIds.length === 0) return [];
    return prisma.knowledgeDoc.findMany({
      where: { id: { in: docIds } },
      select: { id: true, title: true },
    });
  }

  private async fetchChunkEntityNames(chunkIds: string[]): Promise<EventEntityNameRow[]> {
    if (chunkIds.length === 0) return [];
    const rows = await prisma.$queryRaw<EventEntityNameRow[]>`
      SELECT e.id as "eventId", ent.name as "entityName"
      FROM "KnowledgeEvent" e
      JOIN "KnowledgeEventEntity" ee ON e.id = ee."eventId"
      JOIN "KnowledgeEntity" ent ON ee."entityId" = ent.id
      WHERE e."chunkId" IN (${Prisma.join(chunkIds)})
    `;
    return rows;
  }

  private async saveTrace(
    input: SearchInput,
    sources: ChatSource[],
    latencyMs: number,
    trace: SearchTraceStep[],
  ): Promise<void> {
    try {
      await prisma.searchTrace.create({
        data: {
          userId: input.userId ?? null,
          query: input.query,
          mode: input.mode,
          latencyMs,
          steps: input.returnTrace ? (trace as unknown as Prisma.InputJsonValue) : undefined,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to save SearchTrace');
    }
    void sources;
  }
}

// ── Degradation-aware search entry point ────────────────

export async function searchKnowledgeWithDegradation(
  query: string,
  mode: SearchMode,
  topK: number,
  userRole: string,
): Promise<SearchOutput> {
  const adapter = mode === 'standard'
    ? new StandardKnowledgeSearchAdapter()
    : new FastKnowledgeSearchAdapter();

  // Degradation 1: pgvector unavailable -> adapter checks env.PGVECTOR_ENABLED internally
  // Degradation 4: LLM unavailable -> adapter handles internally;
  //   caller checks if sources are empty and returns "生成服务暂不可用" message
  return adapter.search({ query, mode, topK, returnTrace: true, userRole: userRole as SearchInput['userRole'] });
}

export const knowledgeSearchAdapter = new FastKnowledgeSearchAdapter();
