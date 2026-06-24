import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton, Result, Empty, Button, Typography, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getTrace } from '../../../api/trace';
import { useAuth } from '../../../hooks/useAuth';
import { DocInfoCard } from './DocInfoCard';
import { IndexJobCard } from './IndexJobCard';
import { TraceRecordCard } from './TraceRecordCard';

export function TraceDebugPage() {
  const { docId } = useParams<{ docId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Non-admin redirect
  if (user && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  // Still loading user info — show skeleton
  if (!user) {
    return <Skeleton active />;
  }

  if (!docId) {
    return (
      <Result
        status="error"
        title="缺少文档ID"
        subTitle="URL 中未提供 docId 参数"
      />
    );
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trace', docId],
    queryFn: () => getTrace(docId),
    enabled: !!docId,
  });

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (isError) {
    return (
      <Result
        status="error"
        title="加载失败"
        subTitle="无法获取检索追踪数据"
        extra={
          <Button type="primary" onClick={() => refetch()}>
            重试
          </Button>
        }
      />
    );
  }

  if (!data) {
    return <Empty description="无数据" />;
  }

  return (
    <div className="space-y-4">
      <Space>
        <Button
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
        >
          返回
        </Button>
        <Typography.Title level={4} className="!mb-0">
          检索追踪调试
        </Typography.Title>
      </Space>

      <DocInfoCard
        doc={data.doc}
        chunkCount={data.chunkCount}
        eventCount={data.eventCount}
        entityCount={data.entityCount}
      />

      <IndexJobCard job={data.latestIndexJob} />

      <div>
        <Typography.Title level={5}>最近检索记录</Typography.Title>
        {data.recentTraces.length === 0 ? (
          <Empty description="暂无检索记录" />
        ) : (
          data.recentTraces.map((trace) => (
            <TraceRecordCard key={trace.id} trace={trace} />
          ))
        )}
      </div>
    </div>
  );
}
