import { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  DatePicker,
  Empty,
  Result,
  Typography,
  Grid,
  Card,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { listAuditLogs, exportAuditLogs } from '../../../api/audit';
import type { AuditLogItem } from '../../../api/audit';

const { useBreakpoint } = Grid;
const { RangePicker } = DatePicker;
const { Text } = Typography;

export function AuditLogPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const queryParams = {
    actorId: actorId || undefined,
    action: action || undefined,
    targetType: targetType || undefined,
    startDate: dateRange?.[0] ?? undefined,
    endDate: dateRange?.[1] ?? undefined,
    page,
    limit: pageSize,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['auditLogs', queryParams],
    queryFn: () => listAuditLogs(queryParams),
  });

  const handleExport = async () => {
    try {
      const blob = await exportAuditLogs(queryParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const columns: ColumnsType<AuditLogItem> = [
    {
      title: '操作人ID',
      dataIndex: 'actorId',
      key: 'actorId',
      width: 200,
      ellipsis: true,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 160,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '目标类型',
      dataIndex: 'targetType',
      key: 'targetType',
      width: 120,
    },
    {
      title: '目标ID',
      dataIndex: 'targetId',
      key: 'targetId',
      width: 200,
      ellipsis: true,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
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
          subTitle="无法获取审计日志"
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
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">审计日志</h1>
          <p className="mt-1 text-sm text-slate-500">
            查看系统操作记录与变更历史
          </p>
        </div>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出 CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="操作人ID"
          allowClear
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
          style={{ width: 180 }}
        />
        <Input
          placeholder="操作类型"
          allowClear
          value={action}
          onChange={(e) => setAction(e.target.value)}
          style={{ width: 160 }}
        />
        <Input
          placeholder="目标类型"
          allowClear
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          style={{ width: 140 }}
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
          }}
        />
        <Button
          onClick={() => {
            setPage(1);
            refetch();
          }}
        >
          查询
        </Button>
      </div>

      {/* Desktop: Table */}
      {!isMobile && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table<AuditLogItem>
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
            locale={{
              emptyText: <Empty description="暂无审计日志" />,
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
              <Empty description="暂无审计日志" />
            </div>
          )}
          {!isLoading &&
            items.map((item) => (
              <Card key={item.id} size="small" className="!rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Tag>{item.action}</Tag>
                    <span className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <div>操作人: {item.actorId ?? '—'}</div>
                    <div>目标: {item.targetType} {item.targetId ?? ''}</div>
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
    </div>
  );
}
