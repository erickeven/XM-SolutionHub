import { useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Radio,
  message,
  Spin,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProduct,
  updateProduct,
  getProduct,
} from '../../../api/admin-products';
import type { ProductStatus } from '../../../api/admin-products';
import { listMaterials } from '../../../api/admin-materials';
import { useFieldConfigs } from '../../../api/admin-product-fields';
import type { FieldConfigItem } from '../../../api/admin-product-fields';

interface ProductFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  productId: string | null;
  onClose: () => void;
}

const { TextArea } = Input;

function buildRules(field: FieldConfigItem) {
  const rules: Array<{ required?: boolean; message?: string }> = [];
  if (field.required) {
    rules.push({ required: true, message: `请输入${field.label}` });
  }
  return rules;
}

function renderFieldControl(field: FieldConfigItem) {
  const options = field.optionsJson ?? [];
  switch (field.fieldType) {
    case 'text':
      return <Input placeholder={`请输入${field.label}`} />;
    case 'number': {
      const validation = field.validationJson ?? {};
      return (
        <InputNumber
          className="!w-full"
          min={typeof validation.min === 'number' ? validation.min : undefined}
          max={typeof validation.max === 'number' ? validation.max : undefined}
          placeholder={`请输入${field.label}`}
        />
      );
    }
    case 'single_select':
      return (
        <Select
          options={options.map((o) => ({ label: o.label, value: o.value }))}
          placeholder={`请选择${field.label}`}
          allowClear
        />
      );
    case 'multi_select':
      return (
        <Select
          mode="multiple"
          options={options.map((o) => ({ label: o.label, value: o.value }))}
          placeholder={`请选择${field.label}`}
          allowClear
        />
      );
    case 'boolean':
      return <Switch checkedChildren="是" unCheckedChildren="否" />;
    default:
      return <Input placeholder={`请输入${field.label}`} />;
  }
}

function getValuePropName(field: FieldConfigItem): string {
  return field.fieldType === 'boolean' ? 'checked' : 'value';
}

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

  const { data: fieldConfigsRaw, isLoading: fieldsLoading } = useFieldConfigs(true);
  const { data: datasheetData, isLoading: datasheetsLoading } = useQuery({
    queryKey: ['admin-product-datasheets'],
    queryFn: () =>
      listMaterials({
        page: 1,
        pageSize: 100,
        type: 'datasheet',
      }),
    enabled: open,
    staleTime: 60 * 1000,
  });

  const datasheetOptions = useMemo(
    () =>
      (datasheetData?.items ?? [])
        .filter((item) => item.mimeType === 'application/pdf')
        .filter((item) => item.status !== 'INACTIVE')
        .filter((item) => !item.productId || item.productId === productId)
        .map((item) => ({
          label: `${item.title}${item.productModel ? ` · ${item.productModel}` : ''}${item.status === 'ACTIVE' ? '' : ' · 未上架'}`,
          value: item.id,
        })),
    [datasheetData, productId],
  );
  // Sort by sortOrder; exclude fixed fields (model/series/status/advantages) rendered as dedicated form items
  const FIXED_FIELD_KEYS = new Set(['model', 'series', 'status', 'advantages']);
  const fieldConfigs = useMemo(
    () =>
      [...(fieldConfigsRaw ?? [])]
        .filter((f) => !FIXED_FIELD_KEYS.has(f.fieldKey))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [fieldConfigsRaw],
  );

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && existing && fieldConfigs) {
      const paramValues: Record<string, unknown> = {};
      const params = existing.params ?? {};
      fieldConfigs.forEach((f) => {
        if (Object.prototype.hasOwnProperty.call(params, f.fieldKey)) {
          paramValues[f.fieldKey] = (params as Record<string, unknown>)[f.fieldKey];
        } else if (f.fieldType === 'boolean') {
          paramValues[f.fieldKey] = false;
        } else if (f.fieldType === 'multi_select') {
          paramValues[f.fieldKey] = [];
        }
      });
      form.setFieldsValue({
        model: existing.model,
        series: existing.series,
        status: existing.status,
        datasheetMaterialId: existing.datasheetMaterialId ?? undefined,
        advantages: (existing.advantages ?? []).join(', '),
        ...paramValues,
      });
    } else if (mode === 'create') {
      form.resetFields();
      const defaults: Record<string, unknown> = { status: 'DRAFT' as ProductStatus };
      (fieldConfigs ?? []).forEach((f) => {
        if (f.fieldType === 'boolean') defaults[f.fieldKey] = false;
        else if (f.fieldType === 'multi_select') defaults[f.fieldKey] = [];
      });
      form.setFieldsValue(defaults);
    }
  }, [open, mode, existing, fieldConfigs, form]);

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      message.success('产品创建成功');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product-datasheets'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product-datasheets'] });
      onClose();
    },
    onError: (err: unknown) => {
      message.error(err instanceof Error ? err.message : '更新失败');
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const advantages = (values.advantages ?? '')
        .split(/[,，\n]/)
        .map((s: string) => s.trim())
        .filter(Boolean);

      const params: Record<string, unknown> = {};
      (fieldConfigs ?? []).forEach((f) => {
        const v = values[f.fieldKey];
        if (v !== undefined && v !== null && v !== '') {
          params[f.fieldKey] = v;
        }
      });

      const input = {
        model: values.model,
        series: values.series,
        status: values.status,
        datasheetMaterialId: values.datasheetMaterialId ?? null,
        params,
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
  const contentLoading = (mode === 'edit' && detailLoading) || fieldsLoading || datasheetsLoading;

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
      {contentLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Spin />
        </div>
      ) : (
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

          <Form.Item label="产品规格书（PDF）" name="datasheetMaterialId">
            <Select
              options={datasheetOptions}
              placeholder="选择产品规格书 PDF"
              allowClear
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          {fieldConfigs && fieldConfigs.length > 0 && (
            <div className="mb-2 text-sm font-medium text-slate-700">产品参数</div>
          )}
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            {fieldConfigs?.map((field) => {
              const isWide =
                field.fieldType === 'multi_select' ||
                field.fieldType === 'boolean' ||
                field.fieldType === 'single_select';
              const colSpan = isWide ? 'md:col-span-2' : '';
              return (
                <Form.Item
                  key={field.id}
                  label={field.label}
                  name={field.fieldKey}
                  valuePropName={getValuePropName(field)}
                  rules={buildRules(field)}
                  className={colSpan}
                >
                  {renderFieldControl(field)}
                </Form.Item>
              );
            })}
          </div>

          <Form.Item label="产品优势" name="advantages">
            <TextArea
              rows={3}
              placeholder="多个优势使用逗号或换行分隔，例如：高效率, 低待机功耗, 内置MOS"
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
