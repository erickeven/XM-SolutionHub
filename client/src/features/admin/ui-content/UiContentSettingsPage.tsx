import { useEffect, useState } from 'react';
import { Button, Empty, Form, Input, Modal, Result, Select, Space, Switch, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { UiContentItem } from '../../../api/admin-ui-content';
import {
  useCreateUiContent,
  useUiContentItems,
  useUpdateUiContent,
} from '../../../api/admin-ui-content';

interface FormValues {
  key: string;
  group: string;
  label: string;
  value: string;
  enabled: boolean;
}

function UiContentFormModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: UiContentItem | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateUiContent();
  const updateMutation = useUpdateUiContent();
  const isEdit = Boolean(item);

  useEffect(() => {
    if (!open) return;
    if (item) {
      form.setFieldsValue({
        key: item.key,
        group: item.group,
        label: item.label,
        value: item.value,
        enabled: item.enabled,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ enabled: true });
    }
  }, [form, item, open]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (item) {
        await updateMutation.mutateAsync({
          id: item.id,
          input: {
            group: values.group,
            label: values.label,
            value: values.value,
            enabled: values.enabled,
          },
        });
        message.success('文案已更新');
      } else {
        await createMutation.mutateAsync(values);
        message.success('文案已创建');
      }
      onClose();
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑前端文案' : '新建前端文案'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="保存"
      cancelText="取消"
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={680}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item
            label="文案键"
            name="key"
            rules={[
              { required: true, message: '请输入文案键' },
              { pattern: /^[a-z][A-Za-z0-9_.-]*$/, message: '需以小写字母开头，仅允许字母、数字、点、下划线和短横线' },
            ]}
          >
            <Input disabled={isEdit} placeholder="例如 home.hero.title" />
          </Form.Item>
          <Form.Item label="分组" name="group" rules={[{ required: true, message: '请输入分组' }]}>
            <Input placeholder="例如 home" />
          </Form.Item>
        </div>
        <Form.Item label="后台说明" name="label" rules={[{ required: true, message: '请输入说明' }]}>
          <Input placeholder="例如 首页主标题" />
        </Form.Item>
        <Form.Item label="显示文案" name="value">
          <Input.TextArea rows={5} />
        </Form.Item>
        <Form.Item label="启用" name="enabled" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function UiContentSettingsPage() {
  const { data, isLoading, isError, refetch } = useUiContentItems();
  const updateMutation = useUpdateUiContent();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UiContentItem | null>(null);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<string>();
  const groups = Array.from(new Set((data ?? []).map((item) => item.group))).sort();
  const filteredItems = (data ?? []).filter((item) => {
    if (group && item.group !== group) return false;
    const keyword = search.trim().toLowerCase();
    return (
      !keyword ||
      item.key.toLowerCase().includes(keyword) ||
      item.label.toLowerCase().includes(keyword) ||
      item.value.toLowerCase().includes(keyword)
    );
  });

  const columns: ColumnsType<UiContentItem> = [
    {
      title: '分组',
      dataIndex: 'group',
      key: 'group',
      width: 120,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: '文案键',
      dataIndex: 'key',
      key: 'key',
      width: 240,
      render: (value: string) => (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{value}</code>
      ),
    },
    {
      title: '说明',
      dataIndex: 'label',
      key: 'label',
      width: 180,
    },
    {
      title: '显示文案',
      dataIndex: 'value',
      key: 'value',
      ellipsis: true,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90,
      render: (enabled: boolean, item) => (
        <Switch
          checked={enabled}
          size="small"
          loading={updateMutation.isPending}
          onChange={(next) => updateMutation.mutate({ id: item.id, input: { enabled: next } })}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 110,
      render: (_: unknown, item) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => {
            setSelectedItem(item);
            setModalOpen(true);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Result
          status="error"
          title="加载失败"
          subTitle="无法获取前端文案配置"
          extra={<Button onClick={() => refetch()}>重试</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">前端文案设置</h1>
          <p className="mt-1 text-sm text-slate-500">
            管理公开页面的标题、按钮、状态提示和说明文案
          </p>
        </div>
        <Space>
          <Select
            value={group}
            onChange={setGroup}
            allowClear
            placeholder="全部分组"
            options={groups.map((value) => ({ label: value, value }))}
            className="!w-32"
          />
          <Input.Search
            allowClear
            placeholder="搜索文案键或内容"
            onSearch={setSearch}
            className="!w-56"
          />
          <Button onClick={() => refetch()}>刷新</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedItem(null);
              setModalOpen(true);
            }}
          >
            新建文案
          </Button>
        </Space>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table<UiContentItem>
          columns={columns}
          dataSource={filteredItems}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 条` }}
          locale={{ emptyText: <Empty description="暂无文案配置" /> }}
        />
      </div>

      <UiContentFormModal
        open={modalOpen}
        item={selectedItem}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
