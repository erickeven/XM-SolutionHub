import { describe, it, expect, beforeAll } from 'vitest';

describe.skipIf(!process.env.DATABASE_URL)('Auth API', () => {
  let request: ReturnType<typeof import('supertest')>;

  beforeAll(async () => {
    // Ensure required env vars exist for config module
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

  // Extract a cookie name=value pair from Set-Cookie header
  function extractCookie(setCookie: string | string[] | undefined, name: string): string {
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    for (const c of cookies) {
      const match = c.match(new RegExp(`^${name}=([^;]+)`));
      if (match) return `${name}=${match[1]}`;
    }
    return '';
  }

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return accessToken', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const res = await request.post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'Test1234',
        privacyAccepted: true,
      });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.user.email).toBe(uniqueEmail);
      expect(res.body.data.accessToken).toBeTruthy();
    });

    it('should reject duplicate email', async () => {
      const uniqueEmail = `dup-${Date.now()}@example.com`;
      await request.post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'Test1234',
        privacyAccepted: true,
      });

      const res = await request.post('/api/v1/auth/register').send({
        email: uniqueEmail,
        password: 'Test1234',
        privacyAccepted: true,
      });

      expect(res.body.code).toBe(2002);
    });

    it('should reject invalid password', async () => {
      const res = await request.post('/api/v1/auth/register').send({
        email: `weak-${Date.now()}@example.com`,
        password: 'weak',
        privacyAccepted: true,
      });

      expect(res.body.code).toBe(1001);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login and set refresh cookie', async () => {
      const email = `login-${Date.now()}@example.com`;
      await request.post('/api/v1/auth/register').send({
        email,
        password: 'Test1234',
        privacyAccepted: true,
      });

      const res = await request.post('/api/v1/auth/login').send({
        email,
        password: 'Test1234',
      });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.headers['set-cookie']).toBeTruthy();
    });

    it('should lock after 5 failed attempts', async () => {
      const email = `lock-${Date.now()}@example.com`;
      await request.post('/api/v1/auth/register').send({
        email,
        password: 'Test1234',
        privacyAccepted: true,
      });

      for (let i = 0; i < 5; i++) {
        const res = await request.post('/api/v1/auth/login').send({
          email,
          password: 'WrongPass1',
        });
        expect(res.body.code).toBe(2001);
      }

      const res = await request.post('/api/v1/auth/login').send({
        email,
        password: 'WrongPass1',
      });

      expect(res.body.code).toBe(2003);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 without auth', async () => {
      const res = await request.get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/password-reset', () => {
    it('should return reset link in dev mode', async () => {
      const email = `reset-${Date.now()}@example.com`;
      await request.post('/api/v1/auth/register').send({
        email,
        password: 'Test1234',
        privacyAccepted: true,
      });

      const res = await request.post('/api/v1/auth/password-reset').send({
        email,
      });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.resetLink).toContain('token=');
    });
  });

  // ── T7: CSRF protection tests ──────────────────────────

  describe('CSRF protection on refresh', () => {
    it('should return 403 on refresh without CSRF header', async () => {
      const email = `csrf-nohdr-${Date.now()}@example.com`;
      await request.post('/api/v1/auth/register').send({
        email,
        password: 'Test1234',
        privacyAccepted: true,
      });
      const loginRes = await request.post('/api/v1/auth/login').send({
        email,
        password: 'Test1234',
      });
      const refreshCookie = extractCookie(loginRes.headers['set-cookie'], 'refreshToken');

      const res = await request
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe(2005);
    });

    it('should return 403 on refresh with mismatched CSRF token', async () => {
      const email = `csrf-mismatch-${Date.now()}@example.com`;
      await request.post('/api/v1/auth/register').send({
        email,
        password: 'Test1234',
        privacyAccepted: true,
      });
      const loginRes = await request.post('/api/v1/auth/login').send({
        email,
        password: 'Test1234',
      });
      const refreshCookie = extractCookie(loginRes.headers['set-cookie'], 'refreshToken');

      const res = await request
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${refreshCookie}; csrf-token=tokenA`)
        .set('x-csrf-token', 'tokenB');

      expect(res.status).toBe(403);
      expect(res.body.code).toBe(2005);
    });
  });

  // ── T7: Lockout with Retry-After header ────────────────

  describe('Login lockout with Retry-After', () => {
    it('should return 429 with Retry-After header on 6th failed attempt', async () => {
      const email = `retry-${Date.now()}@example.com`;
      await request.post('/api/v1/auth/register').send({
        email,
        password: 'Test1234',
        privacyAccepted: true,
      });

      for (let i = 0; i < 5; i++) {
        await request.post('/api/v1/auth/login').send({
          email,
          password: 'WrongPass1',
        });
      }

      const res = await request.post('/api/v1/auth/login').send({
        email,
        password: 'WrongPass1',
      });

      expect(res.status).toBe(429);
      expect(res.body.code).toBe(2003);
      expect(res.headers['retry-after']).toBe('900');
    });
  });

  // ── T7: Refresh token reuse detection ─────────────────

  describe('Refresh token reuse detection', () => {
    it('should revoke entire family when old (revoked) refresh token is reused', async () => {
      const email = `reuse-${Date.now()}@example.com`;
      await request.post('/api/v1/auth/register').send({
        email,
        password: 'Test1234',
        privacyAccepted: true,
      });
      const loginRes = await request.post('/api/v1/auth/login').send({
        email,
        password: 'Test1234',
      });
      const refreshCookie = extractCookie(loginRes.headers['set-cookie'], 'refreshToken');
      const csrfToken = 'test-csrf-token';

      // First refresh: R1 → R2 (R1 is revoked)
      const refresh1Res = await request
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${refreshCookie}; csrf-token=${csrfToken}`)
        .set('x-csrf-token', csrfToken);

      expect(refresh1Res.status).toBe(200);
      expect(refresh1Res.body.code).toBe(0);
      const newRefreshCookie = extractCookie(refresh1Res.headers['set-cookie'], 'refreshToken');

      // Reuse old R1 → should detect reuse, revoke family, return 401
      const reuseRes = await request
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${refreshCookie}; csrf-token=${csrfToken}`)
        .set('x-csrf-token', csrfToken);

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.code).toBe(2006);

      // R2 should also be revoked (entire family revoked)
      const reuse2Res = await request
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${newRefreshCookie}; csrf-token=${csrfToken}`)
        .set('x-csrf-token', csrfToken);

      expect(reuse2Res.status).toBe(401);
      expect(reuse2Res.body.code).toBe(2006);
    });
  });
});