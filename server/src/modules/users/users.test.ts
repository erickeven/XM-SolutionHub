import { describe, it, expect, beforeAll } from 'vitest';

describe.skipIf(!process.env.DATABASE_URL)('Users Admin API', () => {
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

  function extractCookie(setCookie: string | string[] | undefined, name: string): string {
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    for (const cookie of cookies) {
      const match = cookie.match(new RegExp(`^${name}=([^;]+)`));
      if (match) return `${name}=${match[1]}`;
    }
    return '';
  }

  function uniqueEmail(): string {
    return `user-mgmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  }

  describe('POST /api/v1/admin/users', () => {
    it('should create a user and return 201 for ADMIN', async () => {
      const token = await loginAdmin();
      const email = uniqueEmail();
      const res = await request
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email, password: 'TestPass123', role: 'STAFF' });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.role).toBe('STAFF');
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('should return 403 for non-admin (USER role)', async () => {
      const token = await registerAndLogin(uniqueEmail());
      const res = await request
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: uniqueEmail(), password: 'TestPass123', role: 'USER' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe(2003);
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should return 200 with paginated data for ADMIN', async () => {
      const token = await loginAdmin();
      const res = await request
        .get('/api/v1/admin/users?page=1&pageSize=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page', 1);
      expect(res.body.data).toHaveProperty('pageSize', 10);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('should return 403 for non-admin', async () => {
      const token = await registerAndLogin(uniqueEmail());
      const res = await request
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/admin/users/:id — disable user', () => {
    it('should revoke all refresh tokens when status set to INACTIVE', async () => {
      const adminToken = await loginAdmin();

      // Create a test user
      const email = uniqueEmail();
      const createRes = await request
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, password: 'TestPass123', role: 'USER' });
      const userId = createRes.body.data.id as string;

      // Login as that user to create a refresh token
      const loginRes = await request
        .post('/api/v1/auth/login')
        .send({ email, password: 'TestPass123' });

      const refreshCookie = extractCookie(loginRes.headers['set-cookie'], 'refreshToken');
      const csrfCookie = extractCookie(loginRes.headers['set-cookie'], 'csrf-token');
      const csrfToken = csrfCookie.split('=')[1] ?? '';

      // Disable the user
      const disableRes = await request
        .patch(`/api/v1/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' });

      expect(disableRes.status).toBe(200);
      expect(disableRes.body.data.status).toBe('INACTIVE');

      // Attempt to refresh the token — should fail (revoked)
      if (refreshCookie && csrfCookie) {
        const refreshRes = await request
          .post('/api/v1/auth/refresh')
          .set('Cookie', `${refreshCookie}; ${csrfCookie}`)
          .set('x-csrf-token', csrfToken);

        expect(refreshRes.status).toBe(401);
      }
    });
  });

  describe('DELETE /api/v1/admin/users/:id', () => {
    it('should not allow admin to delete self', async () => {
      const token = await loginAdmin();

      // Get own user id via /auth/me
      const meRes = await request
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      const myId = meRes.body.data.id as string;

      const delRes = await request
        .delete(`/api/v1/admin/users/${myId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(400);
      expect(delRes.body.code).toBe(4003);
    });
  });
});
