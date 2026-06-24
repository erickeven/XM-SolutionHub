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
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listUsers, deleteUser, updateUser } from '../../../api/users';
import type { UserListItem } from '../../../api/users';
import { UserFormModal } from './UserFormModal';

const { useBreakpoint } = Grid;
const { Text } = Typography;

const ROLE_TAG_COLOR: Record<string, string> = {
  ADMIN: 'red',
  AUDITOR: 'orange',
  STAFF: 'blue',
  USER: 'default',
};

const STATUS_TAG_COLOR: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'red',
  DRAFT: 'default',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '管理员',
  AUDITOR: '审核员',
  STAFF: '员工',
  USER: '普通用户',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '启用',
  INACTIVE: '禁用',
  DRAFT: '草稿',
};

const ROLE_FILTER_OPTIONS = [
  { label: '全部', value: '' },
  { label: '普通用户', value: 'USER' },
  { label: '员工', value: 'STAFF' },
  { label: '审核员', value: 'AUDITOR' },
  { label: '管理员', value: 'ADMIN' },
];

const STATUS_FILTER_OPTIONS = [
  { label: '全部', value: '' },
  { label: '启用', value: 'ACTIVE' },
  { label: '禁用', value: 'INACTIVE' },
];

export function UserListPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', page, pageSize, roleFilter, statusFilter, search],
    queryFn: () =>
      listUsers({
        page,
        pageSize,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      message.success('已删除');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : '删除失败';
      message.error(msg);
    },
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => updateUser(id, { status: 'INACTIVE' }),
    onSuccess: () => {
      message.success('已禁用，该用户所有会话已强制退出');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : '禁用失败';
      message.error(msg);
    },
  });

  const handleEdit = (record: UserListItem) => {
    setSelectedUser(record);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleDisable = (record: UserListItem) => {
    Modal.confirm({
      title: '确认禁用',
      content: '禁用后该用户所有会话将被强制退出。',
      okText: '禁用',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => disableMutation.mutateAsync(record.id),
    });
  };

  const handleDelete = (record: UserListItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确认删除用户 ${record.email}？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteMutation.mutateAsync(record.id),
    });
  };

  const columns: ColumnsType<UserListItem> = [
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      width: 240,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={ROLE_TAG_COLOR[role] ?? 'default'}>
          {ROLE_LABEL[role] ?? role}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={STATUS_TAG_COLOR[status] ?? 'default'}>
          {STATUS_LABEL[status] ?? status}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_: unknown, record: UserListItem) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.status === 'ACTIVE' && (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => handleDisable(record)}
              loading={disableMutation.isPending}
            >
              禁用
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
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <Result
          status="error"
          title="加载失败"
          subTitle="无法获取用户列表"
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
          <h1 className="text-xl font-bold text-slate-900">用户管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            管理系统用户、角色与状态
          </p>
        </div>
        <Space wrap>
          <Select
            value={roleFilter}
            onChange={(v: string) => {
              setRoleFilter(v);
              setPage(1);
            }}
            options={ROLE_FILTER_OPTIONS}
            style={{ width: 120 }}
          />
          <Select
            value={statusFilter}
            onChange={(v: string) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={STATUS_FILTER_OPTIONS}
            style={{ width: 100 }}
          />
          <Input.Search
            placeholder="搜索邮箱"
            allowClear
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            style={{ width: 200 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新建用户
          </Button>
        </Space>
      </div>

      {/* Desktop: Table */}
      {!isMobile && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table<UserListItem>
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
              emptyText: <Empty description="暂无用户" />,
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
              <Empty description="暂无用户" />
            </div>
          )}
          {!isLoading &&
            items.map((item) => (
              <Card key={item.id} size="small" className="!rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Text strong className="flex-1" ellipsis>
                      {item.email}
                    </Text>
                    <Tag color={STATUS_TAG_COLOR[item.status] ?? 'default'}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Tag>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <Tag color={ROLE_TAG_COLOR[item.role] ?? 'default'}>
                      {ROLE_LABEL[item.role] ?? item.role}
                    </Tag>
                    <span>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(item)}
                    >
                      编辑
                    </Button>
                    {item.status === 'ACTIVE' && (
                      <Button
                        size="small"
                        danger
                        icon={<StopOutlined />}
                        onClick={() => handleDisable(item)}
                      >
                        禁用
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

      {/* Form Modal */}
      <UserFormModal
        open={modalOpen}
        mode={modalMode}
        user={selectedUser}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
