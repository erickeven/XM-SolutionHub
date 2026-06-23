import { useState } from 'react';
import { Card, Tag, Timeline, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import type { SearchTraceRecord } from '../../../api/trace';
import { TraceStepCard } from './TraceStepCard';

interface TraceRecordCardProps {
  trace: SearchTraceRecord;
}

const MODE_COLOR: Record<string, string> = {
  fast: 'blue',
  standard: 'purple',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { hour12: false });
}

export function TraceRecordCard({ trace }: TraceRecordCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasSteps = trace.steps !== null && trace.steps.length > 0;

  return (
    <Card size="small" className="mb-3">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => hasSteps && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Typography.Text strong className="text-sm">
            {trace.query}
          </Typography.Text>
          <Tag color={MODE_COLOR[trace.mode] ?? 'default'}>{trace.mode}</Tag>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="font-mono">{trace.latencyMs}ms</span>
          <span>
            <ClockCircleOutlined className="mr-1" />
            {formatTime(trace.createdAt)}
          </span>
        </div>
      </div>

      {hasSteps && expanded && (
        <div className="mt-4 pl-2">
          <Timeline>
            {trace.steps!.map((step, i) => (
              <TraceStepCard key={i} step={step} index={i} />
            ))}
          </Timeline>
        </div>
      )}

      {hasSteps && !expanded && (
        <div className="mt-2 text-xs text-slate-400">
          {trace.steps!.length} 步骤 · 点击展开
        </div>
      )}
    </Card>
  );
}