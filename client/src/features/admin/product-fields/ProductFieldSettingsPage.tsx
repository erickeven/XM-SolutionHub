import { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Switch,
  Tag,
  Empty,
  Result,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { FieldConfigItem } from '../../../api/admin-product-fields';
import {
  useFieldConfigs,
  useDeleteFieldConfig,
  useToggleFieldConfig,
} from '../../../api/admin-product-fields';
import { ProductFieldFormModal } from './ProductFieldFormModal';

const { Text } = Typography;

const CORE_FIELDS = new Set(['model', 'series', 'status']);

const FIELD_TYPE_LABEL: Record<string, string> = {
  text: '文本',
  number: '数字',
  single_select: '单选',
  multi_select: '多选',
  boolean: '布尔',
};

export function ProductFieldSettingsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedField, setSelectedField] = useState<FieldConfigItem | null>(null);

  const { data, isLoading, isError, refetch } = useFieldConfigs();
  const deleteMutation = useDeleteFieldConfig();
  const toggleMutation = useToggleFieldConfig();

  const handleCreate = () => {
    setSelectedField(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleEdit = (record: FieldConfigItem) => {
    setSelectedField(record);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleDelete = (record: FieldConfigItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确认删除字段 "${record.label}" (${record.fieldKey})？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await deleteMutation.mutateAsync(record.id);
        message.success('已删除');
      },
    });
  };

  const handleToggle = async (record: FieldConfigItem, checked: boolean) => {
    try {
      await toggleMutation.mutateAsync(record.id);
      message.success(checked ? '已启用' : '已禁用');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const columns: ColumnsType<FieldConfigItem> = [
    {
      title: '字段键',
      dataIndex: 'fieldKey',
      key: 'fieldKey',
      width: 180,
      render: (v: string) => (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{v}</code>
      ),
    },
    {
      title: '显示名称',
      dataIndex: 'label',
      key: 'label',
      width: 160,
      render: (v: string, record: FieldConfigItem) => (
        <span>
          {v}
          {CORE_FIELDS.has(record.fieldKey) && (
            <Tag color="blue" className="!ml-2">系统字段</Tag>
          )}
        </span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 100,
      render: (v: string) => <Tag>{FIELD_TYPE_LABEL[v] ?? v}</Tag>,
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 80,
      render: (v: boolean) =>
        v ? <Tag color="red">必填</Tag> : <Tag>可选</Tag>,
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record: FieldConfigItem) => (
        <Switch
          checked={enabled}
          size="small"
          loading={toggleMutation.isPending}
          onChange={(checked) => handleToggle(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: FieldConfigItem) => {
        const isCore = CORE_FIELDS.has(record.fieldKey);
        return (
          <Space size="small">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
            {!isCore && (
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
            {isCore && (
              <Text type="secondary" className="!text-xs">
                核心字段
              </Text>
            )}
          </Space>
        );
      },
    },
  ];

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Result
          status="error"
          title="加载失败"
          subTitle="无法获取字段配置"
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
          <h1 className="text-xl font-bold text-slate-900">产品字段设置</h1>
          <p className="mt-1 text-sm text-slate-500">
            管理产品表单的动态字段配置，型号/系列/状态为内置核心字段不可删除
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建字段
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table<FieldConfigItem>
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
          locale={{ emptyText: <Empty description="暂无字段配置" /> }}
        />
      </div>

      <ProductFieldFormModal
        open={modalOpen}
        mode={modalMode}
        field={selectedField}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
