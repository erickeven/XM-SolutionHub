import { useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMaterial } from '../../../api/admin-materials';
import type { MaterialType } from '../../../api/admin-materials';
import { listSolutions } from '../../../api/admin-solutions';
import { listProducts } from '../../../api/admin-products';

interface MaterialUploadModalProps {
  open: boolean;
  onClose: () => void;
}

const { Dragger } = Upload;

const TYPE_OPTIONS: { label: string; value: MaterialType }[] = [
  { label: '数据手册 (Datasheet)', value: 'datasheet' },
  { label: 'Demo 报告', value: 'demo_report' },
  { label: '应用笔记', value: 'application_note' },
  { label: '其他', value: 'other' },
];

export function MaterialUploadModal({ open, onClose }: MaterialUploadModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: solutionData } = useQuery({
    queryKey: ['admin-solutions-options'],
    queryFn: () => listSolutions({ page: 1, pageSize: 200, status: 'ACTIVE' }),
    enabled: open,
  });

  const solutionOptions = useMemo(
    () => [
      { label: '（无）', value: '' },
      ...(solutionData?.items ?? []).map((s) => ({
        label: s.name,
        value: s.id,
      })),
    ],
    [solutionData],
  );

  const { data: productData } = useQuery({
    queryKey: ['admin-products-options'],
    queryFn: () => listProducts({ page: 1, pageSize: 500, status: 'ACTIVE' }),
    enabled: open,
  });

  const productOptions = useMemo(
    () => [
      { label: '（无）', value: '' },
      ...(productData?.items ?? []).map((p) => ({
        label: `${p.model} — ${p.series}`,
        value: p.id,
      })),
    ],
    [productData],
  );

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ type: 'datasheet', status: 'DRAFT' });
    }
  }, [open, form]);

  const createMutation = useMutation({
    mutationFn: createMaterial,
    onSuccess: () => {
      message.success('资料上传成功');
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
      onClose();
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '上传失败');
    },
  });

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    beforeUpload: () => false, // manual upload via form submit
    accept: '.pdf,.docx',
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const uploadFileList: UploadFile[] = values.file?.fileList ?? [];
      if (!uploadFileList || uploadFileList.length === 0) {
        message.error('请选择要上传的文件');
        return;
      }
      const first = uploadFileList[0] as UploadFile;
      const file = (first.originFileObj ?? first) as File;
      createMutation.mutate({
        type: values.type as MaterialType,
        title: values.title,
        solutionId: values.solutionId || undefined,
        productId: values.productId || undefined,
        file,
      });
    } catch {
      // validation errors shown in form
    }
  };

  return (
    <Modal
      title="上传资料"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending}
      okText="上传"
      cancelText="取消"
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          label="文件"
          name="file"
          rules={[{ required: true, message: '请选择文件' }]}
          valuePropName="file"
          getValueFromEvent={(e) => (Array.isArray(e) ? { fileList: e } : e && { fileList: e.fileList })}
        >
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 PDF / DOCX 格式，单个文件不超过 50MB
            </p>
          </Dragger>
        </Form.Item>

        <Form.Item
          label="资料类型"
          name="type"
          rules={[{ required: true, message: '请选择类型' }]}
        >
          <Select options={TYPE_OPTIONS} />
        </Form.Item>

        <Form.Item
          label="标题"
          name="title"
          rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input placeholder="例如 LP9961 数据手册 Rev.1.2" />
        </Form.Item>

        <Form.Item label="所属方案" name="solutionId">
          <Select
            options={solutionOptions}
            placeholder="选择方案（可选）"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={!solutionData}
          />
        </Form.Item>

        <Form.Item label="关联产品" name="productId">
          <Select
            options={productOptions}
            placeholder="选择产品（可选）"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={!productData}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
