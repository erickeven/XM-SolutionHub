export interface CountCard {
  key: string;
  label: string;
  value: number;
  delta?: number;
}

export interface LeadStatusBreakdown {
  status: 'NEW' | 'ASSIGNED' | 'FOLLOWING' | 'CONVERTED' | 'ABANDONED';
  count: number;
}

export interface KnowledgeStatusBreakdown {
  status: 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';
  count: number;
}

export interface PendingItem {
  key: string;
  type: 'failed_index' | 'unassigned_lead' | 'failed_lead_event' | 'inactive_admin';
  title: string;
  description?: string;
  href?: string;
  createdAt?: string;
}

export interface RecentActivity {
  id: string;
  action: string;
  actionLabel: string;
  actorEmail?: string;
  targetType: string;
  targetLabel: string;
  createdAt: string;
}

export interface DashboardSnapshot {
  counts: CountCard[];
  leadStatusBreakdown: LeadStatusBreakdown[];
  knowledgeStatusBreakdown: KnowledgeStatusBreakdown[];
  pendingItems: PendingItem[];
  recentActivity: RecentActivity[];
  generatedAt: string;
}
