import { describe, it, expect, beforeAll } from 'vitest';

describe.skipIf(!process.env.DATABASE_URL)('Solutions Admin API', () => {
  let request: ReturnType<typeof import('supertest')>;

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
  });

  async function loginAdmin(): Promise<string> {
    const res = await request.post('/api/v1/auth/login').send({
      email: 'admin@xinmaowei.com',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123456',
    });
    return res.body.data.accessToken as string;
  }

  async function registerAndLogin(
    email: string,
    password = 'Test1234',
  ): Promise<string> {
    await request.post('/api/v1/auth/register').send({
      email,
      password,
      privacyAccepted: true,
    });
    const res = await request.post('/api/v1/auth/login').send({ email, password });
    return res.body.data.accessToken as string;
  }

  function validSolutionPayload(suffix = '') {
    return {
      name: `Test Solution ${Date.now()}${suffix}`,
      description: 'A test solution for automated testing',
    };
  }

  describe('GET /api/v1/admin/solutions', () => {
    it('should return 401 without authentication', async () => {
      const res = await request.get('/api/v1/admin/solutions');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin (USER role)', async () => {
      const token = await registerAndLogin(`user-sol-${Date.now()}@example.com`);
      const res = await request
        .get('/api/v1/admin/solutions')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(2003);
    });

    it('should return 200 with paginated data for ADMIN', async () => {
      const token = await loginAdmin();
      const res = await request
        .get('/api/v1/admin/solutions?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page', 1);
      expect(res.body.data).toHaveProperty('limit', 10);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  describe('POST /api/v1/admin/solutions', () => {
    it('should create a solution and return 201 for ADMIN', async () => {
      const token = await loginAdmin();
      const payload = validSolutionPayload('-create');
      const res = await request
        .post('/api/v1/admin/solutions')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.name).toBe(payload.name);
      expect(res.body.data.description).toBe(payload.description);
      expect(res.body.data.status).toBe('DRAFT');
    });
  });

  describe('PATCH /api/v1/admin/solutions/:id', () => {
    it('should update a solution for ADMIN', async () => {
      const token = await loginAdmin();
      const createRes = await request
        .post('/api/v1/admin/solutions')
        .set('Authorization', `Bearer ${token}`)
        .send(validSolutionPayload('-update'));
      const solutionId = createRes.body.data.id as string;

      const res = await request
        .patch(`/api/v1/admin/solutions/${solutionId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Solution Name', status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.name).toBe('Updated Solution Name');
      expect(res.body.data.status).toBe('ACTIVE');
    });
  });

  describe('DELETE /api/v1/admin/solutions/:id (soft delete)', () => {
    it('should set status to INACTIVE', async () => {
      const token = await loginAdmin();
      const createRes = await request
        .post('/api/v1/admin/solutions')
        .set('Authorization', `Bearer ${token}`)
        .send(validSolutionPayload('-del'));
      const solutionId = createRes.body.data.id as string;

      const delRes = await request
        .delete(`/api/v1/admin/solutions/${solutionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.code).toBe(0);
      expect(delRes.body.data.id).toBe(solutionId);

      const getRes = await request
        .get(`/api/v1/admin/solutions/${solutionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.body.data.status).toBe('INACTIVE');
    });
  });

  describe('GET /api/v1/solutions/:id (public)', () => {
    it('should return 404 for non-existent solution', async () => {
      const res = await request.get('/api/v1/solutions/nonexistent-id');
      expect(res.status).toBe(404);
    });

    it('should return ACTIVE solution without auth', async () => {
      const token = await loginAdmin();
      const createRes = await request
        .post('/api/v1/admin/solutions')
        .set('Authorization', `Bearer ${token}`)
        .send(validSolutionPayload('-public'));
      const solutionId = createRes.body.data.id as string;

      await request
        .patch(`/api/v1/admin/solutions/${solutionId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'ACTIVE' });

      const res = await request.get(`/api/v1/solutions/${solutionId}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(solutionId);
      expect(res.body.data.name).toBeDefined();
      expect(res.body.data.description).toBeDefined();
    });

    it('should return 404 for DRAFT solution (not ACTIVE)', async () => {
      const token = await loginAdmin();
      const createRes = await request
        .post('/api/v1/admin/solutions')
        .set('Authorization', `Bearer ${token}`)
        .send(validSolutionPayload('-draft'));
      const solutionId = createRes.body.data.id as string;

      const res = await request.get(`/api/v1/solutions/${solutionId}`);
      expect(res.status).toBe(404);
    });
  });
});