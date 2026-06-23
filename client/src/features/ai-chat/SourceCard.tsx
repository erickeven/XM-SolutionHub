import { Tag, Typography } from 'antd';
import type { ChatSource } from '../../types/ai-chat';

const { Text } = Typography;

interface SourceCardProps {
  source: ChatSource;
}

export function SourceCard({ source }: SourceCardProps) {
  const handleClick = () => {
    if (source.docId) {
      window.open(`/solutions/${source.docId}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!source.docId}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition-shadow hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="block h-4 w-1 rounded-full bg-copper-500" />
        <Text className="!text-sm !font-medium !text-navy-900 line-clamp-1">{source.title}</Text>
        {source.page !== undefined && (
          <Text className="!text-xs !text-slate-500">第 {source.page} 页</Text>
        )}
      </div>

      <Text className="!mb-2 !block !text-xs !text-slate-600 line-clamp-2">{source.snippet}</Text>

      <div className="flex flex-wrap gap-1">
        <Tag color="blue" className="!m-0 !text-xs">
          相关型号/参数
        </Tag>
        <span className="text-xs text-slate-400">→</span>
        <Tag color="cyan" className="!m-0 !text-xs">
          关联事项
        </Tag>
        <span className="text-xs text-slate-400">→</span>
        <Tag color="orange" className="!m-0 !text-xs">
          来源片段
        </Tag>
        {source.entities.map((entity) => (
          <Tag key={entity} className="!m-0 !text-xs !text-slate-600">
            {entity}
          </Tag>
        ))}
      </div>
    </button>
  );
}
