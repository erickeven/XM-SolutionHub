import { Tag, Typography, Button } from 'antd';
import type { LeadEvent } from '../../../api/leads';

const { Text } = Typography;

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

function truncatePayload(payload: unknown, maxLen = 80): string {
  try {
    const str = JSON.stringify(payload);
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '...';
  } catch {
    return String(payload);
  }
}

interface LeadRowExpandedProps {
  events: LeadEvent[];
  onViewAll: () => void;
}

export function LeadRowExpanded({
  events,
  onViewAll,
}: LeadRowExpandedProps) {
  const recent = events.slice(0, 5);

  if (recent.length === 0) {
    return <Text type="secondary">暂无活动记录</Text>;
  }

  return (
    <div className="space-y-2 py-2">
      {recent.map((event) => (
        <div
          key={event.id}
          className="flex items-start gap-3 rounded border border-slate-100 p-2"
        >
          <Tag color={EVENT_TYPE_COLOR[event.eventType] ?? 'default'}>
            {EVENT_TYPE_LABEL[event.eventType] ?? event.eventType}
          </Tag>
          <Text type="secondary" className="text-xs whitespace-nowrap">
            {new Date(event.createdAt).toLocaleString('zh-CN')}
          </Text>
          <Text type="secondary" className="flex-1 break-all text-xs">
            {truncatePayload(event.payload)}
          </Text>
        </div>
      ))}
      {events.length > 5 && (
        <Button type="link" size="small" onClick={onViewAll}>
          查看全部 ({events.length})
        </Button>
      )}
    </div>
  );
}