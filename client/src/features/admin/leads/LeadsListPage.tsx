import { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Empty,
  Result,
  Typography,
  Grid,
  Card,
  Skeleton,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import {
  listLeads,
  exportLeads,
} from '../../../api/leads';
import type { LeadItem, ListLeadsParams } from '../../../api/leads';
import { AssignLeadModal } from './AssignLeadModal';
import { StatusTransition } from './StatusTransition';
import { LeadEventsDrawer } from './LeadEventsDrawer';
import { LeadRowExpanded } from './LeadRowExpanded';
import { LeadCardView } from './LeadCardView';

const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;
const { Text } = Typography;

const STATUS_TAG_COLOR: Record<string, string> = {
  NEW: 'default',
  ASSIGNED: 'blue',
  FOLLOWING: 'cyan',
  CONVERTED: 'green',
  ABANDONED: 'red',
};

const STATUS_LABEL: Record<string, string> = {
  NEW: '新建',
  ASSIGNED: '已分配',
  FOLLOWING: '跟进中',
  CONVERTED: '已转化',
  ABANDONED: '已放弃',
};

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '新建', value: 'NEW' },
  { label: '已分配', value: 'ASSIGNED' },
  { label: '跟进中', value: 'FOLLOWING' },
  { label: '已转化', value: 'CONVERTED' },
  { label: '已放弃', value: 'ABANDONED' },
];

export function LeadsListPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { user } = useAuth();
  const userRole = user?.role ?? 'USER';

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [scoreMin, setScoreMin] = useState<number | null>(null);
  const [scoreMax, setScoreMax] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [search, setSearch] = useState('');

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLeadId, setAssignLeadId] = useState<string | null>(null);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventsLeadId, setEventsLeadId] = useState<string | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const queryParams: ListLeadsParams = {
    page,
    pageSize,
    status: statusFilter || undefined,
    scoreMin: scoreMin ?? undefined,
    scoreMax: scoreMax ?? undefined,
    startDate: dateRange?.[0] ?? undefined,
    endDate: dateRange?.[1] ?? undefined,
    search: search || undefined,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['leads', queryParams],
    queryFn: () => listLeads(queryParams),
  });

  const handleExport = async () => {
    try {
      const blob = await exportLeads(queryParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const handleAssign = (record: LeadItem) => {
    setAssignLeadId(record.id);
    setAssignOpen(true);
  };

  const handleViewEvents = (leadId: string) => {
    setEventsLeadId(leadId);
    setEventsOpen(true);
  };

  const canAssign = userRole === 'AUDITOR' || userRole === 'ADMIN';
  const canExport = canAssign;

  const columns: ColumnsType<LeadItem> = [
    {
      title: '用户/邮箱',
      key: 'user',
      width: 200,
      ellipsis: true,
      render: (_: unknown, record: LeadItem) =>
        record.email ?? record.userId ?? record.anonymousId ?? '匿名用户',
    },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      sorter: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={STATUS_TAG_COLOR[status] ?? 'default'}>
          {STATUS_LABEL[status] ?? status}
        </Tag>
      ),
    },
    {
      title: '分配给',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 140,
      ellipsis: true,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '最后活跃',
      dataIndex: 'lastActiveAt',
      key: 'lastActiveAt',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 240,
      render: (_: unknown, record: LeadItem) => (
        <Space size="small">
          {canAssign && (
            <Button
              size="small"
              onClick={() => handleAssign(record)}
            >
              分配
            </Button>
          )}
          <StatusTransition
            currentStatus={record.status}
            leadId={record.id}
            userRole={userRole}
          />
          <Button
            size="small"
            onClick={() => handleViewEvents(record.id)}
          >
            活动记录
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
          subTitle="无法获取线索列表"
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
          <h1 className="text-xl font-bold text-slate-900">线索管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            管理用户线索、分配与状态跟踪
          </p>
        </div>
        {canExport && (
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出 CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          value={statusFilter}
          onChange={(v: string) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          style={{ width: 120 }}
        />
        <InputNumber
          placeholder="最低分"
          min={0}
          max={100}
          value={scoreMin ?? undefined}
          onChange={(v) => {
            setScoreMin(v as number | null);
            setPage(1);
          }}
          style={{ width: 100 }}
        />
        <InputNumber
          placeholder="最高分"
          min={0}
          max={100}
          value={scoreMax ?? undefined}
          onChange={(v) => {
            setScoreMax(v as number | null);
            setPage(1);
          }}
          style={{ width: 100 }}
        />
        <RangePicker
          showTime
          onChange={(_, dateStrings) => {
            if (dateStrings[0] && dateStrings[1]) {
              setDateRange([
                new Date(dateStrings[0]).toISOString(),
                new Date(dateStrings[1]).toISOString(),
              ]);
            } else {
              setDateRange(null);
            }
            setPage(1);
          }}
        />
        <Input.Search
          placeholder="搜索用户/邮箱"
          allowClear
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          style={{ width: 200 }}
        />
      </div>

      {/* Desktop: Table */}
      {!isMobile && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {isLoading ? (
            <div className="p-4">
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          ) : (
            <Table<LeadItem>
              columns={columns}
              dataSource={items}
              rowKey="id"
              scroll={{ x: 1000 }}
              expandable={{
                expandedRowKeys,
                onExpandedRowsChange: (keys) =>
                  setExpandedRowKeys(keys as string[]),
                expandedRowRender: (record) => (
                  <LeadRowExpanded
                    events={record.events ?? []}
                    onViewAll={() => handleViewEvents(record.id)}
                  />
                ),
              }}
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
                emptyText: <Empty description="暂无线索" />,
              }}
            />
          )}
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
              <Empty description="暂无线索" />
            </div>
          )}
          {!isLoading && items.length > 0 && (
            <LeadCardView
              items={items}
              userRole={userRole}
              onAssign={handleAssign}
              onViewEvents={handleViewEvents}
            />
          )}
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

      {/* Assign Modal */}
      <AssignLeadModal
        open={assignOpen}
        leadId={assignLeadId}
        onClose={() => setAssignOpen(false)}
      />

      {/* Events Drawer */}
      <LeadEventsDrawer
        open={eventsOpen}
        leadId={eventsLeadId}
        onClose={() => setEventsOpen(false)}
      />
    </div>
  );
}