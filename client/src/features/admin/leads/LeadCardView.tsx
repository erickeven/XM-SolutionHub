import { Card, Tag, Button, Typography } from 'antd';
import type { LeadItem } from '../../../api/leads';
import { StatusTransition } from './StatusTransition';

const { Text } = Typography;

const STATUS_TAG_COLOR: Record<string, string> = {
  NEW: 'default',
  ASSIGNED: 'blue',
  FOLLOWING: 'cyan',
  CONVERTED: 'green',
  ABANDONED: 'red',
};

const STATUS_LABEL: Record<string, string> = {
  NEW: '新建',
  ASSIGNED: '已分配',
  FOLLOWING: '跟进中',
  CONVERTED: '已转化',
  ABANDONED: '已放弃',
};

interface LeadCardViewProps {
  items: LeadItem[];
  userRole: string;
  onAssign: (lead: LeadItem) => void;
  onViewEvents: (leadId: string) => void;
}

export function LeadCardView({
  items,
  userRole,
  onAssign,
  onViewEvents,
}: LeadCardViewProps) {
  const canAssign =
    userRole === 'AUDITOR' || userRole === 'ADMIN';

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} size="small" className="!rounded-lg">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <Text strong className="flex-1" ellipsis>
                {item.email ?? item.userId ?? item.anonymousId ?? '匿名用户'}
              </Text>
              <Tag color={STATUS_TAG_COLOR[item.status] ?? 'default'}>
                {STATUS_LABEL[item.status] ?? item.status}
              </Tag>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span>评分: {item.score}</span>
              {item.assignedTo && <span>分配给: {item.assignedTo}</span>}
              <span>
                最后活跃: {new Date(item.lastActiveAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <div className="flex gap-2 pt-1">
              {canAssign && (
                <Button
                  size="small"
                  onClick={() => onAssign(item)}
                >
                  分配
                </Button>
              )}
              <StatusTransition
                currentStatus={item.status}
                leadId={item.id}
                userRole={userRole}
              />
              <Button
                size="small"
                onClick={() => onViewEvents(item.id)}
              >
                活动记录
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}