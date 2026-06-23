import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { SignJWT } from 'jose';
import { processEvent } from './events.service';
import {
  changeLeadStatus,
  assignLeadToStaff,
  aggregateLeads,
  getLeadDetail,
  mergeAnonymousLeadToUser,
} from './leads.service';

// ── Test helpers ──────────────────────────────────────────

async function signToken(
  userId: string,
  email: string,
  role: string,
): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-32chars-minimum!!',
  );
  return new SignJWT({ userId, email, role, familyId: 'test-family' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secret);
}

// Synchronous DB reachability check — skip tests if PostgreSQL is not running
function isDbReachable(): boolean {
  try {
    const result = execSync(
      'powershell -NoProfile -Command "try { (New-Object System.Net.Sockets.TcpClient(\'localhost\', 5432)).Close(); \'1\' } catch { \'0\' }"',
      { timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] },
    ).toString().trim();
    return result === '1';
  } catch {
    return false;
  }
}

describe.skipIf(!process.env.DATABASE_URL || !isDbReachable())('Events API', () => {
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

  it('should reject non-whitelist event type with 400', async () => {
    const res = await request.post('/api/v1/events').send({
      eventType: 'invalid_event',
      anonymousId: 'test-anon-' + Date.now(),
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(1001);
  });

  it('should reject missing anonymousId when not authenticated with 400', async () => {
    const res = await request.post('/api/v1/events').send({
      eventType: 'product_view',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(1002);
  });

  it('should accept valid event and return leadId + eventId', async () => {
    const anonId = 'test-anon-valid-' + Date.now();
    const res = await request.post('/api/v1/events').send({
      eventType: 'product_view',
      anonymousId: anonId,
      page: '/products/LP3524',
    });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.leadId).toBeTruthy();
    expect(res.body.data.eventId).toBeTruthy();
  });

  it('should add 20 to score for material_download event', async () => {
    const anonId = 'test-anon-score-' + Date.now();

    // First event: product_view (score +2)
    const res1 = await request.post('/api/v1/events').send({
      eventType: 'product_view',
      anonymousId: anonId,
    });
    expect(res1.status).toBe(200);
    const leadId = res1.body.data.leadId;

    // Second event: material_download (score +20)
    const res2 = await request.post('/api/v1/events').send({
      eventType: 'material_download',
      anonymousId: anonId,
    });
    expect(res2.status).toBe(200);
    expect(res2.body.data.leadId).toBe(leadId);

    // Verify score via direct DB query
    const prisma = (await import('../../lib/prisma')).default;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead).not.toBeNull();
    expect(lead!.score).toBe(22); // 2 + 20
  });

  it('should return same leadId for same anonymousId across multiple events', async () => {
    const anonId = 'test-anon-idempotent-' + Date.now();

    const res1 = await request.post('/api/v1/events').send({
      eventType: 'product_view',
      anonymousId: anonId,
    });
    expect(res1.status).toBe(200);

    const res2 = await request.post('/api/v1/events').send({
      eventType: 'selection',
      anonymousId: anonId,
    });
    expect(res2.status).toBe(200);

    const res3 = await request.post('/api/v1/events').send({
      eventType: 'ai_question',
      anonymousId: anonId,
    });
    expect(res3.status).toBe(200);

    expect(res1.body.data.leadId).toBe(res2.body.data.leadId);
    expect(res2.body.data.leadId).toBe(res3.body.data.leadId);
  });

  // ── Lead status transition tests (PRD §7.5 L229-234) ──────

  it('should allow NEW -> ASSIGNED status transition', async () => {
    const anonId = 'test-anon-status-' + Date.now();
    const res = await request.post('/api/v1/events').send({
      eventType: 'product_view',
      anonymousId: anonId,
    });
    const leadId = res.body.data.leadId as string;

    const updated = await changeLeadStatus(leadId, 'ASSIGNED', 'test-actor');
    expect(updated.status).toBe('ASSIGNED');
  });

  it('should reject ASSIGNED -> NEW backward status transition', async () => {
    const anonId = 'test-anon-back-' + Date.now();
    const res = await request.post('/api/v1/events').send({
      eventType: 'product_view',
      anonymousId: anonId,
    });
    const leadId = res.body.data.leadId as string;

    await changeLeadStatus(leadId, 'ASSIGNED', 'test-actor');

    await expect(changeLeadStatus(leadId, 'NEW', 'test-actor')).rejects.toThrow(
      /Invalid status transition/,
    );
  });

  it('should allow full flow NEW -> ASSIGNED -> FOLLOWING -> CONVERTED', async () => {
    const anonId = 'test-anon-flow-' + Date.now();
    const res = await request.post('/api/v1/events').send({
      eventType: 'product_view',
      anonymousId: anonId,
    });
    const leadId = res.body.data.leadId as string;

    await changeLeadStatus(leadId, 'ASSIGNED', 'test-actor');
    await changeLeadStatus(leadId, 'FOLLOWING', 'test-actor');
    const final = await changeLeadStatus(leadId, 'CONVERTED', 'test-actor');
    expect(final.status).toBe('CONVERTED');
  });

  it('should reject transition from terminal status CONVERTED', async () => {
    const anonId = 'test-anon-terminal-' + Date.now();
    const res = await request.post('/api/v1/events').send({
      eventType: 'product_view',
      anonymousId: anonId,
    });
    const leadId = res.body.data.leadId as string;

    await changeLeadStatus(leadId, 'ASSIGNED', 'test-actor');
    await changeLeadStatus(leadId, 'FOLLOWING', 'test-actor');
    await changeLeadStatus(leadId, 'CONVERTED', 'test-actor');

    await expect(changeLeadStatus(leadId, 'FOLLOWING', 'test-actor')).rejects.toThrow(
      /Invalid status transition/,
    );
  });

  // ── Score accumulation tests ─────────────────────────────

  it('should accumulate scores across multiple events', async () => {
    const anonId = 'test-anon-accum-' + Date.now();

    // product_view=2, material_download=20, ai_question=10 → total 32
    await processEvent({ eventType: 'product_view', anonymousId: anonId });
    await processEvent({ eventType: 'material_download', anonymousId: anonId });
    await processEvent({ eventType: 'ai_question', anonymousId: anonId });

    const prisma = (await import('../../lib/prisma')).default;
    const lead = await prisma.lead.findFirst({ where: { anonymousId: anonId } });
    expect(lead).not.toBeNull();
    expect(lead!.score).toBe(32); // 2 + 20 + 10
  });

  // ── Anonymous → registered merge tests ───────────────────

  it('should merge anonymous lead to user account and keep events', async () => {
    const anonId = 'test-anon-merge-' + Date.now();
    const prisma = (await import('../../lib/prisma')).default;

    // Create events under anonymous lead
    await processEvent({ eventType: 'product_view', anonymousId: anonId });
    await processEvent({ eventType: 'material_download', anonymousId: anonId });

    const anonLead = await prisma.lead.findFirst({ where: { anonymousId: anonId } });
    expect(anonLead).not.toBeNull();
    const leadId = anonLead!.id;
    const eventCountBefore = await prisma.leadEvent.count({ where: { leadId } });
    expect(eventCountBefore).toBe(2);

    // Create a user
    const user = await prisma.user.create({
      data: {
        email: `test-merge-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'USER',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });

    // Merge
    await mergeAnonymousLeadToUser(anonId, user.id);

    // Verify lead now belongs to user
    const mergedLead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(mergedLead).not.toBeNull();
    expect(mergedLead!.userId).toBe(user.id);
    expect(mergedLead!.anonymousId).toBeNull();

    // Verify events remain under same lead
    const eventCountAfter = await prisma.leadEvent.count({ where: { leadId } });
    expect(eventCountAfter).toBe(2);

    // Cleanup
    await prisma.leadEvent.deleteMany({ where: { leadId } });
    await prisma.lead.delete({ where: { id: leadId } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  // ── List with filters tests ───────────────────────────────

  it('should filter leads by status', async () => {
    const prisma = (await import('../../lib/prisma')).default;
    const anonId1 = 'test-anon-filter-new-' + Date.now();
    const anonId2 = 'test-anon-filter-assigned-' + Date.now();

    // Create lead 1 (stays NEW)
    await processEvent({ eventType: 'product_view', anonymousId: anonId1 });

    // Create lead 2 (transition to ASSIGNED)
    await processEvent({ eventType: 'product_view', anonymousId: anonId2 });
    const lead2 = await prisma.lead.findFirst({ where: { anonymousId: anonId2 } });
    await changeLeadStatus(lead2!.id, 'ASSIGNED', 'test-actor');

    // Query only ASSIGNED leads
    const result = await aggregateLeads({ page: 1, pageSize: 50, status: 'ASSIGNED' });
    expect(result.total).toBeGreaterThanOrEqual(1);
    const assignedLeads = result.items.filter((l) => l.status === 'ASSIGNED');
    expect(assignedLeads.length).toBe(result.items.length);

    // Cleanup
    await prisma.leadEvent.deleteMany({ where: { leadId: { in: [lead2!.id] } } });
    await prisma.lead.deleteMany({ where: { anonymousId: { in: [anonId1, anonId2] } } });
  });

  it('should filter leads by score range', async () => {
    const anonId = 'test-anon-score-range-' + Date.now();

    // product_view=2, material_download=20 → total 22
    await processEvent({ eventType: 'product_view', anonymousId: anonId });
    await processEvent({ eventType: 'material_download', anonymousId: anonId });

    const result = await aggregateLeads({
      page: 1,
      pageSize: 50,
      scoreMin: 20,
      scoreMax: 25,
    });
    expect(result.total).toBeGreaterThanOrEqual(1);
    for (const lead of result.items) {
      expect(lead.score).toBeGreaterThanOrEqual(20);
      expect(lead.score).toBeLessThanOrEqual(25);
    }

    // Cleanup
    const prisma = (await import('../../lib/prisma')).default;
    await prisma.leadEvent.deleteMany({ where: { leadId: { in: result.items.map((l) => l.id) } } });
    await prisma.lead.deleteMany({ where: { anonymousId: { in: [anonId] } } });
  });

  // ── Non-admin access control ──────────────────────────────

  it('should not expose other users leads via search filter', async () => {
    const prisma = (await import('../../lib/prisma')).default;

    // Create two users with their own leads
    const user1 = await prisma.user.create({
      data: {
        email: `test-acl1-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'USER',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });
    const user2 = await prisma.user.create({
      data: {
        email: `test-acl2-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'USER',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });

    // Create leads for each user
    await prisma.lead.create({
      data: { userId: user1.id, status: 'NEW' },
    });
    await prisma.lead.create({
      data: { userId: user2.id, status: 'NEW' },
    });

    // User1 searches for their own leads — should only see their own
    const result = await aggregateLeads({
      page: 1,
      pageSize: 50,
      search: user1.id,
    });
    for (const lead of result.items) {
      expect(lead.userId).toBe(user1.id);
    }

    // Verify user1's leads are in the result
    expect(result.items.some((l) => l.userId === user1.id)).toBe(true);
    // Verify user2's leads are NOT in the result
    expect(result.items.some((l) => l.userId === user2.id)).toBe(false);

    // Cleanup
    const leads = await prisma.lead.findMany({ where: { userId: { in: [user1.id, user2.id] } } });
    for (const lead of leads) {
      await prisma.leadEvent.deleteMany({ where: { leadId: lead.id } });
    }
    await prisma.lead.deleteMany({ where: { userId: { in: [user1.id, user2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
  });

  // ── getLeadDetail test ────────────────────────────────────

  it('should return lead detail with events', async () => {
    const anonId = 'test-anon-detail-' + Date.now();
    await processEvent({ eventType: 'product_view', anonymousId: anonId });
    await processEvent({ eventType: 'selection', anonymousId: anonId });

    const prisma = (await import('../../lib/prisma')).default;
    const lead = await prisma.lead.findFirst({ where: { anonymousId: anonId } });
    const detail = await getLeadDetail(lead!.id);

    expect(detail.id).toBe(lead!.id);
    expect(detail.events.length).toBe(2);
    expect(detail.events[0]!.eventType).toBe('product_view');
    expect(detail.events[1]!.eventType).toBe('selection');

    // Cleanup
    await prisma.leadEvent.deleteMany({ where: { leadId: lead!.id } });
    await prisma.lead.delete({ where: { id: lead!.id } });
  });

  // ── assignLeadToStaff test ────────────────────────────────

  it('should assign lead to STAFF user and set status ASSIGNED', async () => {
    const prisma = (await import('../../lib/prisma')).default;

    // Create a STAFF user
    const staff = await prisma.user.create({
      data: {
        email: `test-staff-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'STAFF',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });

    // Create a lead
    const anonId = 'test-anon-assign-' + Date.now();
    await processEvent({ eventType: 'product_view', anonymousId: anonId });
    const lead = await prisma.lead.findFirst({ where: { anonymousId: anonId } });

    const updated = await assignLeadToStaff(lead!.id, staff.id, 'test-admin');
    expect(updated.assignedTo).toBe(staff.id);
    expect(updated.status).toBe('ASSIGNED');

    // Cleanup
    await prisma.leadEvent.deleteMany({ where: { leadId: lead!.id } });
    await prisma.lead.delete({ where: { id: lead!.id } });
    await prisma.user.delete({ where: { id: staff.id } });
  });

  it('should reject assigning lead to non-STAFF user', async () => {
    const prisma = (await import('../../lib/prisma')).default;

    // Create a regular USER
    const regularUser = await prisma.user.create({
      data: {
        email: `test-user-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'USER',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });

    // Create a lead
    const anonId = 'test-anon-reject-' + Date.now();
    await processEvent({ eventType: 'product_view', anonymousId: anonId });
    const lead = await prisma.lead.findFirst({ where: { anonymousId: anonId } });

    await expect(assignLeadToStaff(lead!.id, regularUser.id, 'test-admin')).rejects.toThrow(
      /STAFF or above/,
    );

    // Cleanup
    await prisma.leadEvent.deleteMany({ where: { leadId: lead!.id } });
    await prisma.lead.delete({ where: { id: lead!.id } });
    await prisma.user.delete({ where: { id: regularUser.id } });
  });

  // ── Admin API endpoint tests (PRD §9 L319-322) ─────────────

  it('should return 401 when no auth token on admin leads list', async () => {
    const res = await request.get('/api/v1/admin/leads');
    expect(res.status).toBe(401);
  });

  it('should return 403 for USER role accessing admin leads list', async () => {
    const prisma = (await import('../../lib/prisma')).default;
    const user = await prisma.user.create({
      data: {
        email: `test-user-acl-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'USER',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });
    const token = await signToken(user.id, user.email, 'USER');

    const res = await request
      .get('/api/v1/admin/leads')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);

    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should let STAFF see only leads assigned to themselves', async () => {
    const prisma = (await import('../../lib/prisma')).default;

    // Create STAFF user
    const staff = await prisma.user.create({
      data: {
        email: `test-staff-list-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'STAFF',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });
    const staffToken = await signToken(staff.id, staff.email, 'STAFF');

    // Create another STAFF user
    const staff2 = await prisma.user.create({
      data: {
        email: `test-staff2-list-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'STAFF',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });

    // Create leads assigned to staff1 and staff2
    const lead1 = await prisma.lead.create({
      data: { userId: staff.id, status: 'NEW', assignedTo: staff.id },
    });
    const lead2 = await prisma.lead.create({
      data: { userId: staff2.id, status: 'NEW', assignedTo: staff2.id },
    });

    const res = await request
      .get('/api/v1/admin/leads')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    // All returned leads must be assigned to staff1
    for (const item of res.body.data.items) {
      expect(item.assignedTo).toBe(staff.id);
    }
    // lead1 should be in results, lead2 should not
    expect(res.body.data.items.some((i: { id: string }) => i.id === lead1.id)).toBe(true);
    expect(res.body.data.items.some((i: { id: string }) => i.id === lead2.id)).toBe(false);

    // Cleanup
    await prisma.leadEvent.deleteMany({ where: { leadId: { in: [lead1.id, lead2.id] } } });
    await prisma.lead.deleteMany({ where: { id: { in: [lead1.id, lead2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [staff.id, staff2.id] } } });
  });

  it('should let AUDITOR see all leads', async () => {
    const prisma = (await import('../../lib/prisma')).default;

    const auditor = await prisma.user.create({
      data: {
        email: `test-auditor-list-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'AUDITOR',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });
    const auditorToken = await signToken(auditor.id, auditor.email, 'AUDITOR');

    const staff = await prisma.user.create({
      data: {
        email: `test-staff-aud-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'STAFF',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });

    const lead1 = await prisma.lead.create({
      data: { status: 'NEW', assignedTo: staff.id },
    });
    const lead2 = await prisma.lead.create({
      data: { status: 'NEW' },
    });

    const res = await request
      .get('/api/v1/admin/leads')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    const ids = res.body.data.items.map((i: { id: string }) => i.id);
    expect(ids).toContain(lead1.id);
    expect(ids).toContain(lead2.id);

    // Cleanup
    await prisma.leadEvent.deleteMany({ where: { leadId: { in: [lead1.id, lead2.id] } } });
    await prisma.lead.deleteMany({ where: { id: { in: [lead1.id, lead2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [auditor.id, staff.id] } } });
  });

  it('should allow AUDITOR to assign a lead to STAFF', async () => {
    const prisma = (await import('../../lib/prisma')).default;

    const auditor = await prisma.user.create({
      data: {
        email: `test-auditor-assign-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'AUDITOR',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });
    const auditorToken = await signToken(auditor.id, auditor.email, 'AUDITOR');

    const staff = await prisma.user.create({
      data: {
        email: `test-staff-assign-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'STAFF',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });

    const lead = await prisma.lead.create({ data: { status: 'NEW' } });

    const res = await request
      .post(`/api/v1/admin/leads/${lead.id}/assign`)
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({ staffId: staff.id });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.leadId).toBe(lead.id);
    expect(res.body.data.assignedTo).toBe(staff.id);

    // Cleanup
    await prisma.leadEvent.deleteMany({ where: { leadId: lead.id } });
    await prisma.lead.delete({ where: { id: lead.id } });
    await prisma.user.deleteMany({ where: { id: { in: [auditor.id, staff.id] } } });
  });

  it('should reject USER role from assigning leads', async () => {
    const prisma = (await import('../../lib/prisma')).default;

    const user = await prisma.user.create({
      data: {
        email: `test-user-assign-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'USER',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });
    const userToken = await signToken(user.id, user.email, 'USER');

    const lead = await prisma.lead.create({ data: { status: 'NEW' } });

    const res = await request
      .post(`/api/v1/admin/leads/${lead.id}/assign`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ staffId: user.id });

    expect(res.status).toBe(403);

    // Cleanup
    await prisma.leadEvent.deleteMany({ where: { leadId: lead.id } });
    await prisma.lead.delete({ where: { id: lead.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should allow STAFF to update status of own lead and reject others', async () => {
    const prisma = (await import('../../lib/prisma')).default;

    const staff = await prisma.user.create({
      data: {
        email: `test-staff-status-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'STAFF',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });
    const staffToken = await signToken(staff.id, staff.email, 'STAFF');

    // Lead assigned to this staff
    const ownLead = await prisma.lead.create({
      data: { status: 'NEW', assignedTo: staff.id },
    });
    // Lead assigned to someone else
    const otherLead = await prisma.lead.create({ data: { status: 'NEW' } });

    // Update own lead — should succeed
    const res1 = await request
      .patch(`/api/v1/admin/leads/${ownLead.id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'ASSIGNED' });

    expect(res1.status).toBe(200);
    expect(res1.body.data.status).toBe('ASSIGNED');

    // Update other lead — should fail with 403
    const res2 = await request
      .patch(`/api/v1/admin/leads/${otherLead.id}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'ASSIGNED' });

    expect(res2.status).toBe(403);

    // Cleanup
    await prisma.leadEvent.deleteMany({ where: { leadId: { in: [ownLead.id, otherLead.id] } } });
    await prisma.lead.deleteMany({ where: { id: { in: [ownLead.id, otherLead.id] } } });
    await prisma.user.delete({ where: { id: staff.id } });
  });

  it('should validate status transition via API (reject backward)', async () => {
    const prisma = (await import('../../lib/prisma')).default;

    const auditor = await prisma.user.create({
      data: {
        email: `test-auditor-trans-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'AUDITOR',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });
    const auditorToken = await signToken(auditor.id, auditor.email, 'AUDITOR');

    const lead = await prisma.lead.create({ data: { status: 'NEW' } });

    // NEW → ASSIGNED (valid)
    const res1 = await request
      .patch(`/api/v1/admin/leads/${lead.id}/status`)
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({ status: 'ASSIGNED' });
    expect(res1.status).toBe(200);

    // ASSIGNED → NEW (invalid backward)
    const res2 = await request
      .patch(`/api/v1/admin/leads/${lead.id}/status`)
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({ status: 'NEW' });
    expect(res2.status).toBe(400);

    // Cleanup
    await prisma.leadEvent.deleteMany({ where: { leadId: lead.id } });
    await prisma.lead.delete({ where: { id: lead.id } });
    await prisma.user.delete({ where: { id: auditor.id } });
  });

  it('should export leads as CSV with correct headers', async () => {
    const prisma = (await import('../../lib/prisma')).default;

    const auditor = await prisma.user.create({
      data: {
        email: `test-auditor-export-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'AUDITOR',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });
    const auditorToken = await signToken(auditor.id, auditor.email, 'AUDITOR');

    const lead = await prisma.lead.create({ data: { status: 'NEW' } });

    const res = await request
      .post('/api/v1/admin/leads/export')
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="leads-');
    // First line is the CSV header
    const lines = res.text.split('\n');
    expect(lines[0]).toBe(
      'id,userId,anonymousId,score,status,assignedTo,lastActiveAt,createdAt,updatedAt,events',
    );

    // Cleanup
    await prisma.leadEvent.deleteMany({ where: { leadId: lead.id } });
    await prisma.lead.delete({ where: { id: lead.id } });
    await prisma.user.delete({ where: { id: auditor.id } });
  });

  it('should reject STAFF from exporting leads CSV', async () => {
    const prisma = (await import('../../lib/prisma')).default;

    const staff = await prisma.user.create({
      data: {
        email: `test-staff-export-${Date.now()}@test.com`,
        passwordHash: 'test-hash',
        role: 'STAFF',
        privacyVersion: '1.0',
        privacyAcceptedAt: new Date(),
      },
    });
    const staffToken = await signToken(staff.id, staff.email, 'STAFF');

    const res = await request
      .post('/api/v1/admin/leads/export')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({});

    expect(res.status).toBe(403);

    await prisma.user.delete({ where: { id: staff.id } });
  });
});