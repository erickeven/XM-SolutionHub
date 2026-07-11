import { useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMaterial,
  listMaterialProductOptions,
  listMaterialSolutionOptions,
} from '../../../api/admin-materials';
import type { MaterialType } from '../../../api/admin-materials';
import { useFieldConfigs } from '../../../api/admin-material-fields';
import type { FieldConfigItem } from '../../../api/admin-material-fields';

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

export function MaterialUploadModal({ open, onClose }: MaterialUploadModalProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: solutionData } = useQuery({
    queryKey: ['admin-solutions-options'],
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
    queryKey: ['admin-products-options'],
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
  const fileLabel = getCoreFieldLabel(fieldConfigsRaw, 'file', '文件');
  const titleLabel = getCoreFieldLabel(fieldConfigsRaw, 'title', '标题');
  const typeLabel = getCoreFieldLabel(fieldConfigsRaw, 'type', '资料类型');
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
    if (open) {
      form.resetFields();
      const defaults: Record<string, unknown> = { type: 'datasheet', status: 'DRAFT' };
      (fieldConfigs ?? []).forEach((f) => {
        if (f.fieldType === 'boolean') defaults[f.fieldKey] = false;
        else if (f.fieldType === 'multi_select') defaults[f.fieldKey] = [];
      });
      form.setFieldsValue(defaults);
    }
  }, [open, form, fieldConfigs]);

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
    accept: '.pdf,.doc,.docx,.xls,.xlsx',
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

      // Collect dynamic field values into metadata
      const metadata: Record<string, unknown> = {};
      (fieldConfigs ?? []).forEach((f) => {
        const v = values[f.fieldKey];
        if (v !== undefined && v !== null && v !== '') {
          metadata[f.fieldKey] = v;
        }
      });

      createMutation.mutate({
        type: values.type as MaterialType,
        title: values.title,
        solutionId: values.solutionId || undefined,
        productId: values.productId || undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
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
      confirmLoading={createMutation.isPending || fieldsLoading}
      okText="上传"
      cancelText="取消"
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          label={fileLabel}
          name="file"
          rules={[{ required: true, message: `请选择${fileLabel}` }]}
          valuePropName="file"
          getValueFromEvent={(e) => (Array.isArray(e) ? { fileList: e } : e && { fileList: e.fileList })}
        >
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 PDF / Word / Excel 格式，单个文件不超过 50MB
            </p>
          </Dragger>
        </Form.Item>

        <Form.Item
          label={typeLabel}
          name="type"
          rules={[{ required: true, message: '请选择类型' }]}
        >
          <Select options={TYPE_OPTIONS} />
        </Form.Item>

        <Form.Item
          label={titleLabel}
          name="title"
          rules={[{ required: true, message: `请输入${titleLabel}` }]}
        >
          <Input placeholder="例如 LP9961 数据手册 Rev.1.2" />
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
          <Select
            options={solutionOptions}
            placeholder="选择方案（可选）"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={!solutionData}
          />
        </Form.Item>

        <Form.Item label={productLabel} name="productId">
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
