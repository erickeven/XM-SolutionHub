import prisma from '../../lib/prisma';
import type {
  CountCard,
  DashboardSnapshot,
  KnowledgeStatusBreakdown,
  LeadStatusBreakdown,
  PendingItem,
  RecentActivity,
} from './dashboard.types';

const LEAD_STATUSES: LeadStatusBreakdown['status'][] = [
  'NEW', 'ASSIGNED', 'FOLLOWING', 'CONVERTED', 'ABANDONED',
];

const KNOWLEDGE_STATUSES: KnowledgeStatusBreakdown['status'][] = [
  'UPLOADED', 'PROCESSING', 'READY', 'FAILED',
];

const ACTION_LABELS: Record<string, string> = {
  'user.create': '创建用户',
  'user.update': '更新用户',
  'user.delete': '删除用户',
  'product.create': '创建产品',
  'product.update': '更新产品',
  'product.delete': '删除产品',
  'solution.create': '创建方案',
  'solution.update': '更新方案',
  'solution.delete': '删除方案',
  'material.create': '上传资料',
  'material.update': '更新资料',
  'material.delete': '删除资料',
  'knowledge.create': '创建知识文档',
  'knowledge.update': '更新知识文档',
  'knowledge.delete': '删除知识文档',
  'role.create': '创建角色',
  'role.update': '更新角色',
  'role.delete': '删除角色',
  'login': '登录',
  'token.refresh': '刷新会话',
};

const TARGET_LABELS: Record<string, string> = {
  USER: '用户',
  PRODUCT: '产品',
  SOLUTION: '方案',
  MATERIAL: '资料',
  KNOWLEDGE_DOC: '知识文档',
  ROLE: '角色',
};

/**
 * STAFF:AUDITOR:ADMIN tiered data scope.
 * STAFF — only own leads, no user stats, no audit
 * AUDITOR — all leads, no user/staff counts, no audit
 * ADMIN — everything
 */
export async function getSnapshot(role: string, userId: string): Promise<DashboardSnapshot> {
  const isAdmin = role === 'ADMIN';
  const isStaff = role === 'STAFF';

  const [
    productCount, activeProductCount,
    solutionCount, activeSolutionCount,
    materialCount, activeMaterialCount,
    knowledgeDocCount, readyKnowledgeCount,
    leadStatusRows, knowledgeStatusRows,
    failedIndexJobs, unassignedLeads, recentAudit,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.solution.count(),
    prisma.solution.count({ where: { status: 'ACTIVE' } }),
    prisma.material.count(),
    prisma.material.count({ where: { status: 'ACTIVE' } }),
    prisma.knowledgeDoc.count(),
    prisma.knowledgeDoc.count({ where: { status: 'READY' } }),
    // leads: STAFF only sees assigned, AUDITOR+ sees all
    prisma.lead.groupBy({
      by: ['status'],
      _count: { status: true },
      where: isStaff ? { assignedTo: userId } : undefined,
    }),
    prisma.knowledgeDoc.groupBy({ by: ['status'], _count: { status: true } }),
    // failed index jobs — always visible (no data leak)
    prisma.knowledgeIndexJob.findMany({
      where: { status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { doc: { select: { title: true } } },
    }),
    // pending unassigned leads — only for AUDITOR+
    !isStaff
      ? prisma.lead.findMany({
          where: { status: 'NEW', assignedTo: null },
          orderBy: { lastActiveAt: 'desc' },
          take: 5,
          select: { id: true, score: true, lastActiveAt: true, user: { select: { email: true } } },
        })
      : Promise.resolve([]),
    // audit log — only for ADMIN
    isAdmin
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { actor: { select: { email: true } } },
        })
      : Promise.resolve([]),
  ]);

  // ── Count cards ──────────────────────────────────
  const counts: CountCard[] = [
    { key: 'products', label: '产品总数', value: productCount, delta: activeProductCount },
    { key: 'solutions', label: '方案总数', value: solutionCount, delta: activeSolutionCount },
    { key: 'materials', label: '资料总数', value: materialCount, delta: activeMaterialCount },
    { key: 'knowledge', label: '知识文档', value: knowledgeDocCount, delta: readyKnowledgeCount },
  ];

  if (!isStaff) {
    const leadCount = leadStatusRows.reduce((sum, r) => sum + r._count.status, 0);
    counts.push({ key: 'leads', label: '线索总数', value: leadCount });
  }

  if (isAdmin) {
    const [userCount, staffCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: { in: ['STAFF', 'AUDITOR', 'ADMIN'] } } }),
    ]);
    counts.push({ key: 'users', label: '注册用户', value: userCount, delta: staffCount });
  }

  // ── Lead status breakdown ─────────────────────────
  const leadStatusMap = new Map<string, number>();
  for (const row of leadStatusRows) leadStatusMap.set(row.status, row._count.status);
  const leadStatusBreakdown: LeadStatusBreakdown[] = LEAD_STATUSES.map((s) => ({
    status: s,
    count: leadStatusMap.get(s) ?? 0,
  }));

  // ── Knowledge status breakdown ────────────────────
  const knowledgeStatusMap = new Map<string, number>();
  for (const row of knowledgeStatusRows) knowledgeStatusMap.set(row.status, row._count.status);
  const knowledgeStatusBreakdown: KnowledgeStatusBreakdown[] = KNOWLEDGE_STATUSES.map((s) => ({
    status: s,
    count: knowledgeStatusMap.get(s) ?? 0,
  }));

  // ── Pending items ─────────────────────────────────
  const pendingItems: PendingItem[] = [];
  for (const job of failedIndexJobs) {
    pendingItems.push({
      key: `failed-index-${job.id}`,
      type: 'failed_index',
      title: `索引失败：${job.doc?.title ?? job.docId}`,
      description: job.errorMessage ?? '请查看 Worker 日志',
      href: `/admin/trace/${job.docId}`,
      createdAt: job.createdAt.toISOString(),
    });
  }
  for (const lead of unassignedLeads) {
    pendingItems.push({
      key: `unassigned-${lead.id}`,
      type: 'unassigned_lead',
      title: `未分配线索：${lead.user?.email ?? '匿名访客'}`,
      description: `热度 ${lead.score}`,
      href: '/admin/leads',
      createdAt: lead.lastActiveAt?.toISOString(),
    });
  }

  // ── Recent activity (ADMIN only) ──────────────────
  const recentActivity: RecentActivity[] = recentAudit.map((log) => ({
    id: log.id,
    action: log.action,
    actionLabel: ACTION_LABELS[log.action] ?? log.action,
    actorEmail: log.actor?.email,
    targetType: log.targetType,
    targetLabel: TARGET_LABELS[log.targetType] ?? log.targetType,
    createdAt: log.createdAt.toISOString(),
  }));

  return {
    counts,
    leadStatusBreakdown,
    knowledgeStatusBreakdown,
    pendingItems,
    recentActivity,
    generatedAt: new Date().toISOString(),
  };
}