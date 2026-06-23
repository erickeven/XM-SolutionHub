import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';

// Mock config to avoid env validation at import time
vi.mock('../config', () => ({
  env: {
    EMBEDDING_BASE_URL: 'http://localhost:3000',
    EMBEDDING_API_KEY: 'test-key',
    EMBEDDING_MODEL: 'test-model',
    EMBEDDING_DIMENSIONS: 1536,
    LLM_BASE_URL: 'http://localhost:3000',
    LLM_API_KEY: 'test-key',
    LLM_MODEL: 'test-model',
    INDEX_JOB_MAX_RETRIES: 3,
  },
}));

import { chunkText } from '../lib/text/chunker';
import { embed, embedBatch, toVectorString } from '../lib/ai/embedding';
import { extractEventAndEntities } from '../lib/ai/extract';

// ── Chunker tests (no DB needed) ─────────────────────────

describe('chunkText', () => {
  it('returns empty array for empty text', () => {
    const result = chunkText('', []);
    expect(result).toEqual([]);
  });

  it('returns single chunk for text shorter than maxSize', () => {
    const text = '这是一个短文本。';
    const pages = [{ text, pageNumber: 1 }];
    const result = chunkText(text, pages);
    expect(result).toHaveLength(1);
    expect(result[0]!.content).toBe(text);
    expect(result[0]!.page).toBe(1);
    expect(result[0]!.contentHash).toBe(
      createHash('sha256').update(text).digest('hex'),
    );
  });

  it('splits text into chunks within size bounds', () => {
    // Generate 2000 chars of Chinese text with sentence boundaries
    const sentence = '这是一个测试句子。';
    const text = sentence.repeat(100); // ~1000 chars
    const pages = [{ text, pageNumber: 1 }];
    const result = chunkText(text, pages, { minSize: 100, maxSize: 300, overlap: 50 });

    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.content.length).toBeLessThanOrEqual(300);
      expect(chunk.contentHash).toHaveLength(64); // sha256 hex
    }
  });

  it('tracks page numbers across multiple pages', () => {
    const page1Text = '第一页内容。'.repeat(50);
    const page2Text = '第二页内容。'.repeat(50);
    const text = `${page1Text}${page2Text}`;
    const pages = [
      { text: page1Text, pageNumber: 1 },
      { text: page2Text, pageNumber: 2 },
    ];
    const result = chunkText(text, pages, { minSize: 100, maxSize: 200, overlap: 50 });

    expect(result.length).toBeGreaterThan(1);
    const pageNumbers = result.map((c) => c.page);
    expect(pageNumbers).toContain(1);
    expect(pageNumbers).toContain(2);
  });

  it('generates correct contentHash for each chunk', () => {
    const text = '测试哈希值。'.repeat(50);
    const pages = [{ text, pageNumber: 1 }];
    const result = chunkText(text, pages, { minSize: 50, maxSize: 100, overlap: 20 });

    for (const chunk of result) {
      expect(chunk.contentHash).toBe(
        createHash('sha256').update(chunk.content).digest('hex'),
      );
    }
  });

  it('uses default parameters when no options provided', () => {
    const text = '默认参数测试。'.repeat(200);
    const pages = [{ text, pageNumber: 1 }];
    const result = chunkText(text, pages);

    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.content.length).toBeLessThanOrEqual(800);
    }
  });
});

// ── Embedding tests (mocked fetch) ──────────────────────

describe('embed', () => {
  const mockEmbedding = Array.from({ length: 1536 }, (_, i) => i * 0.001);

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ embedding: mockEmbedding }] }),
      text: async () => '',
    }));
  });

  it('returns embedding array from API', async () => {
    const result = await embed('test text');
    expect(result).toHaveLength(1536);
    expect(result[0]).toBe(0);
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ data: [] }),
      text: async () => 'Internal Server Error',
    }));

    await expect(embed('test')).rejects.toThrow('Embedding API error 500');
  });
});

describe('embedBatch', () => {
  it('returns embeddings for multiple texts', async () => {
    const mockEmbedding1 = Array.from({ length: 1536 }, (_, i) => i * 0.001);
    const mockEmbedding2 = Array.from({ length: 1536 }, (_, i) => i * 0.002);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { embedding: mockEmbedding1 },
          { embedding: mockEmbedding2 },
        ],
      }),
      text: async () => '',
    }));

    const result = await embedBatch(['text1', 'text2']);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(mockEmbedding1);
    expect(result[1]).toEqual(mockEmbedding2);
  });

  it('returns empty array for empty input', async () => {
    const result = await embedBatch([]);
    expect(result).toEqual([]);
  });
});

describe('toVectorString', () => {
  it('formats embedding as pgvector string', () => {
    const result = toVectorString([0.1, 0.2, 0.3]);
    expect(result).toBe('[0.1,0.2,0.3]');
  });
});

// ── Extraction tests (mocked fetch) ─────────────────────

describe('extractEventAndEntities', () => {
  it('returns event and entities from LLM response', async () => {
    const llmResponse = {
      event: { summary: '产品发布', eventType: '产品发布' },
      entities: [{ name: '芯片A', entityType: '产品', role: '主体' }],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(llmResponse) } }],
      }),
      text: async () => '',
    }));

    const result = await extractEventAndEntities('some chunk content');
    expect(result.event).toEqual(llmResponse.event);
    expect(result.entities).toEqual(llmResponse.entities);
  });

  it('returns null event and empty entities on LLM error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
      text: async () => 'Service Unavailable',
    }));

    const result = await extractEventAndEntities('some content');
    expect(result.event).toBeNull();
    expect(result.entities).toEqual([]);
  });

  it('handles JSON wrapped in markdown code blocks', async () => {
    const llmResponse = {
      event: { summary: '测试事件', eventType: '测试' },
      entities: [],
    };
    const wrappedContent = '```json\n' + JSON.stringify(llmResponse) + '\n```';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: wrappedContent } }],
      }),
      text: async () => '',
    }));

    const result = await extractEventAndEntities('content');
    expect(result.event).toEqual(llmResponse.event);
    expect(result.entities).toEqual([]);
  });
});

// ── DB-dependent tests (skipped without DATABASE_URL) ────

describe.skipIf(!process.env.DATABASE_URL)('Knowledge index worker (DB)', () => {
  it('should connect to database', async () => {
    const { default: prisma } = await import('../lib/prisma');
    await expect(prisma.$connect()).resolves.toBeUndefined();
    await prisma.$disconnect();
  });
});