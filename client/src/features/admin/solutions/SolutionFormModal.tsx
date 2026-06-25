import { useEffect } from 'react';
import { Modal, Form, Input, Radio, Select, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSolution,
  updateSolution,
  getSolution,
} from '../../../api/admin-solutions';
import { listProducts } from '../../../api/admin-products';
import type { SolutionStatus } from '../../../api/admin-solutions';

interface SolutionFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  solutionId: string | null;
  onClose: () => void;
}

const { TextArea } = Input;

export function SolutionFormModal({
  open,
  mode,
  solutionId,
  onClose,
}: SolutionFormModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: existing, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-solution', solutionId],
    queryFn: () => getSolution(solutionId!),
    enabled: open && mode === 'edit' && !!solutionId,
  });

  const { data: productData, isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products', 'options'],
    queryFn: () => listProducts({ page: 1, pageSize: 500, status: 'ACTIVE' }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const productOptions = (productData?.items ?? []).map((p) => ({
    label: `${p.model} — ${p.series}`,
    value: p.id,
  }));

  const filterOption = (input: string, option?: { label?: unknown; value?: unknown }) => {
    if (!option || option.label === undefined || option.label === null) return false;
    const text = String(option.label).toLowerCase();
    return text.includes(input.toLowerCase());
  };

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && existing) {
        form.setFieldsValue({
          name: existing.name,
          description: existing.description,
          status: existing.status,
          productIds: existing.productIds ?? [],
        });
      } else if (mode === 'create') {
        form.resetFields();
        form.setFieldsValue({ status: 'DRAFT' as SolutionStatus, productIds: [] });
      }
    }
  }, [open, mode, existing, form]);

  const createMutation = useMutation({
    mutationFn: createSolution,
    onSuccess: () => {
      message.success('方案创建成功');
      queryClient.invalidateQueries({ queryKey: ['admin-solutions'] });
      onClose();
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateSolution>[1] }) =>
      updateSolution(id, input),
    onSuccess: () => {
      message.success('方案更新成功');
      queryClient.invalidateQueries({ queryKey: ['admin-solutions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-solution'] });
      onClose();
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '更新失败');
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const input = {
        name: values.name,
        description: values.description,
        status: values.status,
        productIds: values.productIds ?? [],
      };
      if (mode === 'create') {
        createMutation.mutate(input);
      } else if (solutionId) {
        updateMutation.mutate({ id: solutionId, input });
      }
    } catch {
      // validation errors shown in form
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={mode === 'create' ? '新建方案' : '编辑方案'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={isLoading}
      okText={mode === 'create' ? '创建' : '保存'}
      cancelText="取消"
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          label="方案名称"
          name="name"
          rules={[{ required: true, message: '请输入方案名称' }]}
        >
          <Input placeholder="例如 24V/3A 适配器方案" />
        </Form.Item>
        <Form.Item
          label="方案描述"
          name="description"
          rules={[{ required: true, message: '请输入方案描述' }]}
        >
          <TextArea rows={4} placeholder="简要描述方案特点、适用场景与关键性能指标" />
        </Form.Item>
        <Form.Item label="状态" name="status" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="DRAFT">草稿</Radio>
            <Radio value="ACTIVE">上架</Radio>
            <Radio value="INACTIVE">下架</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="关联产品" name="productIds">
          <Select
            mode="multiple"
            options={productOptions}
            loading={productsLoading}
            placeholder="选择本方案关联的芯片型号（可搜索型号或系列）"
            showSearch
            filterOption={filterOption}
            optionFilterProp="label"
          />
        </Form.Item>
        {detailLoading && (
          <div className="text-xs text-slate-400">正在加载方案数据…</div>
        )}
      </Form>
    </Modal>
  );
}
