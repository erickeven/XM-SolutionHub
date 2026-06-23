import { useQuery } from '@tanstack/react-query';
import { Drawer, Tag, Empty, Spin, Typography } from 'antd';
import { listLeads } from '../../../api/leads';
import type { LeadEvent } from '../../../api/leads';

const { Text } = Typography;

interface LeadEventsDrawerProps {
  open: boolean;
  leadId: string | null;
  onClose: () => void;
}

const EVENT_TYPE_COLOR: Record<string, string> = {
  selection: 'default',
  material_preview: 'blue',
  material_download: 'green',
  ai_question: 'purple',
  register: 'gold',
  ai_feedback: 'orange',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  selection: '选型',
  material_preview: '素材预览',
  material_download: '素材下载',
  ai_question: 'AI提问',
  register: '注册',
  ai_feedback: 'AI反馈',
};

function truncatePayload(payload: unknown, maxLen = 120): string {
  try {
    const str = JSON.stringify(payload);
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '...';
  } catch {
    return String(payload);
  }
}

export function LeadEventsDrawer({
  open,
  leadId,
  onClose,
}: LeadEventsDrawerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['leadEvents', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const res = await listLeads({ search: leadId, pageSize: 1 });
      const lead = res.items.find((l) => l.id === leadId);
      return lead?.events ?? [];
    },
    enabled: open && !!leadId,
  });

  const events: LeadEvent[] = data ?? [];

  return (
    <Drawer
      title="线索活动记录"
      open={open}
      onClose={onClose}
      width={480}
      destroyOnClose
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : events.length === 0 ? (
        <Empty description="暂无活动记录" />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-slate-200 p-3"
            >
              <div className="flex items-center justify-between">
                <Tag color={EVENT_TYPE_COLOR[event.eventType] ?? 'default'}>
                  {EVENT_TYPE_LABEL[event.eventType] ?? event.eventType}
                </Tag>
                <Text type="secondary" className="text-xs">
                  {new Date(event.createdAt).toLocaleString('zh-CN')}
                </Text>
              </div>
              <Text type="secondary" className="mt-2 block break-all text-xs">
                {truncatePayload(event.payload)}
              </Text>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}