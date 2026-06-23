import { Tag } from 'antd';

interface StatusTagProps {
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  UPLOADED: '已上传',
  PROCESSING: '处理中',
  READY: '就绪',
  FAILED: '失败',
  PENDING: '等待中',
  SUCCEEDED: '成功',
};

const STATUS_COLORS: Record<string, string> = {
  UPLOADED: 'default',
  PROCESSING: 'processing',
  READY: 'success',
  FAILED: 'error',
  PENDING: 'warning',
  SUCCEEDED: 'success',
};

export function StatusTag({ status }: StatusTagProps) {
  const label = STATUS_LABELS[status] ?? status;
  const color = STATUS_COLORS[status] ?? 'default';
  return <Tag color={color}>{label}</Tag>;
}