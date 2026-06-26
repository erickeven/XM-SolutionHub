import { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  message,
  Empty,
  Result,
  Typography,
  Grid,
  Card,
  Tag,
  Input,
  Select,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSolutions,
  deleteSolution,
  updateSolution,
} from '../../../api/admin-solutions';
import type { AdminSolutionListItem } from '../../../api/admin-solutions';
import { SolutionFormModal } from './SolutionFormModal';

const { useBreakpoint } = Grid;
const { Text, Paragraph } = Typography;

const STATUS_TAG_COLOR: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'red',
  DRAFT: 'default',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '上架',
  INACTIVE: '下架',
  DRAFT: '草稿',
};

const STATUS_FILTER_OPTIONS = [
  { label: '上架中', value: 'ACTIVE' },
  { label: '草稿', value: 'DRAFT' },
  { label: '回收站', value: 'INACTIVE' },
];

export function SolutionListPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-solutions', page, pageSize, statusFilter, search],
    queryFn: () =>
      listSolutions({
        page,
        pageSize,
        status: (statusFilter || undefined) as 'ACTIVE' | 'DRAFT' | 'INACTIVE' | '' | undefined,
        search: search || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSolution(id),
    onSuccess: () => {
      message.success('已移入回收站');
      queryClient.invalidateQueries({ queryKey: ['admin-solutions'] });
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '删除失败');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' }) =>
      updateSolution(id, { status }),
    onSuccess: (_d, vars) => {
      message.success(vars.status === 'ACTIVE' ? '已上架' : '已下架');
      queryClient.invalidateQueries({ queryKey: ['admin-solutions'] });
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '操作失败');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => updateSolution(id, { status: 'DRAFT' }),
    onSuccess: () => {
      message.success('已恢复');
      queryClient.invalidateQueries({ queryKey: ['admin-solutions'] });
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '恢复失败');
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => deleteSolution(id),
    onSuccess: () => {
      message.success('已彻底删除');
      queryClient.invalidateQueries({ queryKey: ['admin-solutions'] });
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '删除失败');
    },
  });

  const handleEdit = (record: AdminSolutionListItem) => {
    setSelectedId(record.id);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedId(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleToggleStatus = (record: AdminSolutionListItem) => {
    const next = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const label = next === 'ACTIVE' ? '上架' : '下架';
    Modal.confirm({
      title: `确认${label}`,
      content: `确定要${label}方案「${record.name}」吗？`,
      okText: label,
      okType: 'primary',
      cancelText: '取消',
      onOk: () => statusMutation.mutateAsync({ id: record.id, status: next }),
    });
  };

  const handleMoveToRecycle = (record: AdminSolutionListItem) => {
    Modal.confirm({
      title: '移入回收站',
      content: `确定将方案「${record.name}」移入回收站？移入后可在回收站筛选查看。`,
      okText: '移入回收站',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteMutation.mutateAsync(record.id),
    });
  };

  const handleRestore = (record: AdminSolutionListItem) => {
    Modal.confirm({
      title: '恢复方案',
      content: `确定恢复方案「${record.name}」？恢复后将进入草稿状态。`,
      okText: '恢复',
      okType: 'primary',
      cancelText: '取消',
      onOk: () => restoreMutation.mutateAsync(record.id),
    });
  };

  const handlePermanentDelete = (record: AdminSolutionListItem) => {
    Modal.confirm({
      title: '彻底删除',
      content: `确定彻底删除方案「${record.name}」？此操作不可恢复。`,
      okText: '彻底删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => permanentDeleteMutation.mutateAsync(record.id),
    });
  };

  const columns: ColumnsType<AdminSolutionListItem> = [
    {
      title: '方案名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      ellipsis: true,
      render: (v: string) => <span className="font-semibold text-slate-900">{v}</span>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v: string) => (
        <Text type="secondary" ellipsis>
          {v}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => (
        <Tag color={STATUS_TAG_COLOR[status] ?? 'default'}>
          {STATUS_LABEL[status] ?? status}
        </Tag>
      ),
    },
    {
      title: '关联产品',
      key: 'products',
      width: 180,
      render: (_: unknown, record: AdminSolutionListItem) => {
        const count = record.productCount ?? 0;
        if (count === 0) return <span className="text-slate-400">-</span>;
        return (
          <Space size={4} wrap>
            <Tag>{count} 个</Tag>
          </Space>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
      responsive: ['lg'],
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 220,
      render: (_: unknown, record: AdminSolutionListItem) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.status === 'ACTIVE' ? (
            <Button
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleToggleStatus(record)}
              loading={statusMutation.isPending}
            >
              下架
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              ghost
              icon={<CheckCircleOutlined />}
              onClick={() => handleToggleStatus(record)}
              loading={statusMutation.isPending}
            >
              上架
            </Button>
          )}
          {record.status === 'INACTIVE' ? (
            <>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => handleRestore(record)}
                loading={restoreMutation.isPending}
              >
                恢复
              </Button>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handlePermanentDelete(record)}
                loading={permanentDeleteMutation.isPending}
              >
                彻底删除
              </Button>
            </>
          ) : (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleMoveToRecycle(record)}
              loading={deleteMutation.isPending}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Result
          status="error"
          title="加载失败"
          subTitle="无法获取方案列表"
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">方案管理</h1>
          <p className="mt-1 text-sm text-slate-500">管理应用方案、描述与关联产品</p>
        </div>
        <Space wrap>
          <Select
            value={statusFilter}
            onChange={(v: string) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={STATUS_FILTER_OPTIONS}
            style={{ width: 120 }}
          />
          <Input.Search
            placeholder="搜索方案"
            allowClear
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            style={{ width: 200 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建方案
          </Button>
        </Space>
      </div>

      {!isMobile && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table<AdminSolutionListItem>
            columns={columns}
            dataSource={items}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 900 }}
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
            locale={{ emptyText: <Empty description="暂无方案" /> }}
          />
        </div>
      )}

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
              <Empty description="暂无方案" />
            </div>
          )}
          {!isLoading &&
            items.map((item) => (
              <Card key={item.id} size="small" className="!rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Text strong className="flex-1" ellipsis>
                      {item.name}
                    </Text>
                    <Tag color={STATUS_TAG_COLOR[item.status] ?? 'default'}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Tag>
                  </div>
                  <Paragraph ellipsis={{ rows: 2 }} className="!mb-0 !text-xs !text-slate-500">
                    {item.description}
                  </Paragraph>
                  <div className="flex gap-2 pt-1">
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(item)}>
                      编辑
                    </Button>
                    {item.status === 'ACTIVE' ? (
                      <Button size="small" icon={<StopOutlined />} onClick={() => handleToggleStatus(item)}>
                        下架
                      </Button>
                    ) : (
                      <Button size="small" type="primary" ghost icon={<CheckCircleOutlined />} onClick={() => handleToggleStatus(item)}>
                        上架
                      </Button>
                    )}
                    {item.status === 'INACTIVE' ? (
                      <>
                        <Button size="small" icon={<ReloadOutlined />} onClick={() => handleRestore(item)}>
                          恢复
                        </Button>
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handlePermanentDelete(item)}>
                          彻底删除
                        </Button>
                      </>
                    ) : (
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleMoveToRecycle(item)}>
                        删除
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          {!isLoading && total > pageSize && (
            <div className="flex justify-center pt-2">
              <Space>
                <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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

      <SolutionFormModal
        open={modalOpen}
        mode={modalMode}
        solutionId={selectedId}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
