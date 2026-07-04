import { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Tag,
  Empty,
  Result,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { RoleListItem } from '../../../api/admin-roles';
import {
  useRoles,
  useDeleteRole,
} from '../../../api/admin-roles';
import { RoleFormModal } from './RoleFormModal';

export function RoleListPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedRole, setSelectedRole] = useState<RoleListItem | null>(null);

  const { data, isLoading, isError, refetch } = useRoles();
  const deleteMutation = useDeleteRole();

  const handleCreate = () => {
    setSelectedRole(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleEdit = (record: RoleListItem) => {
    setSelectedRole(record);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleDelete = (record: RoleListItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确认删除角色 "${record.name}"？此操作不可恢复，已分配该角色的用户将被解除关联。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await deleteMutation.mutateAsync(record.id);
        message.success('已删除');
      },
    });
  };

  const columns: ColumnsType<RoleListItem> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string, record) => (
        <Space>
          <span className="font-medium">{name}</span>
          {record.isSystem && <Tag color="blue">系统内置</Tag>}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '权限数',
      dataIndex: 'permissionCount',
      key: 'permissionCount',
      width: 100,
      align: 'center',
      render: (v: number) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: '关联用户',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 100,
      align: 'center',
      render: (v: number) => <Tag color="cyan">{v}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: RoleListItem) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.isSystem ? (
            <Tooltip title="系统内置角色不可删除">
              <Button size="small" danger icon={<DeleteOutlined />} disabled>
                删除
              </Button>
            </Tooltip>
          ) : (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              loading={deleteMutation.isPending}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Result
          status="error"
          title="加载失败"
          subTitle="无法获取角色列表"
          extra={
            <Button type="primary" onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">角色管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            管理系统角色与权限分配，系统内置角色仅可调整权限
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建角色
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table<RoleListItem>
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
          locale={{ emptyText: <Empty description="暂无角色" /> }}
        />
      </div>

      <RoleFormModal
        open={modalOpen}
        mode={modalMode}
        role={selectedRole}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
