import { describe, it, expect, beforeAll } from 'vitest';

describe.skipIf(!process.env.DATABASE_URL)('Products Admin API', () => {
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

  function validProductPayload(modelSuffix = '') {
    return {
      model: `TEST-PROD-${Date.now()}${modelSuffix}`,
      series: 'TEST-SERIES',
      params: {
        inputVoltageMin: 90,
        inputVoltageMax: 264,
        outputVoltage: 5,
        outputCurrent: 2,
        applicationType: 'adapter',
      },
      advantages: ['高效率', '低待机功耗'],
    };
  }

  describe('GET /api/v1/admin/products', () => {
    it('should return 401 without authentication', async () => {
      const res = await request.get('/api/v1/admin/products');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin (USER role)', async () => {
      const token = await registerAndLogin(`user-prod-${Date.now()}@example.com`);
      const res = await request
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(2003);
    });

    it('should return 200 with paginated data for ADMIN', async () => {
      const token = await loginAdmin();
      const res = await request
        .get('/api/v1/admin/products?page=1&limit=10')
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

  describe('POST /api/v1/admin/products', () => {
    it('should create a product and return 201 for ADMIN', async () => {
      const token = await loginAdmin();
      const payload = validProductPayload('-create');
      const res = await request
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.model).toBe(payload.model);
      expect(res.body.data.series).toBe(payload.series);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.advantages).toEqual(payload.advantages);
    });

    it('should return 400 code 3002 for duplicate model', async () => {
      const token = await loginAdmin();
      const payload = validProductPayload('-dup');
      // First create
      await request
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
      // Second create with same model
      const res = await request
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.body.code).toBe(3002);
    });
  });

  describe('PATCH /api/v1/admin/products/:id', () => {
    it('should update a product for ADMIN', async () => {
      const token = await loginAdmin();
      const createRes = await request
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${token}`)
        .send(validProductPayload('-update'));
      const productId = createRes.body.data.id as string;

      const res = await request
        .patch(`/api/v1/admin/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ series: 'UPDATED-SERIES', status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.series).toBe('UPDATED-SERIES');
      expect(res.body.data.status).toBe('ACTIVE');
    });
  });

  describe('DELETE /api/v1/admin/products/:id (soft delete)', () => {
    it('should set status to INACTIVE', async () => {
      const token = await loginAdmin();
      const createRes = await request
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${token}`)
        .send(validProductPayload('-del'));
      const productId = createRes.body.data.id as string;

      const delRes = await request
        .delete(`/api/v1/admin/products/${productId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.code).toBe(0);
      expect(delRes.body.data.id).toBe(productId);

      // Verify status is INACTIVE
      const getRes = await request
        .get(`/api/v1/admin/products/${productId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.body.data.status).toBe('INACTIVE');
    });
  });
});