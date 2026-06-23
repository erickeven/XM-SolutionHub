import { Tag, Timeline, Typography } from 'antd';
import {
  SearchOutlined,
  FileSearchOutlined,
  RadarChartOutlined,
  ExpandOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons';
import type { SearchTraceStep } from '../../../api/trace';

interface TraceStepCardProps {
  step: SearchTraceStep;
  index: number;
}

const STAGE_CONFIG: Record<
  SearchTraceStep['stage'],
  { label: string; icon: React.ReactNode; color: string }
> = {
  entity: { label: '实体搜索', icon: <SearchOutlined />, color: 'blue' },
  fulltext: { label: '全文检索', icon: <FileSearchOutlined />, color: 'cyan' },
  vector: { label: '向量召回', icon: <RadarChartOutlined />, color: 'purple' },
  expand: { label: '扩展', icon: <ExpandOutlined />, color: 'gold' },
  rerank: { label: '重排', icon: <SortAscendingOutlined />, color: 'magenta' },
};

function durationColor(ms: number): string {
  if (ms < 100) return 'text-green-600';
  if (ms < 500) return 'text-slate-700';
  return 'text-orange-600';
}

export function TraceStepCard({ step, index }: TraceStepCardProps) {
  const cfg = STAGE_CONFIG[step.stage] ?? { label: step.stage, icon: null, color: 'default' };

  return (
    <Timeline.Item
      key={index}
      color={cfg.color}
      dot={cfg.icon}
    >
      <div className="flex items-center gap-2">
        <Tag color={cfg.color}>{cfg.label}</Tag>
        <span className={`font-mono text-sm font-semibold ${durationColor(step.durationMs)}`}>
          {step.durationMs}ms
        </span>
        <span className="text-sm text-slate-500">候选 {step.candidateCount}</span>
        {step.selectedIds.length > 0 && (
          <Typography.Text type="secondary" className="text-xs">
            选中 {step.selectedIds.length}
          </Typography.Text>
        )}
      </div>
      {step.selectedIds.length > 0 && (
        <div className="mt-1 max-w-[600px] truncate text-xs text-slate-400">
          {step.selectedIds.join(', ')}
        </div>
      )}
    </Timeline.Item>
  );
}