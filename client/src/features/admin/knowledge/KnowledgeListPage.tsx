import { useState } from 'react';
import {
  Table,
  Button,
  Select,
  Space,
  Modal,
  message,
  Empty,
  Result,
  Typography,
  Grid,
  Card,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listKnowledge, deleteKnowledge } from '../../../api/knowledge';
import type { KnowledgeDocItem } from '../../../api/knowledge';
import { StatusTag } from './StatusTag';
import { ReindexButton } from './ReindexButton';
import { KnowledgeDetailDrawer } from './KnowledgeDetailDrawer';
import { CreateKnowledgeModal } from './CreateKnowledgeModal';

const { useBreakpoint } = Grid;
const { Text } = Typography;

const STATUS_FILTER_OPTIONS = [
  { label: '全部', value: '' },
  { label: '已上传', value: 'UPLOADED' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '就绪', value: 'READY' },
  { label: '失败', value: 'FAILED' },
];

export function KnowledgeListPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['knowledgeList', page, pageSize, statusFilter],
    queryFn: () =>
      listKnowledge({
        page,
        pageSize,
        status: statusFilter || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteKnowledge(id),
    onSuccess: () => {
      message.success('已删除');
      queryClient.invalidateQueries({ queryKey: ['knowledgeList'] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : '删除失败，请重试';
      message.error(msg);
    },
  });

  const handleView = (record: KnowledgeDocItem) => {
    setSelectedId(record.id);
    setDrawerOpen(true);
  };

  const handleDelete = (record: KnowledgeDocItem) => {
    Modal.confirm({
      title: '确认删除',
      content: '确认删除此知识库文档？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteMutation.mutateAsync(record.id),
    });
  };

  const columns: ColumnsType<KnowledgeDocItem> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 200,
    },
    {
      title: '来源类型',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: '索引版本',
      dataIndex: 'indexVersion',
      key: 'indexVersion',
      width: 140,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '来源资料',
      dataIndex: ['material', 'title'],
      key: 'materialTitle',
      ellipsis: true,
      width: 180,
      render: (_: unknown, record: KnowledgeDocItem) => record.material?.title ?? '—',
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 280,
      render: (_: unknown, record: KnowledgeDocItem) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看详情
          </Button>
          <ReindexButton
            docId={record.id}
            docStatus={record.status}
            onSuccess={() => refetch()}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            loading={deleteMutation.isPending}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <Result
          status="error"
          title="加载失败"
          subTitle="无法获取知识库文档列表"
          extra={
            <Button type="primary" onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">知识库管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            管理知识库文档、索引状态与重建
          </p>
        </div>
        <Space>
          <Select
            value={statusFilter}
            onChange={(v: string) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={STATUS_FILTER_OPTIONS}
            style={{ width: 140 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            新建文档
          </Button>
        </Space>
      </div>

      {/* Desktop: Table */}
      {!isMobile && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table<KnowledgeDocItem>
            columns={columns}
            dataSource={items}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 1020 }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (t) => `共 ${t} 条`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
            locale={{
              emptyText: <Empty description="暂无知识库文档" />,
            }}
          />
        </div>
      )}

      {/* Mobile: Card list */}
      {isMobile && (
        <div className="space-y-3">
          {isLoading &&
            Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} loading>
                <div style={{ height: 80 }} />
              </Card>
            ))}
          {!isLoading && items.length === 0 && (
            <div className="flex justify-center py-16">
              <Empty description="暂无知识库文档" />
            </div>
          )}
          {!isLoading &&
            items.map((item) => (
              <Card key={item.id} size="small" className="!rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Text strong className="flex-1" ellipsis>
                      {item.title}
                    </Text>
                    <StatusTag status={item.status} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <Tag>{item.sourceType}</Tag>
                    {item.indexVersion && <Tag>{item.indexVersion}</Tag>}
                  </div>
                  {item.material?.title && (
                    <Text type="secondary" className="block text-xs">
                      来源资料: {item.material.title}
                    </Text>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleView(item)}
                    >
                      详情
                    </Button>
                    <ReindexButton
                      docId={item.id}
                      docStatus={item.status}
                    />
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(item)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          {!isLoading && total > pageSize && (
            <div className="flex justify-center pt-2">
              <Space>
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </Button>
                <Text>
                  {page} / {Math.ceil(total / pageSize)}
                </Text>
                <Button
                  disabled={page >= Math.ceil(total / pageSize)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </Button>
              </Space>
            </div>
          )}
        </div>
      )}

      {/* Detail Drawer */}
      <KnowledgeDetailDrawer
        open={drawerOpen}
        docId={selectedId}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Create Modal */}
      <CreateKnowledgeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}