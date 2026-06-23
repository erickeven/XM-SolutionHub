import { Card, Tag, Descriptions, Alert, Empty } from 'antd';
import type { TraceIndexJob } from '../../../api/trace';

interface IndexJobCardProps {
  job: TraceIndexJob | null;
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'green',
  RUNNING: 'blue',
  FAILED: 'red',
  PENDING: 'default',
};

export function IndexJobCard({ job }: IndexJobCardProps) {
  if (!job) {
    return (
      <Card title="最近索引任务">
        <Empty description="暂无索引任务" />
      </Card>
    );
  }

  return (
    <Card
      title="最近索引任务"
      extra={<Tag color={STATUS_COLOR[job.status] ?? 'default'}>{job.status}</Tag>}
    >
      {job.status === 'FAILED' && job.errorMessage && (
        <Alert
          type="error"
          message="索引失败"
          description={job.errorMessage}
          showIcon
          className="mb-4"
        />
      )}
      <Descriptions column={2} size="small">
        <Descriptions.Item label="任务ID">{job.id}</Descriptions.Item>
        <Descriptions.Item label="索引版本">{job.indexVersion}</Descriptions.Item>
        <Descriptions.Item label="重试次数">{job.attempts}</Descriptions.Item>
        <Descriptions.Item label="开始时间">{job.startedAt ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="完成时间">{job.finishedAt ?? '—'}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}