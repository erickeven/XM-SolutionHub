import { useEffect, useState } from 'react';
import { Form, Input, Select, Modal, Tabs, Upload, message } from 'antd';
import type { UploadProps, UploadFile } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createKnowledge, createKnowledgeFormData } from '../../../api/knowledge';
import { listMaterials } from '../../../api/admin-materials';

interface CreateKnowledgeModalProps {
  open: boolean;
  onClose: () => void;
}

interface CreateFormValues {
  selectedMaterialId?: string;
  title?: string;
  sourceType: string;
  file?: UploadFile[];
}

const { Dragger } = Upload;

const SOURCE_TYPE_OPTIONS = [
  { label: 'PDF', value: 'PDF' },
  { label: 'HTML', value: 'HTML' },
  { label: 'Markdown', value: 'MARKDOWN' },
  { label: 'Word', value: 'WORD' },
];

export function CreateKnowledgeModal({ open, onClose }: CreateKnowledgeModalProps) {
  const [form] = Form.useForm<CreateFormValues>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'select' | 'upload'>('select');

  const { data: materialsData, isLoading: materialsLoading } = useQuery({
    queryKey: ['materialsList', 'all'],
    queryFn: () => listMaterials({ page: 1, pageSize: 200 }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (values: CreateFormValues) => {
      if (activeTab === 'select') {
        if (!values.selectedMaterialId) {
          throw new Error('请选择资料');
        }
        return createKnowledge({
          materialId: values.selectedMaterialId,
          title: values.title,
          sourceType: values.sourceType,
        });
      } else {
        const files = form.getFieldValue('file') as UploadFile[];
        const originFile = files?.[0]?.originFileObj;
        if (!originFile) {
          throw new Error('请上传文件');
        }
        const formData = createKnowledgeFormData({
          file: originFile,
          title: values.title!,
          sourceType: values.sourceType,
        });
        return createKnowledge(formData);
      }
    },
    onSuccess: () => {
      message.success('索引任务已创建');
      queryClient.invalidateQueries({ queryKey: ['knowledgeList'] });
      form.resetFields();
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : '创建失败，请重试';
      message.error(msg);
    },
  });

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setActiveTab('select');
    }
  }, [open, form]);

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        mutation.mutate(values);
      })
      .catch(() => {
        // validation errors are shown inline
      });
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.pdf,.doc,.docx,.xls,.xlsx',
    beforeUpload: () => false,
  };

  const materialOptions = (materialsData?.items ?? []).map((m) => ({
    label: `${m.id.slice(0, 8)}... - ${m.title}`,
    value: m.id,
  }));

  const tabItems = [
    {
      key: 'select',
      label: '选择已有资料',
      children: (
        <Form.Item
          name="selectedMaterialId"
          label="选择资料"
          rules={[{ required: activeTab === 'select', message: '请选择资料' }]}
        >
          <Select
            placeholder="搜索并选择已有资料"
            showSearch
            loading={materialsLoading}
            options={materialOptions}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            optionFilterProp="label"
          />
        </Form.Item>
      ),
    },
    {
      key: 'upload',
      label: '上传新文件',
      children: (
        <Form.Item
          name="file"
          label="文件上传"
          valuePropName="fileList"
          getValueFromEvent={(e) => e?.fileList ?? []}
          rules={[{ required: activeTab === 'upload', message: '请上传文件' }]}
        >
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 PDF、Word 格式，单文件不超过 50MB
            </p>
          </Dragger>
        </Form.Item>
      ),
    },
  ];

  return (
    <Modal
      title="新建知识库文档"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={mutation.isPending}
      okText="创建"
      cancelText="取消"
      destroyOnClose
      width={600}
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'select' | 'upload')}
          items={tabItems}
        />

        <Form.Item
          name="title"
          label="文档标题"
          rules={[
            {
              required: activeTab === 'upload',
              message: '请输入文档标题',
            },
          ]}
          extra={activeTab === 'select' ? '留空则使用资料原标题' : undefined}
        >
          <Input placeholder="输入文档标题" />
        </Form.Item>

        <Form.Item
          name="sourceType"
          label="来源类型"
          rules={[{ required: true, message: '请选择来源类型' }]}
        >
          <Select
            placeholder="选择来源类型"
            options={SOURCE_TYPE_OPTIONS}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
