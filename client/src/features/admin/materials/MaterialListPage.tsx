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
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  UploadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMaterials,
  deleteMaterial,
  updateMaterial,
  getMaterialPreviewUrl,
} from '../../../api/admin-materials';
import { listSolutions } from '../../../api/admin-solutions';
import type {
  AdminMaterialListItem,
  MaterialType,
} from '../../../api/admin-materials';
import { MaterialUploadModal } from './MaterialUploadModal';
import { MaterialEditModal } from './MaterialEditModal';

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
  { label: '上架中', value: 'ACTIVE' },
  { label: '草稿', value: 'DRAFT' },
  { label: '回收站', value: 'INACTIVE' },
];
const TYPE_LABEL: Record<string, string> = {
  datasheet: '数据手册',
  demo_report: 'Demo 报告',
  application_note: '应用笔记',
  other: '其他',
};
const TYPE_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  ...Object.entries(TYPE_LABEL).map(([v, l]) => ({ label: l, value: v })),
];

function FileTypeIcon({ mimeType }: { mimeType?: string }) {
  if (!mimeType) return <FileOutlined />;
  if (mimeType.includes('pdf')) return <FilePdfOutlined style={{ color: '#DC2626' }} />;
  if (mimeType.includes('word') || mimeType.includes('docx'))
    return <FileWordOutlined style={{ color: '#2563EB' }} />;
  return <FileOutlined />;
}

export function MaterialListPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [typeFilter, setTypeFilter] = useState('');
  const [solutionFilter, setSolutionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: solutions } = useQuery({
    queryKey: ['admin-solutions-short'],
    queryFn: () => listSolutions({ page: 1, pageSize: 200 }),
  });
  const solutionOptions = (solutions?.items ?? []).map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'admin-materials',
      page,
      pageSize,
      statusFilter,
      typeFilter,
      solutionFilter,
      search,
    ],
    queryFn: () =>
      listMaterials({
        page,
        pageSize,
        status: (statusFilter || undefined) as 'ACTIVE' | 'DRAFT' | 'INACTIVE' | '' | undefined,
        type: (typeFilter || undefined) as MaterialType | '' | undefined,
        solutionId: solutionFilter || undefined,
        search: search || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMaterial(id),
    onSuccess: () => {
      message.success('已移入回收站');
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '删除失败');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' }) =>
      updateMaterial(id, { status }),
    onSuccess: (_d, vars) => {
      message.success(vars.status === 'ACTIVE' ? '已上架' : '已下架');
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '操作失败');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => updateMaterial(id, { status: 'DRAFT' }),
    onSuccess: () => {
      message.success('已恢复');
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '恢复失败');
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => deleteMaterial(id),
    onSuccess: () => {
      message.success('已彻底删除');
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '删除失败');
    },
  });

  const handleEdit = (record: AdminMaterialListItem) => {
    setSelectedId(record.id);
    setEditOpen(true);
  };

  const handleMoveToRecycle = (record: AdminMaterialListItem) => {
    Modal.confirm({
      title: '移入回收站',
      content: `确定将资料「${record.title}」移入回收站？移入后可在回收站筛选查看。`,
      okText: '移入回收站',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteMutation.mutateAsync(record.id),
    });
  };

  const handleRestore = (record: AdminMaterialListItem) => {
    Modal.confirm({
      title: '恢复资料',
      content: `确定恢复资料「${record.title}」？恢复后将进入草稿状态。`,
      okText: '恢复',
      okType: 'primary',
      cancelText: '取消',
      onOk: () => restoreMutation.mutateAsync(record.id),
    });
  };

  const handlePermanentDelete = (record: AdminMaterialListItem) => {
    Modal.confirm({
      title: '彻底删除',
      content: `确定彻底删除资料「${record.title}」？此操作不可恢复。`,
      okText: '彻底删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => permanentDeleteMutation.mutateAsync(record.id),
    });
  };

  const handleToggle = (record: AdminMaterialListItem) => {
    const next = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const label = next === 'ACTIVE' ? '上架' : '下架';
    Modal.confirm({
      title: `确认${label}`,
      content: `确定要${label}资料「${record.title}」吗？`,
      okText: label,
      okType: 'primary',
      cancelText: '取消',
      onOk: () => statusMutation.mutateAsync({ id: record.id, status: next }),
    });
  };

  const handlePreview = (record: AdminMaterialListItem) => {
    const url = getMaterialPreviewUrl(record.id);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const columns: ColumnsType<AdminMaterialListItem> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 260,
      ellipsis: true,
      render: (v: string, r) => (
        <Space size={6}>
          <FileTypeIcon mimeType={r.mimeType} />
          <span className="font-medium text-slate-900">{v}</span>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (t: string) => (
        <Tag color={t === 'datasheet' ? 'blue' : 'default'}>{TYPE_LABEL[t] ?? t}</Tag>
      ),
    },
    {
      title: '关联',
      key: 'relation',
      width: 180,
      ellipsis: true,
      render: (_: unknown, r) => (
        <div className="text-xs">
          {r.solutionName && <div className="text-slate-700">方案：{r.solutionName}</div>}
          {r.productModel && <div className="text-slate-500">产品：{r.productModel}</div>}
          {!r.solutionName && !r.productModel && <Text type="secondary">—</Text>}
        </div>
      ),
    },
    {
      title: '页数',
      key: 'pages',
      width: 100,
      responsive: ['md'],
      render: (_: unknown, r) =>
        r.pageCount != null ? (
          <Text type="secondary">{r.pageCount} 页（预览 {r.previewPages} 页）</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s: string) => (
        <Tag color={STATUS_TAG_COLOR[s] ?? 'default'}>{STATUS_LABEL[s] ?? s}</Tag>
      ),
    },
    {
      title: '上传时间',
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
      width: 260,
      render: (_: unknown, record: AdminMaterialListItem) => (
        <Space size="small">
          <Tooltip title="预览">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)} />
          </Tooltip>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.status === 'ACTIVE' ? (
            <Button size="small" icon={<StopOutlined />} onClick={() => handleToggle(record)}>
              下架
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              ghost
              icon={<CheckCircleOutlined />}
              onClick={() => handleToggle(record)}
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
          subTitle="无法获取资料列表"
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
          <h1 className="text-xl font-bold text-slate-900">资料管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            管理数据手册、Demo 报告与应用笔记
          </p>
        </div>
        <Space wrap>
          <Select
            value={typeFilter}
            onChange={(v: string) => {
              setTypeFilter(v);
              setPage(1);
            }}
            options={TYPE_FILTER_OPTIONS}
            style={{ width: 120 }}
          />
          <Select
            value={statusFilter}
            onChange={(v: string) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={STATUS_FILTER_OPTIONS}
            style={{ width: 120 }}
          />
          <Select
            value={solutionFilter}
            onChange={(v: string) => {
              setSolutionFilter(v);
              setPage(1);
            }}
            options={[{ label: '全部方案', value: '' }, ...solutionOptions]}
            placeholder="按方案筛选"
            style={{ width: 180 }}
            allowClear
            showSearch
            optionFilterProp="label"
          />
          <Input.Search
            placeholder="搜索标题"
            allowClear
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            style={{ width: 200 }}
          />
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setUploadOpen(true)}
          >
            上传资料
          </Button>
        </Space>
      </div>

      {!isMobile && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table<AdminMaterialListItem>
            columns={columns}
            dataSource={items}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 1200 }}
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
            locale={{ emptyText: <Empty description="暂无资料" /> }}
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
              <Empty description="暂无资料" />
            </div>
          )}
          {!isLoading &&
            items.map((item) => (
              <Card key={item.id} size="small" className="!rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Space size={6} className="flex-1">
                      <FileTypeIcon mimeType={item.mimeType} />
                      <Text strong ellipsis className="flex-1">
                        {item.title}
                      </Text>
                    </Space>
                    <Tag color={STATUS_TAG_COLOR[item.status] ?? 'default'}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Tag>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <Tag>{TYPE_LABEL[item.type] ?? item.type}</Tag>
                    {item.pageCount != null && <span>{item.pageCount} 页</span>}
                    <span>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreview(item)}>
                      预览
                    </Button>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(item)}>
                      编辑
                    </Button>
                    {item.status === 'ACTIVE' ? (
                      <Button size="small" icon={<StopOutlined />} onClick={() => handleToggle(item)}>
                        下架
                      </Button>
                    ) : (
                      <Button size="small" type="primary" ghost icon={<CheckCircleOutlined />} onClick={() => handleToggle(item)}>
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

      <MaterialUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <MaterialEditModal
        open={editOpen}
        materialId={selectedId}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}
