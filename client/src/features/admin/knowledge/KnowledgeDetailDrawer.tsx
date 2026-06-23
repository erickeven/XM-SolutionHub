import { Descriptions, Drawer, Skeleton, Statistic, Alert, Typography, Divider } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getKnowledgeById } from '../../../api/knowledge';
import { StatusTag } from './StatusTag';
import { ReindexButton } from './ReindexButton';

const { Text } = Typography;

interface KnowledgeDetailDrawerProps {
  open: boolean;
  docId: string | null;
  onClose: () => void;
}

export function KnowledgeDetailDrawer({
  open,
  docId,
  onClose,
}: KnowledgeDetailDrawerProps) {
  const enabled = open && docId !== null;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['knowledgeDetail', docId],
    queryFn: () => getKnowledgeById(docId!),
    enabled,
  });

  return (
    <Drawer
      title="知识库文档详情"
      open={open}
      onClose={onClose}
      width={520}
      destroyOnClose
    >
      {isLoading && <Skeleton active paragraph={{ rows: 6 }} />}

      {isError && (
        <div className="py-8 text-center">
          <Text type="danger">加载失败</Text>
          <div className="mt-4">
            <a onClick={() => refetch()} className="text-blue-600">
              重试
            </a>
          </div>
        </div>
      )}

      {!isLoading && !isError && data && (
        <div className="space-y-6">
          {data.status === 'FAILED' && data.errorMessage && (
            <Alert
              type="error"
              message="索引失败"
              description={data.errorMessage}
              showIcon
            />
          )}

          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="标题">{data.title}</Descriptions.Item>
            <Descriptions.Item label="来源类型">
              {data.sourceType}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <StatusTag status={data.status} />
            </Descriptions.Item>
            <Descriptions.Item label="索引版本">
              {data.indexVersion ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="索引时间">
              {data.indexedAt ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="素材标题">
              {data.materialTitle ?? '—'}
            </Descriptions.Item>
          </Descriptions>

          <div className="grid grid-cols-3 gap-4">
            <Statistic title="Chunk 数" value={data.chunkCount} />
            <Statistic title="Event 数" value={data.eventCount} />
            <Statistic title="Entity 数" value={data.entityCount} />
          </div>

          {data.latestIndexJob && (
            <>
              <Divider>最近索引任务</Divider>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="任务状态">
                  <StatusTag status={data.latestIndexJob.status} />
                </Descriptions.Item>
                <Descriptions.Item label="索引版本">
                  {data.latestIndexJob.indexVersion}
                </Descriptions.Item>
                <Descriptions.Item label="尝试次数">
                  {data.latestIndexJob.attempts}
                </Descriptions.Item>
                <Descriptions.Item label="开始时间">
                  {data.latestIndexJob.startedAt ?? '—'}
                </Descriptions.Item>
                <Descriptions.Item label="完成时间">
                  {data.latestIndexJob.finishedAt ?? '—'}
                </Descriptions.Item>
                {data.latestIndexJob.errorMessage && (
                  <Descriptions.Item label="错误信息">
                    <Text type="danger">{data.latestIndexJob.errorMessage}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </>
          )}

          <div className="flex justify-end">
            <ReindexButton
              docId={data.id}
              docStatus={data.status}
              size="middle"
              onSuccess={() => refetch()}
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}