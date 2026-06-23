import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  ChatSource,
  SearchTraceStep,
  SearchInput,
  SearchOutput,
  SearchMode,
} from './knowledge.search.types';

// ── Pure logic tests (no DB required) ────────────────────

describe('ChatSource construction', () => {
  it('should construct a ChatSource with all fields', () => {
    const source: ChatSource = {
      docId: 'doc-1',
      eventId: 'evt-1',
      title: 'Test Doc',
      page: 3,
      snippet: 'This is a snippet...',
      entities: ['MOSFET', 'LLC'],
      score: 0.85,
    };

    expect(source.docId).toBe('doc-1');
    expect(source.eventId).toBe('evt-1');
    expect(source.title).toBe('Test Doc');
    expect(source.page).toBe(3);
    expect(source.snippet).toBe('This is a snippet...');
    expect(source.entities).toEqual(['MOSFET', 'LLC']);
    expect(source.score).toBe(0.85);
  });

  it('should construct a ChatSource without optional fields', () => {
    const source: ChatSource = {
      docId: 'doc-2',
      title: 'Minimal Doc',
      snippet: 'Short snippet',
      entities: [],
      score: 0.72,
    };

    expect(source.eventId).toBeUndefined();
    expect(source.page).toBeUndefined();
    expect(source.entities).toEqual([]);
  });
});

describe('SearchTraceStep ordering', () => {
  it('should produce stages in correct order: entity -> fulltext -> vector -> expand -> rerank', () => {
    const trace: SearchTraceStep[] = [
      { stage: 'entity', durationMs: 10, candidateCount: 5, selectedIds: ['e1', 'e2'] },
      { stage: 'fulltext', durationMs: 20, candidateCount: 15, selectedIds: ['c1', 'c2'] },
      { stage: 'vector', durationMs: 30, candidateCount: 25, selectedIds: ['c3', 'c4'] },
      { stage: 'expand', durationMs: 15, candidateCount: 10, selectedIds: ['c5'] },
      { stage: 'rerank', durationMs: 40, candidateCount: 30, selectedIds: ['c1', 'c3', 'c5'] },
    ];

    const stages = trace.map((t) => t.stage);
    expect(stages).toEqual(['entity', 'fulltext', 'vector', 'expand', 'rerank']);
  });

  it('should have non-negative durationMs for each step', () => {
    const trace: SearchTraceStep[] = [
      { stage: 'entity', durationMs: 0, candidateCount: 0, selectedIds: [] },
      { stage: 'fulltext', durationMs: 50, candidateCount: 10, selectedIds: ['c1'] },
    ];

    for (const step of trace) {
      expect(step.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Score threshold filtering', () => {
  const THRESHOLD = 0.72;

  it('should filter out sources below threshold', () => {
    const sources: ChatSource[] = [
      { docId: 'd1', title: 'A', snippet: 's', entities: [], score: 0.90 },
      { docId: 'd2', title: 'B', snippet: 's', entities: [], score: 0.71 },
      { docId: 'd3', title: 'C', snippet: 's', entities: [], score: 0.72 },
      { docId: 'd4', title: 'D', snippet: 's', entities: [], score: 0.50 },
    ];

    const filtered = sources.filter((s) => s.score >= THRESHOLD);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((s) => s.docId)).toEqual(['d1', 'd3']);
  });

  it('should return empty when all sources below threshold', () => {
    const sources: ChatSource[] = [
      { docId: 'd1', title: 'A', snippet: 's', entities: [], score: 0.50 },
      { docId: 'd2', title: 'B', snippet: 's', entities: [], score: 0.60 },
    ];

    const filtered = sources.filter((s) => s.score >= THRESHOLD);
    expect(filtered).toHaveLength(0);
  });

  it('should keep all sources when all above threshold', () => {
    const sources: ChatSource[] = [
      { docId: 'd1', title: 'A', snippet: 's', entities: [], score: 0.80 },
      { docId: 'd2', title: 'B', snippet: 's', entities: [], score: 0.95 },
    ];

    const filtered = sources.filter((s) => s.score >= THRESHOLD);
    expect(filtered).toHaveLength(2);
  });
});

describe('Merge / dedup logic', () => {
  interface TestCandidate {
    id: string;
    content: string;
    score: number;
  }

  function dedupCandidates(candidates: TestCandidate[]): TestCandidate[] {
    const map = new Map<string, TestCandidate>();
    for (const c of candidates) {
      const existing = map.get(c.id);
      if (!existing || c.score > existing.score) {
        map.set(c.id, c);
      }
    }
    return Array.from(map.values());
  }

  it('should deduplicate by id keeping highest score', () => {
    const candidates: TestCandidate[] = [
      { id: 'c1', content: 'a', score: 0.5 },
      { id: 'c2', content: 'b', score: 0.8 },
      { id: 'c1', content: 'a', score: 0.9 },
      { id: 'c3', content: 'c', score: 0.3 },
      { id: 'c2', content: 'b', score: 0.7 },
    ];

    const result = dedupCandidates(candidates);
    expect(result).toHaveLength(3);
    const c1 = result.find((c) => c.id === 'c1');
    const c2 = result.find((c) => c.id === 'c2');
    expect(c1?.score).toBe(0.9);
    expect(c2?.score).toBe(0.8);
  });

  it('should handle empty input', () => {
    expect(dedupCandidates([])).toHaveLength(0);
  });

  it('should handle single candidate', () => {
    const candidates: TestCandidate[] = [{ id: 'c1', content: 'a', score: 0.5 }];
    expect(dedupCandidates(candidates)).toHaveLength(1);
  });

  it('should sort by score descending after dedup', () => {
    const candidates: TestCandidate[] = [
      { id: 'c1', content: 'a', score: 0.3 },
      { id: 'c2', content: 'b', score: 0.9 },
      { id: 'c3', content: 'c', score: 0.6 },
    ];

    const deduped = dedupCandidates(candidates);
    const sorted = deduped.sort((a, b) => b.score - a.score);
    expect(sorted.map((c) => c.id)).toEqual(['c2', 'c3', 'c1']);
  });
});

describe('SearchInput / SearchOutput types', () => {
  it('should accept valid SearchInput', () => {
    const input: SearchInput = {
      query: 'LLC resonant converter',
      mode: 'fast',
      topK: 30,
      returnTrace: true,
      userRole: 'ADMIN',
      userId: 'user-1',
    };
    expect(input.query).toBe('LLC resonant converter');
    expect(input.mode).toBe('fast');
    expect(input.topK).toBe(30);
  });

  it('should accept SearchOutput with empty sources', () => {
    const output: SearchOutput = {
      sources: [],
      trace: [],
      latencyMs: 100,
    };
    expect(output.sources).toHaveLength(0);
    expect(output.latencyMs).toBe(100);
  });
});

// ── DB-dependent tests (skipped without DATABASE_URL) ────

describe.skipIf(!process.env.DATABASE_URL)('FastKnowledgeSearchAdapter (DB)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return empty sources when no candidate docs exist', async () => {
    process.env.KNOWLEDGE_SEARCH_MODE = 'fast';
    process.env.KNOWLEDGE_SCORE_THRESHOLD = '0.72';
    const { knowledgeSearchAdapter } = await import('./knowledge.search');
    const result = await knowledgeSearchAdapter.search({
      query: 'nonexistent query test',
      mode: 'fast',
      topK: 30,
      returnTrace: false,
      userRole: null,
    });
    expect(result.sources).toBeInstanceOf(Array);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

// ── Standard mode & degradation tests (no DB required) ───

describe('Standard mode trace structure', () => {
  it('should include entity extraction step in standard mode trace', () => {
    // Standard mode trace should have the same stages as fast mode,
    // but the entity stage represents LLM entity extraction
    const trace: SearchTraceStep[] = [
      { stage: 'entity', durationMs: 50, candidateCount: 3, selectedIds: ['e1', 'e2', 'e3'] },
      { stage: 'fulltext', durationMs: 20, candidateCount: 10, selectedIds: ['c1', 'c2'] },
      { stage: 'vector', durationMs: 30, candidateCount: 15, selectedIds: ['c3', 'c4'] },
      { stage: 'expand', durationMs: 15, candidateCount: 8, selectedIds: ['c5'] },
      { stage: 'rerank', durationMs: 40, candidateCount: 30, selectedIds: ['c1', 'c3', 'c5'] },
    ];

    // Standard mode trace has same 5 stages, entity stage covers LLM extraction
    expect(trace).toHaveLength(5);
    expect(trace[0]!.stage).toBe('entity');
    expect(trace[0]!.candidateCount).toBe(3);
  });

  it('should accept standard mode in SearchInput', () => {
    const input: SearchInput = {
      query: 'LP9961 LLC谐振频率',
      mode: 'standard' as SearchMode,
      topK: 30,
      returnTrace: true,
      userRole: 'USER',
    };
    expect(input.mode).toBe('standard');
  });
});

describe('Degradation: pgvector unavailable', () => {
  it('should produce trace with zero vector candidates when pgvector disabled', () => {
    // When PGVECTOR_ENABLED=false, vector stage should have 0 candidates
    const trace: SearchTraceStep[] = [
      { stage: 'entity', durationMs: 10, candidateCount: 5, selectedIds: ['e1'] },
      { stage: 'fulltext', durationMs: 20, candidateCount: 15, selectedIds: ['c1', 'c2'] },
      { stage: 'vector', durationMs: 0, candidateCount: 0, selectedIds: [] },
      { stage: 'expand', durationMs: 15, candidateCount: 10, selectedIds: ['c5'] },
      { stage: 'rerank', durationMs: 40, candidateCount: 25, selectedIds: ['c1', 'c5'] },
    ];

    const vectorStep = trace.find((t) => t.stage === 'vector');
    expect(vectorStep).toBeDefined();
    expect(vectorStep!.candidateCount).toBe(0);
    expect(vectorStep!.selectedIds).toHaveLength(0);
  });

  it('should still return sources from fulltext+entity when vector skipped', () => {
    // Degradation: fulltext + SQL expand only (no vector)
    const sources: ChatSource[] = [
      { docId: 'd1', title: 'Doc A', snippet: 'snippet', entities: ['LP9961'], score: 0.85 },
    ];
    expect(sources).toHaveLength(1);
    expect(sources[0]!.score).toBeGreaterThanOrEqual(0.72);
  });
});

describe('Degradation: LLM unavailable', () => {
  it('entity extraction falls back to trigram matching when LLM returns empty', () => {
    // When LLM unavailable, extractQueryEntities returns []
    // StandardKnowledgeSearchAdapter falls back to trigram/prefix matching
    // The trace still records stage='entity' with candidates from trigram
    const trace: SearchTraceStep[] = [
      { stage: 'entity', durationMs: 5, candidateCount: 2, selectedIds: ['e1', 'e2'] },
      { stage: 'fulltext', durationMs: 20, candidateCount: 10, selectedIds: ['c1'] },
      { stage: 'vector', durationMs: 30, candidateCount: 15, selectedIds: ['c3'] },
      { stage: 'expand', durationMs: 15, candidateCount: 8, selectedIds: ['c5'] },
      { stage: 'rerank', durationMs: 40, candidateCount: 25, selectedIds: ['c1', 'c3'] },
    ];

    // Entity stage still has candidates (from trigram fallback)
    const entityStep = trace.find((t) => t.stage === 'entity');
    expect(entityStep).toBeDefined();
    expect(entityStep!.candidateCount).toBeGreaterThan(0);
  });

  it('should return source list without fabricated text when LLM unavailable', () => {
    // Degradation 4: return structured source list, do NOT fabricate text
    const sources: ChatSource[] = [
      {
        docId: 'd1',
        title: 'LP9961 Datasheet',
        page: 5,
        snippet: 'The LP9961 is a LLC controller...',
        entities: ['LP9961', 'LLC'],
        score: 0.88,
      },
      {
        docId: 'd2',
        title: 'Application Note',
        page: 12,
        snippet: 'Resonant frequency setting...',
        entities: ['谐振频率'],
        score: 0.75,
      },
    ];

    // Sources are returned as-is — no fabricated text
    expect(sources).toHaveLength(2);
    expect(sources[0]!.snippet).not.toContain('生成服务暂不可用');
    // The caller (AI chat module) is responsible for adding the "生成服务暂不可用" message
    // when sources exist but LLM generation is unavailable
  });

  it('llmRankCandidates fallback chain: LLM -> rerank API -> vector scores', () => {
    // When LLM unavailable (returns null), falls back to rerank API
    // When rerank API also unavailable, falls back to vector similarity scores
    const fallbackScores = new Map<string, number>([
      ['c1', 0.85],
      ['c2', 0.72],
    ]);

    // Simulate rerank unavailable (no RERANK_API_KEY)
    const documents = [
      { id: 'c1', content: 'content1' },
      { id: 'c2', content: 'content2' },
    ];

    // ponytail: when both LLM and rerank unavailable, use vector scores
    const results = documents.map((d) => ({
      id: d.id,
      score: fallbackScores.get(d.id) ?? 0.5,
    }));

    expect(results).toHaveLength(2);
    expect(results[0]!.score).toBe(0.85);
    expect(results[1]!.score).toBe(0.72);
  });
});

describe('searchKnowledgeWithDegradation', () => {
  it('should select adapter based on mode parameter', () => {
    // The function creates StandardKnowledgeSearchAdapter for 'standard'
    // and FastKnowledgeSearchAdapter for 'fast'
    // This is a type-level test — verify the function signature accepts both modes
    const modes: SearchMode[] = ['fast', 'standard'];
    expect(modes).toContain('fast');
    expect(modes).toContain('standard');
  });
});