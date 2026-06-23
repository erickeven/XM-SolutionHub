import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { Mock } from 'vitest';

// Mock LLM adapter and search before app import
vi.mock('../../lib/ai/llm', () => ({
  llmAdapter: {
    generateAnswer: vi.fn(),
  },
}));

vi.mock('../knowledge/knowledge.search', () => ({
  searchKnowledgeWithDegradation: vi.fn(),
}));

type SearchFn = typeof import('../knowledge/knowledge.search')['searchKnowledgeWithDegradation'];
type LlmFn = typeof import('../../lib/ai/llm')['llmAdapter']['generateAnswer'];

describe.skipIf(!process.env.DATABASE_URL)('AI Chat API', () => {
  let request: ReturnType<typeof import('supertest')>;
  let token: string;
  let otherToken: string;
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
    const appModule = await import('../../app');
    request = supertest(appModule.default);

    const searchModule = await import('../knowledge/knowledge.search');
    mockSearch = vi.mocked(searchModule.searchKnowledgeWithDegradation);

    const llmModule = await import('../../lib/ai/llm');
    mockLlm = vi.mocked(llmModule.llmAdapter.generateAnswer);

    const email1 = `ai-test-${Date.now()}@example.com`;
    const email2 = `ai-other-${Date.now()}@example.com`;

    const reg1 = await request.post('/api/v1/auth/register').send({
      email: email1,
      password: 'Test1234',
      privacyAccepted: true,
    });
    token = reg1.body.data.accessToken;

    const reg2 = await request.post('/api/v1/auth/register').send({
      email: email2,
      password: 'Test1234',
      privacyAccepted: true,
    });
    otherToken = reg2.body.data.accessToken;
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

  describe('POST /api/v1/ai/chat — SSE', () => {
    it('should send meta -> source -> delta -> done events in order', async () => {
      const sources = [
        {
          docId: 'doc-1',
          title: 'Test Doc',
          page: 1,
          snippet: 'Test snippet',
          entities: [],
          score: 0.9,
        },
      ];

      mockSearch.mockResolvedValueOnce({
        sources,
        trace: [],
        latencyMs: 50,
      });

      async function* fakeStream(): AsyncIterable<string> {
        yield 'Hello';
        yield ' world';
      }
      mockLlm.mockReturnValueOnce(fakeStream());

      const res = await request
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'test query' })
        .buffer(true)
        .parse(sseParser);

      expect(res.status).toBe(200);
      const text = res.body as string;

      const metaIdx = text.indexOf('event: meta');
      const sourceIdx = text.indexOf('event: source');
      const deltaIdx = text.indexOf('event: delta');
      const doneIdx = text.indexOf('event: done');

      expect(metaIdx).toBeGreaterThanOrEqual(0);
      expect(sourceIdx).toBeGreaterThan(metaIdx);
      expect(deltaIdx).toBeGreaterThan(sourceIdx);
      expect(doneIdx).toBeGreaterThan(deltaIdx);

      const metaLine = text.slice(metaIdx, text.indexOf('\n\n', metaIdx));
      expect(metaLine).toContain('messageId');
      expect(metaLine).toContain('sessionId');
    });

    it('should reject with NO_SOURCES when search returns empty', async () => {
      mockSearch.mockResolvedValueOnce({
        sources: [],
        trace: [],
        latencyMs: 10,
      });

      const res = await request
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'obscure query' })
        .buffer(true)
        .parse(sseParser);

      expect(res.status).toBe(200);
      const text = res.body as string;

      expect(text).toContain('event: meta');
      expect(text).toContain('event: error');
      expect(text).toContain('NO_SOURCES');
      expect(text).not.toContain('event: delta');
      expect(text).not.toContain('event: done');
    });

    it('should require authentication', async () => {
      const res = await request.post('/api/v1/ai/chat').send({ query: 'test' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/ai/sessions', () => {
    it('should list user sessions', async () => {
      const res = await request
        .get('/api/v1/ai/sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('pageSize');
    });

    it('should require authentication', async () => {
      const res = await request.get('/api/v1/ai/sessions');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/ai/sessions/:id/messages — ownership', () => {
    it('should return 403 when accessing other user session', async () => {
      mockSearch.mockResolvedValueOnce({
        sources: [],
        trace: [],
        latencyMs: 5,
      });

      const chatRes = await request
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'my session' })
        .buffer(true)
        .parse(sseParser);

      const text = chatRes.body as string;
      const sessionIdMatch = text.match(/"sessionId":"([^"]+)"/);
      const sessionId = sessionIdMatch?.[1];
      expect(sessionId).toBeTruthy();

      const res = await request
        .get(`/api/v1/ai/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it('should return messages for own session', async () => {
      mockSearch.mockResolvedValueOnce({
        sources: [],
        trace: [],
        latencyMs: 5,
      });

      const chatRes = await request
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'my session 2' })
        .buffer(true)
        .parse(sseParser);

      const text = chatRes.body as string;
      const sessionIdMatch = text.match(/"sessionId":"([^"]+)"/);
      const sessionId = sessionIdMatch?.[1];

      const res = await request
        .get(`/api/v1/ai/sessions/${sessionId}/messages`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.session.id).toBe(sessionId);
      expect(res.body.data.messages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/v1/ai/messages/:id/feedback', () => {
    it('should update feedback for own message', async () => {
      mockSearch.mockResolvedValueOnce({
        sources: [],
        trace: [],
        latencyMs: 5,
      });

      const chatRes = await request
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'feedback test' })
        .buffer(true)
        .parse(sseParser);

      const text = chatRes.body as string;
      const messageIdMatch = text.match(/"messageId":"([^"]+)"/);
      const messageId = messageIdMatch?.[1];

      const res = await request
        .post(`/api/v1/ai/messages/${messageId}/feedback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ helpful: true, comment: 'Great answer' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.feedback.helpful).toBe(true);
      expect(res.body.data.feedback.comment).toBe('Great answer');
    });

    it('should return 403 for other user message', async () => {
      mockSearch.mockResolvedValueOnce({
        sources: [],
        trace: [],
        latencyMs: 5,
      });

      const chatRes = await request
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'ownership test' })
        .buffer(true)
        .parse(sseParser);

      const text = chatRes.body as string;
      const messageIdMatch = text.match(/"messageId":"([^"]+)"/);
      const messageId = messageIdMatch?.[1];

      const res = await request
        .post(`/api/v1/ai/messages/${messageId}/feedback`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ helpful: false });

      expect(res.status).toBe(403);
    });
  });
});