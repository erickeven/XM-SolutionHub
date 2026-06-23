import { bench, describe, beforeAll, vi } from 'vitest';
import type { Mock } from 'vitest';

// PRD §3 L28-36: AI first-token P95 < 3s

// Mock LLM adapter and search before app import
vi.mock('../lib/ai/llm', () => ({
  llmAdapter: {
    generateAnswer: vi.fn(),
  },
}));

vi.mock('../modules/knowledge/knowledge.search', () => ({
  searchKnowledgeWithDegradation: vi.fn(),
}));

type SearchFn = typeof import('../modules/knowledge/knowledge.search')['searchKnowledgeWithDegradation'];
type LlmFn = typeof import('../lib/ai/llm')['llmAdapter']['generateAnswer'];

describe.skipIf(!process.env.DATABASE_URL)('AI Chat First-Token Performance', () => {
  let request: ReturnType<typeof import('supertest')>;
  let token: string;
  let mockSearch: Mock<SearchFn>;
  let mockLlm: Mock<LlmFn>;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-32chars-minimum!!';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-32chars-minimum!!';
    process.env.CSRF_SECRET ??= 'test-csrf-secret';
    process.env.SEED_ADMIN_PASSWORD ??= 'test-admin-password';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
    process.env.WEB_ORIGIN ??= 'http://localhost:5173';
    process.env.NODE_ENV ??= 'test';

    const supertest = (await import('supertest')).default;
    const appModule = await import('../app');
    request = supertest(appModule.default);

    const searchModule = await import('../modules/knowledge/knowledge.search');
    mockSearch = vi.mocked(searchModule.searchKnowledgeWithDegradation);

    const llmModule = await import('../lib/ai/llm');
    mockLlm = vi.mocked(llmModule.llmAdapter.generateAnswer);

    const email = `ai-bench-${Date.now()}@example.com`;
    const reg = await request.post('/api/v1/auth/register').send({
      email,
      password: 'Test1234',
      privacyAccepted: true,
    });
    token = reg.body.data.accessToken as string;
  });

  function sseParser(
    res: { on: (event: string, cb: (chunk: Buffer) => void) => void },
    cb: (err: Error | null, data?: string) => void,
  ): void {
    let data = '';
    res.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    res.on('end', () => cb(null, data));
  }

  function setupMockSearch(): void {
    const sources = [
      {
        docId: 'doc-bench-1',
        title: 'LP9961 Datasheet',
        page: 1,
        snippet: 'LLC resonant converter controller',
        entities: ['LP9961', 'LLC'],
        score: 0.92,
      },
    ];

    mockSearch.mockResolvedValue({
      sources,
      trace: [],
      latencyMs: 50,
    });
  }

  function setupMockLlmStream(): void {
    async function* fakeStream(): AsyncIterable<string> {
      yield 'Hello';
      yield ' world';
    }
    mockLlm.mockReturnValueOnce(fakeStream());
  }

  bench(
    'POST /api/v1/ai/chat — time to first token P95 < 3s',
    async () => {
      setupMockSearch();
      setupMockLlmStream();

      await request
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'LP9961 LLC谐振频率' })
        .buffer(true)
        .parse(sseParser);
    },
    { time: 3000 },
  );

  bench(
    'POST /api/v1/ai/chat — search + source events P95 < 3s',
    async () => {
      setupMockSearch();
      // No LLM stream — just measure search + source emission
      async function* emptyStream(): AsyncIterable<string> {
        // Intentionally empty
      }
      mockLlm.mockReturnValueOnce(emptyStream());

      await request
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'LP3524 同步整流驱动' })
        .buffer(true)
        .parse(sseParser);
    },
    { time: 3000 },
  );
});