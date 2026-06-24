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
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listProducts,
  deleteProduct,
  updateProduct,
} from '../../../api/admin-products';
import type { AdminProductListItem } from '../../../api/admin-products';
import { ProductFormModal } from './ProductFormModal';

const { useBreakpoint } = Grid;
const { Text } = Typography;

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
  { label: '全部', value: '' },
  { label: '上架', value: 'ACTIVE' },
  { label: '草稿', value: 'DRAFT' },
  { label: '下架', value: 'INACTIVE' },
];

export function ProductListPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-products', page, pageSize, statusFilter, search],
    queryFn: () =>
      listProducts({
        page,
        pageSize,
        status: (statusFilter || undefined) as 'ACTIVE' | 'DRAFT' | 'INACTIVE' | '' | undefined,
        search: search || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      message.success('已删除');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '删除失败');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      updateProduct(id, { status }),
    onSuccess: (_d, vars) => {
      message.success(vars.status === 'ACTIVE' ? '已上架' : '已下架');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '操作失败');
    },
  });

  const handleEdit = (record: AdminProductListItem) => {
    setSelectedId(record.id);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedId(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleToggleStatus = (record: AdminProductListItem) => {
    const next = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const label = next === 'ACTIVE' ? '上架' : '下架';
    Modal.confirm({
      title: `确认${label}`,
      content: `确定要${label} ${record.model} 吗？`,
      okText: label,
      okType: 'primary',
      cancelText: '取消',
      onOk: () => statusMutation.mutateAsync({ id: record.id, status: next }),
    });
  };

  const handleDelete = (record: AdminProductListItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确认删除产品 ${record.model}？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteMutation.mutateAsync(record.id),
    });
  };

  const columns: ColumnsType<AdminProductListItem> = [
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      width: 140,
      render: (v: string, r) => (
        <div>
          <div className="font-semibold text-slate-900">{v}</div>
          <div className="text-xs text-slate-500">{r.series}</div>
        </div>
      ),
    },
    {
      title: '系列',
      dataIndex: 'series',
      key: 'series',
      width: 120,
      ellipsis: true,
      responsive: ['md'],
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
      title: '关键参数',
      key: 'params',
      width: 260,
      responsive: ['md'],
      render: (_: unknown, r: AdminProductListItem) => {
        const p = r.params ?? {};
        const pieces: string[] = [];
        if (p.outputVoltage != null) pieces.push(`${p.outputVoltage}V`);
        if (p.outputCurrent != null) pieces.push(`${p.outputCurrent}A`);
        if (p.inputVoltageMin != null && p.inputVoltageMax != null) {
          pieces.push(`${p.inputVoltageMin}-${p.inputVoltageMax}VAC`);
        }
        return <Text type="secondary">{pieces.join(' · ') || '—'}</Text>;
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
      render: (_: unknown, record: AdminProductListItem) => (
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
      <div className="flex min-h-[400px] items-center justify-center">
        <Result
          status="error"
          title="加载失败"
          subTitle="无法获取产品列表"
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">产品管理</h1>
          <p className="mt-1 text-sm text-slate-500">管理产品型号、参数与上架状态</p>
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
            placeholder="搜索型号/系列"
            allowClear
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            style={{ width: 200 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建产品
          </Button>
        </Space>
      </div>

      {/* Desktop: Table */}
      {!isMobile && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table<AdminProductListItem>
            columns={columns}
            dataSource={items}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 1000 }}
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
            locale={{ emptyText: <Empty description="暂无产品" /> }}
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
              <Empty description="暂无产品" />
            </div>
          )}
          {!isLoading &&
            items.map((item) => (
              <Card key={item.id} size="small" className="!rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Text strong className="block">
                        {item.model}
                      </Text>
                      <Text type="secondary" className="!text-xs">
                        {item.series}
                      </Text>
                    </div>
                    <Tag color={STATUS_TAG_COLOR[item.status] ?? 'default'}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Tag>
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.params
                      ? [
                          item.params.outputVoltage != null && `${item.params.outputVoltage}V`,
                          item.params.outputCurrent != null && `${item.params.outputCurrent}A`,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : '—'}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(item)}>
                      编辑
                    </Button>
                    {item.status === 'ACTIVE' ? (
                      <Button
                        size="small"
                        icon={<StopOutlined />}
                        onClick={() => handleToggleStatus(item)}
                      >
                        下架
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleToggleStatus(item)}
                      >
                        上架
                      </Button>
                    )}
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

      <ProductFormModal
        open={modalOpen}
        mode={modalMode}
        productId={selectedId}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
