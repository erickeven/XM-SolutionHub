import { useEffect } from 'react';
import { Form, Input, Select, Modal, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createKnowledge } from '../../../api/knowledge';

interface CreateKnowledgeModalProps {
  open: boolean;
  onClose: () => void;
}

interface CreateFormValues {
  materialId: string;
  title: string;
  sourceType: string;
}

const SOURCE_TYPE_OPTIONS = [
  { label: 'PDF', value: 'PDF' },
  { label: 'HTML', value: 'HTML' },
  { label: 'Markdown', value: 'MARKDOWN' },
  { label: 'Word', value: 'WORD' },
  { label: 'Excel', value: 'EXCEL' },
];

export function CreateKnowledgeModal({ open, onClose }: CreateKnowledgeModalProps) {
  const [form] = Form.useForm<CreateFormValues>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateFormValues) => createKnowledge(values),
    onSuccess: () => {
      message.success('知识库文档已创建');
      queryClient.invalidateQueries({ queryKey: ['knowledgeList'] });
      form.resetFields();
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : '创建失败，请重试';
      message.error(msg);
    },
  });

  useEffect(() => {
    if (!open) {
      form.resetFields();
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
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="materialId"
          label="素材 ID"
          rules={[{ required: true, message: '请输入素材 ID' }]}
        >
          <Input placeholder="输入关联素材的 ID" />
        </Form.Item>

        <Form.Item
          name="title"
          label="文档标题"
          rules={[{ required: true, message: '请输入文档标题' }]}
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