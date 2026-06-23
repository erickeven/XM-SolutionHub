import { Card, Tag, Statistic, Row, Col, Alert } from 'antd';
import { FileTextOutlined, DatabaseOutlined, BranchesOutlined } from '@ant-design/icons';
import type { TraceDoc } from '../../../api/trace';

interface DocInfoCardProps {
  doc: TraceDoc;
  chunkCount: number;
  eventCount: number;
  entityCount: number;
}

const STATUS_COLOR: Record<string, string> = {
  READY: 'green',
  PROCESSING: 'blue',
  UPLOADED: 'default',
  FAILED: 'red',
};

export function DocInfoCard({ doc, chunkCount, eventCount, entityCount }: DocInfoCardProps) {
  return (
    <Card
      title={doc.title}
      extra={<Tag color={STATUS_COLOR[doc.status] ?? 'default'}>{doc.status}</Tag>}
    >
      {doc.status === 'FAILED' && doc.errorMessage && (
        <Alert
          type="error"
          message="索引失败"
          description={doc.errorMessage}
          showIcon
          className="mb-4"
        />
      )}
      <div className="mb-4 text-sm text-slate-500">
        <span>索引版本: {doc.indexVersion ?? '—'}</span>
      </div>
      <Row gutter={24}>
        <Col span={8}>
          <Statistic title="Chunks" value={chunkCount} prefix={<FileTextOutlined />} />
        </Col>
        <Col span={8}>
          <Statistic title="Events" value={eventCount} prefix={<DatabaseOutlined />} />
        </Col>
        <Col span={8}>
          <Statistic title="Entities" value={entityCount} prefix={<BranchesOutlined />} />
        </Col>
      </Row>
    </Card>
  );
}