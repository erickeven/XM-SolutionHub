import { describe, it, expect, beforeAll } from 'vitest';

describe.skipIf(!process.env.DATABASE_URL)('Materials Admin API', () => {
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

  async function createSolution(token: string): Promise<string> {
    const res = await request
      .post('/api/v1/admin/solutions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Material Test Solution ${Date.now()}`,
        description: 'Test solution for materials',
        status: 'ACTIVE',
      });
    return res.body.data.id as string;
  }

  // Minimal valid PDF buffer (starts with %PDF)
  const minimalPdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF',
  );

  describe('POST /api/v1/admin/materials (upload)', () => {
    it('should upload a PDF and return 201 with DRAFT status', async () => {
      const token = await loginAdmin();
      const solutionId = await createSolution(token);

      const res = await request
        .post('/api/v1/admin/materials')
        .set('Authorization', `Bearer ${token}`)
        .field('type', 'datasheet')
        .field('title', 'Test Datasheet PDF')
        .field('solutionId', solutionId)
        .attach('file', minimalPdf, 'test.pdf');

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.type).toBe('datasheet');
      expect(res.body.data.title).toBe('Test Datasheet PDF');
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.solutionId).toBe(solutionId);
    });

    it('should return 400 for .exe file (wrong extension)', async () => {
      const token = await loginAdmin();
      const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff');

      const res = await request
        .post('/api/v1/admin/materials')
        .set('Authorization', `Bearer ${token}`)
        .field('type', 'datasheet')
        .field('title', 'Bad File')
        .attach('file', exeBuffer, 'malware.exe');

      expect(res.status).toBe(400);
    });

    it('should return 400 when no file is uploaded', async () => {
      const token = await loginAdmin();

      const res = await request
        .post('/api/v1/admin/materials')
        .set('Authorization', `Bearer ${token}`)
        .field('type', 'datasheet')
        .field('title', 'No File');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/admin/materials', () => {
    it('should return 401 without auth', async () => {
      const res = await request.get('/api/v1/admin/materials');
      expect(res.status).toBe(401);
    });

    it('should return 403 for USER role', async () => {
      const token = await registerAndLogin(`user-mat-${Date.now()}@example.com`);
      const res = await request
        .get('/api/v1/admin/materials')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(2003);
    });

    it('should return 200 with paginated data for ADMIN', async () => {
      const token = await loginAdmin();
      const res = await request
        .get('/api/v1/admin/materials?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('total');
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  describe('GET /api/v1/solutions/:id/materials (public)', () => {
    it('should return materials with stripped fields for anonymous', async () => {
      const token = await loginAdmin();
      const solutionId = await createSolution(token);

      // Upload a material
      await request
        .post('/api/v1/admin/materials')
        .set('Authorization', `Bearer ${token}`)
        .field('type', 'datasheet')
        .field('title', 'Public Test Datasheet')
        .field('solutionId', solutionId)
        .attach('file', minimalPdf, 'public-test.pdf');

      // Set material to ACTIVE
      const listRes = await request
        .get(`/api/v1/admin/materials?solutionId=${solutionId}`)
        .set('Authorization', `Bearer ${token}`);
      const materialId = listRes.body.data.items[0].id as string;

      await request
        .patch(`/api/v1/admin/materials/${materialId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'ACTIVE' });

      // Anonymous request — no auth header
      const res = await request.get(`/api/v1/solutions/${solutionId}/materials`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);

      const item = res.body.data.items[0];
      // Anonymous: only id, title, type, previewPages
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('previewPages');
      // Must NOT have storageKey, pageCount, mimeType
      expect(item).not.toHaveProperty('originalStorageKey');
      expect(item).not.toHaveProperty('pageCount');
      expect(item).not.toHaveProperty('mimeType');
    });

    it('should return full fields (except storageKey) for authenticated user', async () => {
      const token = await loginAdmin();
      const solutionId = await createSolution(token);

      await request
        .post('/api/v1/admin/materials')
        .set('Authorization', `Bearer ${token}`)
        .field('type', 'datasheet')
        .field('title', 'Auth Test Datasheet')
        .field('solutionId', solutionId)
        .attach('file', minimalPdf, 'auth-test.pdf');

      const listRes = await request
        .get(`/api/v1/admin/materials?solutionId=${solutionId}`)
        .set('Authorization', `Bearer ${token}`);
      const materialId = listRes.body.data.items[0].id as string;

      await request
        .patch(`/api/v1/admin/materials/${materialId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'ACTIVE' });

      // Authenticated request
      const res = await request
        .get(`/api/v1/solutions/${solutionId}/materials`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const item = res.body.data.items[0];
      expect(item).toHaveProperty('mimeType');
      expect(item).toHaveProperty('pageCount');
      // Must NOT have storageKey
      expect(item).not.toHaveProperty('originalStorageKey');
    });

    it('should NOT return INACTIVE materials', async () => {
      const token = await loginAdmin();
      const solutionId = await createSolution(token);

      await request
        .post('/api/v1/admin/materials')
        .set('Authorization', `Bearer ${token}`)
        .field('type', 'datasheet')
        .field('title', 'Inactive Test')
        .field('solutionId', solutionId)
        .attach('file', minimalPdf, 'inactive-test.pdf');

      // Material is DRAFT by default, not ACTIVE — should not appear
      const res = await request.get(`/api/v1/solutions/${solutionId}/materials`);

      expect(res.status).toBe(200);
      const items = res.body.data.items as { title: string }[];
      const found = items.find((i) => i.title === 'Inactive Test');
      expect(found).toBeUndefined();
    });
  });
});