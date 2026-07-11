import { useEffect, useMemo } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  updateMaterial,
  getMaterial,
  listMaterialProductOptions,
  listMaterialSolutionOptions,
} from '../../../api/admin-materials';
import type { MaterialType, MaterialStatus } from '../../../api/admin-materials';
import { useFieldConfigs } from '../../../api/admin-material-fields';
import type { FieldConfigItem } from '../../../api/admin-material-fields';

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

const FIXED_FIELD_KEYS = new Set(['file', 'title', 'type', 'status', 'solutionId', 'productId']);

function getCoreFieldLabel(fields: FieldConfigItem[] | undefined, fieldKey: string, fallback: string) {
  return fields?.find((field) => field.fieldKey === fieldKey)?.label ?? fallback;
}

function buildRules(field: FieldConfigItem) {
  const rules: Array<{ required?: boolean; message?: string }> = [];
  if (field.required) {
    rules.push({ required: true, message: `请输入${field.label}` });
  }
  return rules;
}

function renderFieldControl(field: FieldConfigItem) {
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
    case 'single_select': {
      const options = field.optionsJson ?? [];
      return (
        <Select
          options={options.map((o) => ({ label: o.label, value: o.value }))}
          placeholder={`请选择${field.label}`}
          allowClear
        />
      );
    }
    case 'multi_select': {
      const options = field.optionsJson ?? [];
      return (
        <Select
          mode="multiple"
          options={options.map((o) => ({ label: o.label, value: o.value }))}
          placeholder={`请选择${field.label}`}
          allowClear
        />
      );
    }
    case 'boolean':
      return <Switch checkedChildren="是" unCheckedChildren="否" />;
    default:
      return <Input placeholder={`请输入${field.label}`} />;
  }
}

function getValuePropName(field: FieldConfigItem): string {
  return field.fieldType === 'boolean' ? 'checked' : 'value';
}

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
    queryFn: listMaterialSolutionOptions,
    enabled: open,
  });

  const solutionOptions = useMemo(
    () => [
      { label: '（无）', value: '' },
      ...(solutionData ?? []).map((s) => ({
        label: s.name,
        value: s.id,
      })),
    ],
    [solutionData],
  );

  const { data: productData } = useQuery({
    queryKey: ['admin-products-options-edit'],
    queryFn: listMaterialProductOptions,
    enabled: open,
  });

  const productOptions = useMemo(
    () => [
      { label: '（无）', value: '' },
      ...(productData ?? []).map((p) => ({
        label: `${p.model} — ${p.series}`,
        value: p.id,
      })),
    ],
    [productData],
  );

  const { data: fieldConfigsRaw, isLoading: fieldsLoading } = useFieldConfigs(true);
  const titleLabel = getCoreFieldLabel(fieldConfigsRaw, 'title', '标题');
  const typeLabel = getCoreFieldLabel(fieldConfigsRaw, 'type', '类型');
  const statusLabel = getCoreFieldLabel(fieldConfigsRaw, 'status', '状态');
  const solutionLabel = getCoreFieldLabel(fieldConfigsRaw, 'solutionId', '所属方案');
  const productLabel = getCoreFieldLabel(fieldConfigsRaw, 'productId', '关联产品');
  const fieldConfigs = useMemo(
    () =>
      [...(fieldConfigsRaw ?? [])]
        .filter((f) => !FIXED_FIELD_KEYS.has(f.fieldKey))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [fieldConfigsRaw],
  );

  useEffect(() => {
    if (!open) return;
    if (existing && fieldConfigs) {
      const metadata = (existing as { metadata?: Record<string, unknown> }).metadata ?? {};
      const paramValues: Record<string, unknown> = {};
      fieldConfigs.forEach((f) => {
        if (Object.prototype.hasOwnProperty.call(metadata, f.fieldKey)) {
          paramValues[f.fieldKey] = metadata[f.fieldKey];
        } else if (f.fieldType === 'boolean') {
          paramValues[f.fieldKey] = false;
        } else if (f.fieldType === 'multi_select') {
          paramValues[f.fieldKey] = [];
        }
      });
      form.setFieldsValue({
        title: existing.title,
        type: existing.type,
        status: existing.status,
        solutionId: existing.solutionId ?? '',
        productId: existing.productId ?? '',
        ...paramValues,
      });
    } else if (open) {
      form.resetFields();
    }
  }, [open, existing, fieldConfigs, form]);

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
      const metadata: Record<string, unknown> = {};
      (fieldConfigs ?? []).forEach((f) => {
        const v = values[f.fieldKey as string];
        if (v !== undefined && v !== null && v !== '') {
          metadata[f.fieldKey] = v;
        }
      });
      updateMutation.mutate({
        id: materialId,
        input: {
          title: values.title,
          type: values.type,
          status: values.status,
          solutionId: values.solutionId,
          productId: values.productId,
          metadata,
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
      confirmLoading={updateMutation.isPending || isLoading || fieldsLoading}
      okText="保存"
      cancelText="取消"
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item label={titleLabel} name="title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label={typeLabel} name="type" rules={[{ required: true }]}>
          <Select options={TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item label={statusLabel} name="status" rules={[{ required: true }]}>
          <Select options={STATUS_OPTIONS} />
        </Form.Item>

        {fieldConfigs.length > 0 && (
          <div className="mb-2 text-sm font-medium text-slate-700">扩展属性</div>
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

        <Form.Item label={solutionLabel} name="solutionId">
          <Select options={solutionOptions} allowClear showSearch optionFilterProp="label" />
        </Form.Item>
        <Form.Item label={productLabel} name="productId">
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
