import { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Radio,
  message,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProduct,
  updateProduct,
  getProduct,
} from '../../../api/admin-products';
import type { ProductStatus } from '../../../api/admin-products';

interface ProductFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  productId: string | null;
  onClose: () => void;
}

const { TextArea } = Input;

const APPLICATION_OPTIONS = [
  { label: '电源适配器', value: 'ADAPTER' },
  { label: 'LED 照明', value: 'LED' },
  { label: '充电器', value: 'CHARGER' },
  { label: '工业控制', value: 'INDUSTRIAL' },
  { label: '服务器/数据中心', value: 'SERVER' },
  { label: '家电', value: 'HOME_APPLIANCE' },
  { label: '电机驱动', value: 'MOTOR' },
  { label: '其他', value: 'OTHER' },
];

const EFFICIENCY_OPTIONS = [
  { label: 'Level VI', value: 'VI' },
  { label: 'CoC Tier 2', value: 'COC_TIER2' },
  { label: '80+ 金牌', value: '80PLUS_GOLD' },
  { label: '80+ 白金', value: '80PLUS_PLATINUM' },
];

const CERT_OPTIONS = [
  { label: 'CCC', value: 'CCC' },
  { label: 'UL', value: 'UL' },
  { label: 'CE', value: 'CE' },
  { label: 'FCC', value: 'FCC' },
  { label: 'PSE', value: 'PSE' },
  { label: 'KC', value: 'KC' },
  { label: 'RoHS', value: 'RoHS' },
];

export function ProductFormModal({
  open,
  mode,
  productId,
  onClose,
}: ProductFormModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: existing, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: () => getProduct(productId!),
    enabled: open && mode === 'edit' && !!productId,
  });

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && existing) {
        form.setFieldsValue({
          model: existing.model,
          series: existing.series,
          status: existing.status,
          inputVoltageMin: existing.params?.inputVoltageMin,
          inputVoltageMax: existing.params?.inputVoltageMax,
          outputVoltage: existing.params?.outputVoltage,
          outputCurrent: existing.params?.outputCurrent,
          applicationType: existing.params?.applicationType,
          efficiencyLevel: existing.params?.efficiencyLevel,
          standbyPowerMax: existing.params?.standbyPowerMax,
          maxAmbientTemp: existing.params?.maxAmbientTemp,
          certifications: existing.params?.certifications ?? [],
          requiresPfc: existing.params?.requiresPfc ?? false,
          advantages: (existing.advantages ?? []).join(', '),
        });
      } else if (mode === 'create') {
        form.resetFields();
        form.setFieldsValue({
          status: 'DRAFT' as ProductStatus,
          certifications: [],
          requiresPfc: false,
        });
      }
    }
  }, [open, mode, existing, form]);

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      message.success('产品创建成功');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      onClose();
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateProduct>[1] }) =>
      updateProduct(id, input),
    onSuccess: () => {
      message.success('产品更新成功');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product'] });
      onClose();
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '更新失败');
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const certifications = values.certifications ?? [];
      const advantages = (values.advantages ?? '')
        .split(/[,，\n]/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      const input = {
        model: values.model,
        series: values.series,
        status: values.status,
        params: {
          inputVoltageMin: values.inputVoltageMin,
          inputVoltageMax: values.inputVoltageMax,
          outputVoltage: values.outputVoltage,
          outputCurrent: values.outputCurrent,
          applicationType: values.applicationType,
          efficiencyLevel: values.efficiencyLevel,
          standbyPowerMax: values.standbyPowerMax,
          maxAmbientTemp: values.maxAmbientTemp,
          certifications,
          requiresPfc: values.requiresPfc ?? false,
        },
        advantages,
      };
      if (mode === 'create') {
        createMutation.mutate(input);
      } else if (productId) {
        updateMutation.mutate({ id: productId, input });
      }
    } catch {
      // validation errors shown in form
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={mode === 'create' ? '新建产品' : '编辑产品'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={isLoading}
      okText={mode === 'create' ? '创建' : '保存'}
      cancelText="取消"
      width={640}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        className="mt-4"
        initialValues={{ status: 'DRAFT' }}
      >
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item
            label="型号"
            name="model"
            rules={[{ required: true, message: '请输入型号' }]}
          >
            <Input placeholder="例如 LP9961" />
          </Form.Item>
          <Form.Item
            label="系列"
            name="series"
            rules={[{ required: true, message: '请输入系列' }]}
          >
            <Input placeholder="例如 LLC 控制器" />
          </Form.Item>
        </div>

        <Form.Item label="状态" name="status" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="DRAFT">草稿</Radio>
            <Radio value="ACTIVE">上架</Radio>
            <Radio value="INACTIVE">下架</Radio>
          </Radio.Group>
        </Form.Item>

        <div className="mb-2 text-sm font-medium text-slate-700">关键参数</div>
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item
            label="最小输入电压 (V)"
            name="inputVoltageMin"
            rules={[{ required: true, message: '必填' }]}
          >
            <InputNumber className="!w-full" min={0} placeholder="例如 90" />
          </Form.Item>
          <Form.Item
            label="最大输入电压 (V)"
            name="inputVoltageMax"
            rules={[{ required: true, message: '必填' }]}
          >
            <InputNumber className="!w-full" min={0} placeholder="例如 264" />
          </Form.Item>
          <Form.Item
            label="输出电压 (V)"
            name="outputVoltage"
            rules={[{ required: true, message: '必填' }]}
          >
            <InputNumber className="!w-full" min={0} placeholder="例如 12" />
          </Form.Item>
          <Form.Item
            label="输出电流 (A)"
            name="outputCurrent"
            rules={[{ required: true, message: '必填' }]}
          >
            <InputNumber className="!w-full" min={0} placeholder="例如 3" />
          </Form.Item>
          <Form.Item
            label="应用类型"
            name="applicationType"
            rules={[{ required: true, message: '请选择应用类型' }]}
          >
            <Select options={APPLICATION_OPTIONS} placeholder="请选择" />
          </Form.Item>
          <Form.Item label="能效等级" name="efficiencyLevel">
            <Select options={EFFICIENCY_OPTIONS} placeholder="请选择" allowClear />
          </Form.Item>
          <Form.Item label="最大待机功耗 (mW)" name="standbyPowerMax">
            <InputNumber className="!w-full" min={0} placeholder="例如 75" />
          </Form.Item>
          <Form.Item label="最高工作温度 (°C)" name="maxAmbientTemp">
            <InputNumber className="!w-full" placeholder="例如 105" />
          </Form.Item>
        </div>

        <Form.Item label="安规认证" name="certifications">
          <Select mode="tags" options={CERT_OPTIONS} placeholder="输入或选择" />
        </Form.Item>

        <Form.Item label="是否需要 PFC" name="requiresPfc" valuePropName="checked">
          <Switch checkedChildren="需要" unCheckedChildren="不需要" />
        </Form.Item>

        <Form.Item label="产品优势" name="advantages">
          <TextArea
            rows={3}
            placeholder="多个优势使用逗号或换行分隔，例如：高效率, 低待机功耗, 内置MOS"
          />
        </Form.Item>

        {detailLoading && (
          <div className="text-xs text-slate-400">正在加载产品数据…</div>
        )}
      </Form>
    </Modal>
  );
}
