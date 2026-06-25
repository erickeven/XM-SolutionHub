import { useEffect, useMemo } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updateMaterial, getMaterial } from '../../../api/admin-materials';
import { listSolutions } from '../../../api/admin-solutions';
import { listProducts } from '../../../api/admin-products';
import type { MaterialType, MaterialStatus } from '../../../api/admin-materials';

interface MaterialEditModalProps {
  open: boolean;
  materialId: string | null;
  onClose: () => void;
}

const TYPE_OPTIONS: { label: string; value: MaterialType }[] = [
  { label: '数据手册 (Datasheet)', value: 'datasheet' },
  { label: 'Demo 报告', value: 'demo_report' },
  { label: '应用笔记', value: 'application_note' },
  { label: '其他', value: 'other' },
];

const STATUS_OPTIONS: { label: string; value: MaterialStatus }[] = [
  { label: '草稿', value: 'DRAFT' },
  { label: '上架', value: 'ACTIVE' },
  { label: '下架', value: 'INACTIVE' },
];

export function MaterialEditModal({
  open,
  materialId,
  onClose,
}: MaterialEditModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin-material', materialId],
    queryFn: () => getMaterial(materialId!),
    enabled: open && !!materialId,
  });

  const { data: solutionData } = useQuery({
    queryKey: ['admin-solutions-options-edit'],
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
    queryKey: ['admin-products-options-edit'],
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
    if (open && existing) {
      form.setFieldsValue({
        title: existing.title,
        type: existing.type,
        status: existing.status,
        solutionId: existing.solutionId ?? '',
        productId: existing.productId ?? '',
      });
    } else if (open) {
      form.resetFields();
    }
  }, [open, existing, form]);

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateMaterial>[1] }) =>
      updateMaterial(id, {
        ...input,
        solutionId: input.solutionId === '' ? null : input.solutionId,
        productId: input.productId === '' ? null : input.productId,
      }),
    onSuccess: () => {
      message.success('已保存');
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
      queryClient.invalidateQueries({ queryKey: ['admin-material'] });
      onClose();
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '保存失败');
    },
  });

  const handleSubmit = async () => {
    if (!materialId) return;
    try {
      const values = await form.validateFields();
      updateMutation.mutate({
        id: materialId,
        input: {
          title: values.title,
          type: values.type,
          status: values.status,
          solutionId: values.solutionId,
          productId: values.productId,
        },
      });
    } catch {
      // validation errors
    }
  };

  return (
    <Modal
      title="编辑资料"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={updateMutation.isPending || isLoading}
      okText="保存"
      cancelText="取消"
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item label="标题" name="title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="类型" name="type" rules={[{ required: true }]}>
          <Select options={TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item label="状态" name="status" rules={[{ required: true }]}>
          <Select options={STATUS_OPTIONS} />
        </Form.Item>
        <Form.Item label="所属方案" name="solutionId">
          <Select options={solutionOptions} allowClear showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item label="关联产品" name="productId">
          <Select
            options={productOptions}
            allowClear
            showSearch
            optionFilterProp="label"
            loading={!productData}
            placeholder="选择产品（可选）"
          />
        </Form.Item>
        <div className="text-xs text-slate-400">
          提示：文件本身不可替换，如需更换请删除后重新上传。
        </div>
      </Form>
    </Modal>
  );
}
