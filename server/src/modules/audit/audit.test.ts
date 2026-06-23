import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import * as auditService from './audit.service';

// Synchronous DB reachability check — skip API tests if PostgreSQL is not running
const dbReachable = (() => {
  try {
    const result = execSync(
      'powershell -NoProfile -Command "try { (New-Object System.Net.Sockets.TcpClient(\'localhost\', 5432)).Close(); \'1\' } catch { \'0\' }"',
      { timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] },
    ).toString().trim();
    return result === '1';
  } catch {
    return false;
  }
})();

interface AuditLogLike {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  payload: unknown;
  createdAt: Date;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

describe('auditService.sanitizePayload', () => {
  it('should remove sensitive keys from payload', () => {
    const payload = {
      userId: '123',
      password: 'secret123',
      action: 'LOGIN',
      token: 'abc',
      refreshToken: 'xyz',
      apiKey: 'key123',
      secret: 'topsecret',
      normalField: 'value',
    };
    const result = auditService.sanitizePayload(payload);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe('123');
    expect(result!.action).toBe('LOGIN');
    expect(result!.normalField).toBe('value');
    expect(result!.password).toBeUndefined();
    expect(result!.token).toBeUndefined();
    expect(result!.refreshToken).toBeUndefined();
    expect(result!.apiKey).toBeUndefined();
    expect(result!.secret).toBeUndefined();
  });

  it('should handle case-insensitive sensitive keys', () => {
    const payload = {
      Password: 'secret',
      TOKEN: 'abc',
      normalField: 'value',
    };
    const result = auditService.sanitizePayload(payload);
    expect(result!.Password).toBeUndefined();
    expect(result!.TOKEN).toBeUndefined();
    expect(result!.normalField).toBe('value');
  });

  it('should return null for null/undefined/non-object payload', () => {
    expect(auditService.sanitizePayload(null)).toBeNull();
    expect(auditService.sanitizePayload(undefined)).toBeNull();
    expect(auditService.sanitizePayload('string')).toBeNull();
    expect(auditService.sanitizePayload(123)).toBeNull();
    expect(auditService.sanitizePayload([1, 2, 3])).toBeNull();
  });

  it('should preserve non-sensitive nested objects', () => {
    const payload = {
      user: { id: '123', name: 'test' },
      password: 'secret',
    };
    const result = auditService.sanitizePayload(payload);
    expect(result!.user).toEqual({ id: '123', name: 'test' });
    expect(result!.password).toBeUndefined();
  });
});

describe('auditService.formatAuditLogsAsCsv', () => {
  const createdAt = new Date('2024-01-15T08:30:00.000Z');

  function makeLog(overrides: Partial<AuditLogLike> = {}): AuditLogLike {
    return {
      id: 'log-1',
      actorId: 'user-1',
      action: 'LOGIN',
      targetType: 'USER',
      targetId: 'target-1',
      payload: { normalField: 'value' },
      createdAt,
      ...overrides,
    };
  }

  it('should produce correct CSV header columns', () => {
    const csv = auditService.formatAuditLogsAsCsv([]);
    expect(csv).toBe('id,actorId,action,targetType,targetId,createdAt,payload');
  });

  it('should include one row per audit log', () => {
    const csv = auditService.formatAuditLogsAsCsv([makeLog()]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    const columns = parseCsvLine(lines[1]);
    expect(columns[0]).toBe('log-1');
    expect(columns[1]).toBe('user-1');
    expect(columns[2]).toBe('LOGIN');
    expect(columns[3]).toBe('USER');
    expect(columns[4]).toBe('target-1');
    expect(columns[5]).toBe('2024-01-15T08:30:00.000Z');
  });

  it('should stringify payload as JSON', () => {
    const csv = auditService.formatAuditLogsAsCsv([makeLog({ payload: { normalField: 'value' } })]);
    const columns = parseCsvLine(csv.split('\n')[1]);
    expect(JSON.parse(columns[6])).toEqual({ normalField: 'value' });
  });

  it('should sanitize sensitive fields from payload', () => {
    const csv = auditService.formatAuditLogsAsCsv([
      makeLog({ payload: { userId: '123', password: 'secret', apiKey: 'key' } }),
    ]);
    const columns = parseCsvLine(csv.split('\n')[1]);
    const parsed = JSON.parse(columns[6]);
    expect(parsed).toEqual({ userId: '123' });
    expect(parsed).not.toHaveProperty('password');
    expect(parsed).not.toHaveProperty('apiKey');
  });

  it('should escape commas, quotes and newlines', () => {
    const csv = auditService.formatAuditLogsAsCsv([
      makeLog({ action: 'A,B', targetType: 'A"B', payload: { note: 'line1\nline2' } }),
    ]);
    const columns = parseCsvLine(csv.split('\n')[1]);
    expect(columns[2]).toBe('A,B');
    expect(columns[3]).toBe('A"B');
    expect(JSON.parse(columns[6])).toEqual({ note: 'line1\nline2' });
  });

  it('should leave payload column empty when payload is null', () => {
    const csv = auditService.formatAuditLogsAsCsv([makeLog({ payload: null })]);
    const columns = parseCsvLine(csv.split('\n')[1]);
    expect(columns[6]).toBe('');
  });
});

describe.skipIf(!process.env.DATABASE_URL || !dbReachable)('Audit API', () => {
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

  describe('GET /api/v1/admin/audit', () => {
    it('should return 401 without authentication', async () => {
      const res = await request.get('/api/v1/admin/audit');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin (USER role)', async () => {
      const token = await registerAndLogin(`user-audit-${Date.now()}@example.com`);
      const res = await request
        .get('/api/v1/admin/audit')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe(2003);
    });

    it('should return 200 with paginated data for ADMIN', async () => {
      const token = await loginAdmin();
      const res = await request
        .get('/api/v1/admin/audit?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page', 1);
      expect(res.body.data).toHaveProperty('limit', 10);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('should filter by action for ADMIN', async () => {
      const uniqueAction = `FILTER_TEST_${Date.now()}`;
      await auditService.log({
        actorId: null,
        action: uniqueAction,
        targetType: 'TEST',
        targetId: 'filter-target',
      });

      const token = await loginAdmin();
      const res = await request
        .get(`/api/v1/admin/audit?action=${uniqueAction}&page=1&limit=50`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items.every((item: { action: string }) => item.action === uniqueAction)).toBe(true);
    });
  });

  describe('POST /api/v1/admin/audit/export', () => {
    it('should return 401 without authentication', async () => {
      const res = await request.post('/api/v1/admin/audit/export');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin (USER role)', async () => {
      const token = await registerAndLogin(`user-export-${Date.now()}@example.com`);
      const res = await request
        .post('/api/v1/admin/audit/export')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(2003);
    });

    it('should return 403 for non-admin even with query params', async () => {
      const token = await registerAndLogin(`user-export-q-${Date.now()}@example.com`);
      const res = await request
        .post('/api/v1/admin/audit/export?action=LOGIN')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('should return CSV with correct headers for ADMIN', async () => {
      const token = await loginAdmin();
      const res = await request
        .post('/api/v1/admin/audit/export')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="audit-logs-\d{4}-\d{2}-\d{2}\.csv"/);
      expect(res.text).toContain('id,actorId,action,targetType,targetId,createdAt,payload');
    });

    it('should export filtered results and sanitize payload for ADMIN', async () => {
      const uniqueAction = `EXPORT_TEST_${Date.now()}`;
      await auditService.log({
        actorId: 'actor-1',
        action: uniqueAction,
        targetType: 'TEST',
        targetId: 'export-target',
        payload: { normalField: 'value', password: 'secret123', apiKey: 'key' },
      });

      const token = await loginAdmin();
      const res = await request
        .post(`/api/v1/admin/audit/export?action=${uniqueAction}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const rows = res.text.split('\n').filter((line) => line.length > 0);
      const dataRow = parseCsvLine(rows[rows.length - 1]);
      const payload = JSON.parse(dataRow[6]);
      expect(dataRow[2]).toBe(uniqueAction);
      expect(payload).toEqual({ normalField: 'value' });
      expect(payload).not.toHaveProperty('password');
      expect(payload).not.toHaveProperty('apiKey');
    });
  });
});
