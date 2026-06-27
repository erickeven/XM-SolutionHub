import { useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, Switch, message, Tag, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, CloseCircleOutlined, EditOutlined, ApiOutlined } from '@ant-design/icons';
import type { AiProviderItem, AiPromptItem } from '../../../api/admin-ai-settings';
import { useProviders, usePrompts, useUpdateProvider, useUpdatePrompt, useTestConnection } from '../../../api/admin-ai-settings';

function ProviderEditModal({
  open,
  record,
  onClose,
}: {
  open: boolean;
  record: AiProviderItem | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  const updateMutation = useUpdateProvider();
  const testMutation = useTestConnection();

  if (!record) return null;

  const handleSave = async () => {
    const values = await form.validateFields();
    // Clean payload: remove empty apiKeyPlaintext so backend doesn't try to encrypt an empty string
    const payload = { ...values };
    if (payload.apiKeyPlaintext === '' || payload.apiKeyPlaintext === undefined) {
      delete payload.apiKeyPlaintext;
    }
    await updateMutation.mutateAsync({ id: record.id, input: payload });
    message.success('已保存');
    onClose();
  };

  const handleTest = async () => {
    const values = form.getFieldsValue();
    const rawKey = values.apiKeyPlaintext;
    if (!rawKey && record.apiKeyMasked) {
      message.info('请输入新 API Key 测试当前表单配置，或保存后测试已保存配置');
      return;
    }
    try {
      const result = await testMutation.mutateAsync({
        providerType: record.providerType as 'llm' | 'embedding' | 'rerank',
        baseUrl: values.baseUrl ?? undefined,
        apiKey: rawKey ?? undefined,
        model: values.model ?? undefined,
      });
      if (result.success) {
        message.success(`连接成功, 延迟 ${result.latencyMs}ms`);
      } else {
        message.error(result.error ?? '连接失败');
      }
    } catch {
      message.error('连接测试失败，请检查接口地址和 API Key');
    }
  };

  return (
    <Modal
      title={`编辑 - ${record.name}`}
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={updateMutation.isPending}
      footer={(_, { OkBtn, CancelBtn }) => (
        <Space>
          <Button onClick={handleTest} loading={testMutation.isPending} icon={<ApiOutlined />}>
            测试连接
          </Button>
          <CancelBtn />
          <OkBtn />
        </Space>
      )}
    >
      <Form form={form} layout="vertical" initialValues={record}>
        <Form.Item label="名称" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="接口地址" name="baseUrl">
          <Input placeholder="https://api.example.com/v1" />
        </Form.Item>
        <Form.Item label="API Key" name="apiKeyPlaintext">
          <Input.Password placeholder={record.apiKeyMasked ?? '留空不修改'} />
        </Form.Item>
        <Form.Item label="模型" name="model">
          <Input placeholder="gpt-4o" />
        </Form.Item>
        {record.providerType === 'embedding' && (
          <Form.Item label="向量维度" name="dimensions">
            <InputNumber min={64} max={8192} />
          </Form.Item>
        )}
        <Form.Item label="启用" name="enabled" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="设为默认" name="isDefault" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function PromptEditModal({
  open,
  record,
  onClose,
}: {
  open: boolean;
  record: AiPromptItem | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  const updateMutation = useUpdatePrompt();

  if (!record) return null;

  const handleSave = async () => {
    const values = await form.validateFields();
    await updateMutation.mutateAsync({ id: record.id, input: values });
    message.success('已保存');
    onClose();
  };

  return (
    <Modal
      title={`编辑提示词 - ${record.title}`}
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={updateMutation.isPending}
      width={720}
    >
      <Form form={form} layout="vertical" initialValues={record}>
        <Form.Item label="标题" name="title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="内容" name="content" rules={[{ required: true }]}>
          <Input.TextArea rows={8} />
        </Form.Item>
        <Form.Item label="启用" name="enabled" valuePropName="checked">
          <Switch />
        </Form.Item>
        <div className="text-xs text-gray-400">版本: {record.version}</div>
      </Form>
    </Modal>
  );
}

export function AiSettingsPage() {
  const [activeTab, setActiveTab] = useState('llm');
  const [editProvider, setEditProvider] = useState<AiProviderItem | null>(null);
  const [editPrompt, setEditPrompt] = useState<AiPromptItem | null>(null);

  const { data: providers, isLoading: loadingProviders } = useProviders();
  const { data: prompts, isLoading: loadingPrompts } = usePrompts();

  const filteredProviders = (providers ?? []).filter((p) => p.providerType === activeTab);

  const providerColumns: ColumnsType<AiProviderItem> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '接口地址', dataIndex: 'baseUrl', key: 'baseUrl', ellipsis: true,
      render: (v: string | null) => v ?? '-' },
    {
      title: 'API Key',
      dataIndex: 'apiKeyMasked',
      key: 'apiKeyMasked',
      render: (v: string | null) => (v ? <code>{v}</code> : <span className="text-gray-400">-</span>),
    },
    { title: '模型', dataIndex: 'model', key: 'model', render: (v: string | null) => v ?? '-' },
    {
      title: '默认',
      dataIndex: 'isDefault',
      key: 'isDefault',
      width: 60,
      render: (v: boolean) =>
        v ? <Tag color="gold">默认</Tag> : null,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 70,
      render: (v: boolean) =>
        v ? <CheckCircleOutlined className="text-green-500" /> : <CloseCircleOutlined className="text-red-400" />,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: AiProviderItem) => (
        <Tooltip title="编辑">
          <Button type="link" icon={<EditOutlined />} onClick={() => setEditProvider(record)} />
        </Tooltip>
      ),
    },
  ];

  const promptColumns: ColumnsType<AiPromptItem> = [
    { title: '标识', dataIndex: 'key', key: 'key', width: 140 },
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (v: string) => <span className="text-gray-500 text-xs">{v}</span>,
    },
    { title: '版本', dataIndex: 'version', key: 'version', width: 60, align: 'center' as const },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 70,
      render: (v: boolean) =>
        v ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: AiPromptItem) => (
        <Tooltip title="编辑">
          <Button type="link" icon={<EditOutlined />} onClick={() => setEditPrompt(record)} />
        </Tooltip>
      ),
    },
  ];

  const tabItems = [
    { key: 'llm', label: 'LLM 模型' },
    { key: 'embedding', label: 'Embedding 模型' },
    { key: 'rerank', label: 'Rerank 模型' },
    { key: 'prompts', label: '提示词管理' },
  ];

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">AI 设置</h2>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      {activeTab === 'prompts' ? (
        <Table
          rowKey="id"
          dataSource={prompts}
          columns={promptColumns}
          loading={loadingPrompts}
          pagination={false}
        />
      ) : (
        <Table
          rowKey="id"
          dataSource={filteredProviders}
          columns={providerColumns}
          loading={loadingProviders}
          pagination={false}
        />
      )}

      <ProviderEditModal open={!!editProvider} record={editProvider} onClose={() => setEditProvider(null)} />
      <PromptEditModal open={!!editPrompt} record={editPrompt} onClose={() => setEditPrompt(null)} />
    </div>
  );
}